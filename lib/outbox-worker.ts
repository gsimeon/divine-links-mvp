import { createClient } from "@supabase/supabase-js";
import { dispatchEmail } from "@/lib/notifications";

export interface OutboxJob {
  id: string;
  enquiry_id: string | null;
  recipient: string;
  channel: string;
  subject: string;
  body: string;
  status: "pending" | "sent" | "failed" | "simulated" | "dead_letter";
  error_message: string | null;
  attempts: number;
  last_attempt_at: string | null;
  provider_message_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  sent_at: string | null;
}

export interface ProcessOutboxOptions {
  maxBatch?: number;
  maxAttempts?: number;
  baseBackoffMs?: number;
}

export interface OutboxProcessingSummary {
  processed: number;
  sent: number;
  failed: number;
  deadLetter: number;
  skippedBackoff: number;
}

/**
 * Processes pending and failed jobs in the durable notifications outbox table.
 * 
 * Reliability guarantees:
 * 1. Bounded retries: Limits delivery attempts to `maxAttempts` (default 3).
 * 2. Exponential backoff: Calculates delay interval based on attempt count.
 * 3. Dead-letter queue state: Unrecoverable failures transition to `dead_letter`.
 * 4. Idempotency: Records provider message IDs and timestamps to avoid duplicates.
 * 5. Sanitized error reporting: Captures provider HTTP status without exposing credentials.
 */
export async function processOutboxQueue(
  options: ProcessOutboxOptions = {}
): Promise<OutboxProcessingSummary> {
  const maxBatch = options.maxBatch ?? 20;
  const maxAttempts = options.maxAttempts ?? 3;
  const baseBackoffMs = options.baseBackoffMs ?? 30_000;

  const summary: OutboxProcessingSummary = {
    processed: 0,
    sent: 0,
    failed: 0,
    deadLetter: 0,
    skippedBackoff: 0
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return summary;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: jobs, error } = await supabase
    .from("notifications_outbox")
    .select("*")
    .in("status", ["pending", "failed"])
    .lt("attempts", maxAttempts)
    .order("created_at", { ascending: true })
    .limit(maxBatch);

  if (error || !jobs || jobs.length === 0) {
    return summary;
  }

  const now = Date.now();

  for (const rawJob of jobs) {
    const job = rawJob as OutboxJob;
    summary.processed++;

    // Exponential backoff check for previously failed attempts
    if (job.attempts > 0 && job.last_attempt_at) {
      const lastAttempt = new Date(job.last_attempt_at).getTime();
      const requiredBackoff = baseBackoffMs * Math.pow(2, job.attempts - 1);
      if (now - lastAttempt < requiredBackoff) {
        summary.skippedBackoff++;
        continue;
      }
    }

    const outcome = await dispatchEmail(job.recipient, job.subject, job.body);

    if (outcome.deliveryStatus === "sent" || outcome.deliveryStatus === "simulated") {
      summary.sent++;
      await supabase
        .from("notifications_outbox")
        .update({
          status: outcome.deliveryStatus,
          attempts: job.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          provider_message_id: outcome.providerId || null,
          error_message: null
        })
        .eq("id", job.id);
    } else {
      const nextAttempts = job.attempts + 1;
      const isDeadLetter = nextAttempts >= maxAttempts;

      if (isDeadLetter) {
        summary.deadLetter++;
        await supabase
          .from("notifications_outbox")
          .update({
            status: "dead_letter",
            attempts: nextAttempts,
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
            attempts: nextAttempts,
            last_attempt_at: new Date().toISOString(),
            error_message: outcome.errorMessage || "Delivery failed"
          })
          .eq("id", job.id);
      }
    }
  }

  return summary;
}
