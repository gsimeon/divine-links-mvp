-- Migration: 202610240003_audit_cascade_on_delete.sql
-- Enables cascading deletion of audit records when a hard erasure request is executed under GDPR Article 17.
-- Run in the Supabase SQL editor if database-level cascading deletion is preferred over sequential application deletion.

alter table public.enquiry_audit_events
  drop constraint if exists enquiry_audit_events_enquiry_id_fkey;

alter table public.enquiry_audit_events
  add constraint enquiry_audit_events_enquiry_id_fkey
  foreign key (enquiry_id)
  references public.enquiries(id)
  on delete cascade;
