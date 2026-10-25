-- Migration: 202610260001_atomic_outbox_claim.sql
-- Implements:
-- 1. Updates notifications_outbox status check constraint to include 'processing'
-- 2. Adds claimed_at and claimed_by columns for lease management and concurrency tracking
-- 3. Dedicated index for high-throughput job claiming
-- 4. Atomic PostgreSQL RPC claim_outbox_jobs using FOR UPDATE SKIP LOCKED to guarantee
--    that concurrent workers never claim or dispatch the same notification twice.

-- 1. Update check constraint to allow 'processing'
alter table public.notifications_outbox drop constraint if exists notifications_outbox_status_check;
alter table public.notifications_outbox add constraint notifications_outbox_status_check 
  check (status in ('pending', 'processing', 'sent', 'failed', 'simulated', 'dead_letter'));

-- 2. Add lease tracking columns
alter table public.notifications_outbox add column if not exists claimed_at timestamptz;
alter table public.notifications_outbox add column if not exists claimed_by text;

-- 3. Index for efficient outbox queue scanning and claiming
create index if not exists notifications_outbox_claim_idx 
  on public.notifications_outbox (status, attempts, last_attempt_at, created_at);

-- 4. Atomic Job Claim Function with Row Locking
create or replace function public.claim_outbox_jobs(
  p_batch_size integer default 20,
  p_max_attempts integer default 3,
  p_worker_id text default 'worker',
  p_lease_seconds integer default 300,
  p_base_backoff_seconds integer default 30,
  p_enquiry_id uuid default null
)
returns setof public.notifications_outbox
language plpgsql
security definer
as $$
begin
  return query
  with candidate_jobs as (
    select id
    from public.notifications_outbox
    where (
      -- Pending jobs that have never been attempted
      (status = 'pending' and attempts < p_max_attempts)
      or
      -- Failed jobs whose exponential backoff interval has elapsed
      (
        status = 'failed' 
        and attempts < p_max_attempts
        and (
          last_attempt_at is null 
          or last_attempt_at <= (now() - (p_base_backoff_seconds * power(2, greatest(0, attempts - 1)) || ' seconds')::interval)
        )
      )
      or
      -- Interrupted/crashed worker execution whose lease has expired
      (
        status = 'processing' 
        and claimed_at is not null
        and claimed_at <= (now() - (p_lease_seconds || ' seconds')::interval)
        and attempts < p_max_attempts
      )
    )
    and (p_enquiry_id is null or enquiry_id = p_enquiry_id)
    order by created_at asc
    for update skip locked
    limit p_batch_size
  )
  update public.notifications_outbox o
  set
    status = 'processing',
    claimed_at = now(),
    claimed_by = p_worker_id,
    attempts = o.attempts + 1,
    last_attempt_at = now()
  from candidate_jobs c
  where o.id = c.id
  returning o.*;
end;
$$;

revoke all on function public.claim_outbox_jobs(integer, integer, text, integer, integer, uuid) from anon, authenticated;
grant execute on function public.claim_outbox_jobs(integer, integer, text, integer, integer, uuid) to service_role;
