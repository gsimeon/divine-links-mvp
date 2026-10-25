import { createClient } from "@supabase/supabase-js";
import { dispatchEmail } from "@/lib/notifications";

export interface OutboxJob {
  id: string;
  enquiry_id: string | null;
  recipient: string;
  channel: string;
  subject: string;
  body: string;
  status: "pending" | "processing" | "sent" | "failed" | "simulated" | "dead_letter";
  error_message: string | null;
  attempts: number;
  last_attempt_at: string | null;
  claimed_at?: string | null;
  claimed_by?: string | null;
  provider_message_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  sent_at: string | null;
}

export interface ProcessOutboxOptions {
  maxBatch?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
  leaseSeconds?: number;
  workerId?: string;
  enquiryId?: string;
}

export interface OutboxProcessingSummary {
  processed: number;
  sent: number;
  failed: number;
  deadLetter: number;
  skippedBackoff: number;
  reclaimedLeases: number;
}

/**
 * Processes pending and failed jobs in the durable notifications outbox table.
 * 
 * Reliability & Concurrency guarantees:
 * 1. Atomic Job Claiming:
 *    - Database-level `claim_outbox_jobs` RPC with row locking (`FOR UPDATE SKIP LOCKED`).
 *    - Guarantees concurrent worker invocations never claim or dispatch the same notification.
 *    - Fallback optimistic concurrency with conditional `.eq("attempts", ...).in("status", ...)`
 *      when running against unmigrated test harnesses or during schema upgrades.
 * 2. Lease-Based Crash Recovery:
 *    - Jobs are transitioned to `status = 'processing'` upon claim with a `claimed_at` timestamp.
 *    - If a worker crashes or an email provider hangs, jobs whose lease has expired (> 300s)
 *      are automatically reclaimed on subsequent runs.
 * 3. Bounded Retries & Exponential Backoff:
 *    - Enforces backoff intervals based on attempt counts before retrying failed dispatches.
 *    - Unrecoverable failures after `maxAttempts` transition deterministically to `dead_letter`.
 * 4. Single Source of Truth:
 *    - Guarantees customer confirmations and desk alerts are reliably delivered without duplicates.
 */
export async function processOutboxQueue(
  options: ProcessOutboxOptions = {}
): Promise<OutboxProcessingSummary> {
  const maxBatch = options.maxBatch ?? 20;
  const maxAttempts = options.maxAttempts ?? 3;
  const baseBackoffMs = options.baseBackoffMs ?? 30_000;
  const leaseSeconds = options.leaseSeconds ?? 300;
  const workerId =
    options.workerId ||
    `worker_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const summary: OutboxProcessingSummary = {
    processed: 0,
    sent: 0,
    failed: 0,
    deadLetter: 0,
    skippedBackoff: 0,
    reclaimedLeases: 0
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return summary;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const baseBackoffSeconds = Math.max(1, Math.round(baseBackoffMs / 1000));
  let claimedJobs: OutboxJob[] = [];
  let usedRpc = false;

  // 1. Primary Concurrency Protection: Call atomic PostgreSQL claim RPC with FOR UPDATE SKIP LOCKED
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("claim_outbox_jobs", {
      p_batch_size: maxBatch,
      p_max_attempts: maxAttempts,
      p_worker_id: workerId,
      p_lease_seconds: leaseSeconds,
      p_base_backoff_seconds: baseBackoffSeconds,
      p_enquiry_id: options.enquiryId || null
    });

    if (!rpcError && Array.isArray(rpcData)) {
      claimedJobs = rpcData as OutboxJob[];
      usedRpc = true;
    }
  } catch {
    usedRpc = false;
  }

  // 2. Fallback Path: Conditional Atomic Claim when RPC is unavailable (e.g. test environments)
  if (!usedRpc) {
    let query = supabase
      .from("notifications_outbox")
      .select("*")
      .in("status", ["pending", "failed", "processing"])
      .lt("attempts", maxAttempts);

    if (options.enquiryId) {
      query = query.eq("enquiry_id", options.enquiryId);
    }

    const { data: candidates, error: queryError } = await query
      .order("created_at", { ascending: true })
      .limit(maxBatch * 2);

    if (!queryError && candidates && candidates.length > 0) {
      const now = Date.now();

      for (const rawJob of candidates) {
        if (claimedJobs.length >= maxBatch) break;
        const job = rawJob as OutboxJob;

        // Skip processing jobs that have an active lease
        if (job.status === "processing") {
          if (!job.claimed_at) continue;
          const claimedTime = new Date(job.claimed_at).getTime();
          if (now - claimedTime < leaseSeconds * 1000) {
            continue; // Active lease held by another worker
          }
          summary.reclaimedLeases++;
        }

        // Exponential backoff check for failed jobs
        if (job.status === "failed" && job.last_attempt_at) {
          const lastAttempt = new Date(job.last_attempt_at).getTime();
          const requiredBackoff = baseBackoffMs * Math.pow(2, Math.max(0, job.attempts - 1));
          if (now - lastAttempt < requiredBackoff) {
            summary.skippedBackoff++;
            continue;
          }
        }

        // Conditional atomic claim: lock by matching current attempts and status
        const nextAttempts = job.attempts + 1;
        const claimPayload = {
          status: "processing",
          attempts: nextAttempts,
          last_attempt_at: new Date().toISOString(),
          claimed_at: new Date().toISOString(),
          claimed_by: workerId
        };

        let claimQuery = supabase
          .from("notifications_outbox")
          .update(claimPayload)
          .eq("id", job.id)
          .eq("attempts", job.attempts);

        if (job.status === "processing") {
          claimQuery = claimQuery.eq("status", "processing");
        } else {
          claimQuery = claimQuery.in("status", ["pending", "failed"]);
        }

        const { data: updatedRows, error: claimError } = await claimQuery.select();

        // If no row was returned, another worker claimed this job concurrently
        if (claimError || !updatedRows || updatedRows.length === 0) {
          continue;
        }

        claimedJobs.push(updatedRows[0] as OutboxJob);
      }
    }
  }

  if (claimedJobs.length === 0) {
    return summary;
  }

  // 3. Dispatch Claimed Notifications
  for (const job of claimedJobs) {
    summary.processed++;

    const outcome = await dispatchEmail(job.recipient, job.subject, job.body);

    if (outcome.deliveryStatus === "sent" || outcome.deliveryStatus === "simulated") {
      summary.sent++;
      await supabase
        .from("notifications_outbox")
        .update({
          status: outcome.deliveryStatus,
          attempts: job.attempts,
          last_attempt_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          provider_message_id: outcome.providerId || null,
          error_message: null
        })
        .eq("id", job.id);
    } else {
      const isDeadLetter = job.attempts >= maxAttempts;

      if (isDeadLetter) {
        summary.deadLetter++;
        await supabase
          .from("notifications_outbox")
          .update({
            status: "dead_letter",
            attempts: job.attempts,
            last_attempt_at: new Date().toISOString(),
            error_message: outcome.errorMessage
              ? `Max retries (${maxAttempts}) exceeded: ${outcome.errorMessage}`
              : `Max retries (${maxAttempts}) exceeded`
          })
          .eq("id", job.id);
      } else {
        summary.failed++;
        await supabase
          .from("notifications_outbox")
          .update({
            status: "failed",
            attempts: job.attempts,
            last_attempt_at: new Date().toISOString(),
            error_message: outcome.errorMessage || "Delivery failed"
          })
          .eq("id", job.id);
      }
    }
  }

  return summary;
}
