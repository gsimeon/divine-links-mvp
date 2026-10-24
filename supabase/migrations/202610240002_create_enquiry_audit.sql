-- Append-only audit trail for privileged enquiry updates.
create table if not exists public.enquiry_audit_events (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id) on delete restrict,
  actor_user_id uuid not null,
  event_type text not null,
  old_status text,
  new_status text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists enquiry_audit_events_enquiry_created_idx on public.enquiry_audit_events (enquiry_id, created_at desc);
alter table public.enquiry_audit_events enable row level security;
revoke all on public.enquiry_audit_events from anon, authenticated;
grant select, insert on public.enquiry_audit_events to service_role;
-- No public policy. Writes occur only through the server route after role validation.
