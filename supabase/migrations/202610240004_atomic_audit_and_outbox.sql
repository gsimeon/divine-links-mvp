-- Migration: 202610240004_atomic_audit_and_outbox.sql
-- Implements:
-- 1. Persistent notifications outbox table for durable email logging and delivery tracking
-- 2. Atomic PostgreSQL RPC function for enquiry status updates + audit events in a single transaction
-- 3. Atomic PostgreSQL RPC function for GDPR Article 17 erasure
-- 4. Atomic PostgreSQL RPC function for enquiry submission with transactional outbox queueing

-- ============================================================================
-- 1. Notifications Outbox Table
-- ============================================================================
create table if not exists public.notifications_outbox (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references public.enquiries(id) on delete set null,
  recipient text not null check (char_length(recipient) <= 254),
  channel text not null default 'email' check (channel in ('email', 'sms')),
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'simulated', 'dead_letter')),
  error_message text,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  provider_message_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists notifications_outbox_status_idx on public.notifications_outbox (status, created_at desc);
create index if not exists notifications_outbox_enquiry_idx on public.notifications_outbox (enquiry_id);

alter table public.notifications_outbox enable row level security;
revoke all on public.notifications_outbox from anon, authenticated;
grant select, insert, update on public.notifications_outbox to service_role;

-- ============================================================================
-- 2. Atomic Enquiry Update + Audit Event RPC
-- ============================================================================
create or replace function public.admin_update_enquiry(
  p_enquiry_id uuid,
  p_actor_user_id uuid,
  p_status text,
  p_internal_notes text default null,
  p_assigned_to uuid default null,
  p_outbox_subject text default null,
  p_outbox_body text default null,
  p_outbox_recipient text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_existing record;
  v_updated record;
  v_event_type text;
  v_audit_id uuid;
  v_outbox_id uuid;
begin
  -- 1. Lock existing enquiry row for update to guarantee serial consistency
  select id, reference, full_name, email, phone, location, service, audience, details, status, internal_notes, assigned_to
  into v_existing
  from public.enquiries
  where id = p_enquiry_id
  for update;

  if not found then
    raise exception 'ENQUIRY_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 2. Determine granular audit event type
  if v_existing.status is distinct from p_status then
    v_event_type := 'admin_status_change';
  elsif v_existing.internal_notes is distinct from p_internal_notes then
    v_event_type := 'admin_note_update';
  elsif v_existing.assigned_to is distinct from p_assigned_to then
    v_event_type := 'admin_assignment_update';
  else
    v_event_type := 'admin_update';
  end if;

  -- 3. Execute enquiry update
  update public.enquiries
  set
    status = p_status,
    internal_notes = p_internal_notes,
    assigned_to = p_assigned_to,
    updated_at = now()
  where id = p_enquiry_id
  returning id, reference, full_name, email, status, internal_notes, assigned_to, updated_at
  into v_updated;

  -- 4. Atomically insert into enquiry_audit_events
  insert into public.enquiry_audit_events (
    enquiry_id,
    actor_user_id,
    event_type,
    old_status,
    new_status,
    note,
    created_at
  ) values (
    v_updated.id,
    p_actor_user_id,
    v_event_type,
    v_existing.status,
    v_updated.status,
    p_internal_notes,
    now()
  ) returning id into v_audit_id;

  -- 5. Atomically queue outbox notification if notification text is provided
  if p_outbox_recipient is not null and p_outbox_subject is not null and p_outbox_body is not null then
    insert into public.notifications_outbox (
      enquiry_id,
      recipient,
      channel,
      subject,
      body,
      status,
      metadata
    ) values (
      v_updated.id,
      p_outbox_recipient,
      'email',
      p_outbox_subject,
      p_outbox_body,
      'pending',
      jsonb_build_object(
        'reference', v_updated.reference,
        'oldStatus', v_existing.status,
        'newStatus', v_updated.status
      )
    ) returning id into v_outbox_id;
  end if;

  -- 6. Return structured outcome
  return jsonb_build_object(
    'enquiry', jsonb_build_object(
      'id', v_updated.id,
      'reference', v_updated.reference,
      'full_name', v_updated.full_name,
      'email', v_updated.email,
      'status', v_updated.status,
      'internal_notes', v_updated.internal_notes,
      'assigned_to', v_updated.assigned_to,
      'updated_at', v_updated.updated_at
    ),
    'previous_status', v_existing.status,
    'status_changed', (v_existing.status is distinct from v_updated.status),
    'audit_id', v_audit_id,
    'outbox_id', v_outbox_id
  );
end;
$$;

revoke all on function public.admin_update_enquiry(uuid, uuid, text, text, uuid, text, text, text) from anon, authenticated;
grant execute on function public.admin_update_enquiry(uuid, uuid, text, text, uuid, text, text, text) to service_role;

-- ============================================================================
-- 3. Atomic GDPR Hard Deletion RPC
-- ============================================================================
create or replace function public.admin_delete_enquiry_gdpr(
  p_enquiry_id uuid,
  p_actor_user_id uuid
)
returns boolean
language plpgsql
security definer
as $$
begin
  -- Clear outbox records linked to this enquiry
  delete from public.notifications_outbox where enquiry_id = p_enquiry_id;

  -- Clear audit events
  delete from public.enquiry_audit_events where enquiry_id = p_enquiry_id;

  -- Delete the enquiry
  delete from public.enquiries where id = p_enquiry_id;

  if not found then
    raise exception 'ENQUIRY_NOT_FOUND' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

revoke all on function public.admin_delete_enquiry_gdpr(uuid, uuid) from anon, authenticated;
grant execute on function public.admin_delete_enquiry_gdpr(uuid, uuid) to service_role;

-- ============================================================================
-- 4. Atomic Enquiry Submission RPC
-- ============================================================================
create or replace function public.submit_enquiry_atomic(
  p_reference text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_location text,
  p_service text,
  p_audience text,
  p_details text,
  p_confirmation_subject text,
  p_confirmation_body text,
  p_admin_subject text,
  p_admin_body text,
  p_admin_email text default 'ops@divinelinks.co'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_enquiry_id uuid;
begin
  insert into public.enquiries (
    reference, full_name, email, phone, location, service, audience, details, consent, status
  ) values (
    p_reference, p_full_name, p_email, p_phone, p_location, p_service, p_audience, p_details, true, 'submitted'
  ) returning id into v_enquiry_id;

  -- Persist customer confirmation in outbox
  insert into public.notifications_outbox (
    enquiry_id, recipient, channel, subject, body, status, metadata
  ) values (
    v_enquiry_id, p_email, 'email', p_confirmation_subject, p_confirmation_body, 'pending',
    jsonb_build_object('reference', p_reference, 'type', 'customer_confirmation')
  );

  -- Persist admin alert in outbox
  insert into public.notifications_outbox (
    enquiry_id, recipient, channel, subject, body, status, metadata
  ) values (
    v_enquiry_id, p_admin_email, 'email', p_admin_subject, p_admin_body, 'pending',
    jsonb_build_object('reference', p_reference, 'type', 'admin_alert')
  );

  return v_enquiry_id;
end;
$$;

revoke all on function public.submit_enquiry_atomic(text, text, text, text, text, text, text, text, text, text, text, text, text) from anon, authenticated;
grant execute on function public.submit_enquiry_atomic(text, text, text, text, text, text, text, text, text, text, text, text, text) to service_role;
