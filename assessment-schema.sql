-- CareerPilot assessment service — run manually in the Supabase SQL editor.
-- This file is not executed automatically by Vercel deployment.
-- Store all secrets in server-only Vercel environment variables.
create extension if not exists pgcrypto;

create table if not exists public.assessment_orders (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  linkedin_url text,
  professional_bio text not null,
  career_goals text not null,
  consent_at timestamptz not null,
  terms_accepted_at timestamptz not null,
  consent_version text not null,
  request_token_hash text not null,
  token_expires_at timestamptz not null,
  cv_storage_key text,
  cv_filename text,
  cv_uploaded_at timestamptz,
  status text not null default 'awaiting_document'
    check (status in ('awaiting_document','awaiting_payment','received','in_progress','completed','delivered','deletion_requested','deleted')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded')),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  deletion_requested_at timestamptz,
  deleted_at timestamptz,
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint cv_key_private check (cv_storage_key is null or cv_storage_key ~ '^[0-9a-f-]+/cv\.(pdf|docx)$')
);
create index if not exists assessment_orders_created_at_idx on public.assessment_orders(created_at desc);
create index if not exists assessment_orders_paid_at_idx on public.assessment_orders(paid_at);
create index if not exists assessment_orders_status_idx on public.assessment_orders(status);
create index if not exists assessment_orders_email_idx on public.assessment_orders(email);

create table if not exists public.assessment_rate_limits (
  key_hash text primary key,
  attempts integer not null default 0,
  window_started timestamptz not null default now()
);

create or replace function public.assessment_consume_limit(
  p_key text,p_max integer,p_window_seconds integer
) returns boolean
language plpgsql security definer set search_path=public
as $$
declare current_attempts integer;
begin
  if length(p_key)<>64 or p_max not between 1 and 200 or p_window_seconds not between 15 and 86400 then
    return false;
  end if;
  insert into assessment_rate_limits(key_hash,attempts,window_started)
    values (p_key,1,now())
  on conflict(key_hash) do update
    set attempts=case
      when assessment_rate_limits.window_started < now()-make_interval(secs=>p_window_seconds) then 1
      else assessment_rate_limits.attempts + 1 end,
    window_started=case
      when assessment_rate_limits.window_started < now()-make_interval(secs=>p_window_seconds) then now()
      else assessment_rate_limits.window_started end
  returning attempts into current_attempts;
  return current_attempts <= p_max;
end;
$$;

create table if not exists public.assessment_email_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.assessment_orders(id) on delete cascade,
  kind text not null check(kind in ('payment_confirmation','application_received','in_progress','completed','delivered')),
  status text not null default 'pending' check(status in ('pending','sent')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_id text,
  created_at timestamptz not null default now(),
  unique (order_id,kind)
);
create index if not exists assessment_outbox_retry_idx on public.assessment_email_outbox(status,next_attempt_at);

-- Avoid broad client access. Serverless functions always use service_role.
alter table public.assessment_orders enable row level security;
alter table public.assessment_rate_limits enable row level security;
alter table public.assessment_email_outbox enable row level security;
revoke all on public.assessment_orders from public, anon, authenticated;
revoke all on public.assessment_rate_limits from public, anon, authenticated;
revoke all on public.assessment_email_outbox from public, anon, authenticated;
grant all on public.assessment_orders to service_role;
grant all on public.assessment_rate_limits to service_role;
grant all on public.assessment_email_outbox to service_role;
revoke execute on function public.assessment_consume_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.assessment_consume_limit(text,integer,integer) to service_role;

-- Private bucket, no public object access.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('career-assessments-private','career-assessments-private',false,2097152,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set
 public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- Do not add SELECT, INSERT, UPDATE or DELETE storage policies for anon/authenticated.
-- The service_role key is server-only and bypasses RLS. Never expose it publicly.

-- Operational policy (enforced by /api/assessment/maintenance, scheduled daily):
-- 1. Unpaid CVs deleted 48 hours after upload; their records scrubbed after 7 days.
-- 2. Paid CVs deleted 30 days after delivery or 90 days after payment, whichever first.
-- 3. Paid customer personal information is scrubbed 180 days after payment/delivery
--    (the audit/order id and payment metadata remain for accounting and dispute purposes).
-- 4. On verified deletion request, remove CV and scrub customer profile fields.
-- 5. External AI processors receive NO CVs by default. Separate specific consent
--    and an updated privacy notice are required before enabling any external AI processing.
-- 6. Scanner integration must be configured before any private CV upload is accepted.
-- 7. Email provider Resend and payments provider Stripe handle data as service processors.
