-- Divine Links enquiry-first MVP
-- Run only in the intended Supabase project after reviewing the schema.
create extension if not exists pgcrypto;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  full_name text not null check (char_length(full_name) between 2 and 160),
  email text not null check (char_length(email) <= 254),
  phone text not null check (char_length(phone) between 7 and 40),
  location text not null check (char_length(location) between 2 and 160),
  service text not null check (service in ('telecom', 'sim', 'networking', 'broadband', 'other')),
  audience text not null default 'individual' check (audience in ('individual', 'business')),
  details text not null check (char_length(details) between 10 and 2000),
  consent boolean not null default false check (consent = true),
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'awaiting_customer', 'awaiting_partner', 'in_progress', 'completed', 'cancelled', 'unable_to_fulfil')),
  internal_notes text,
  assigned_to uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enquiries_status_created_at_idx
  on public.enquiries (status, created_at desc);
create index if not exists enquiries_email_idx
  on public.enquiries (email);

alter table public.enquiries enable row level security;

-- Public clients must not directly read or write enquiry records.
-- The server route uses the service-role key and validates every payload.
-- Keep the service-role key server-only; never prefix it with NEXT_PUBLIC_.
revoke all on public.enquiries from anon, authenticated;
grant select, insert, update, delete on public.enquiries to service_role;

create or replace function public.set_enquiries_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists enquiries_updated_at on public.enquiries;
create trigger enquiries_updated_at
before update on public.enquiries
for each row execute function public.set_enquiries_updated_at();
