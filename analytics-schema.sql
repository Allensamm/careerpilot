-- CareerPilot first-party analytics tables.
-- Run this in the Supabase SQL Editor for the project connected to Vercel.
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  visitor_id text not null,
  session_id text not null,
  event_name text not null,
  page_path text not null,
  page_title text,
  referrer_domain text,
  device_type text,
  browser text,
  os text,
  tool_name text,
  event_label text,
  event_target text,
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_session_id_idx on public.analytics_events (session_id);
create index if not exists analytics_events_visitor_id_idx on public.analytics_events (visitor_id);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;
grant all on public.analytics_events to service_role;

-- Login throttling stores a keyed hash of the request IP, never the raw IP.
create table if not exists public.analytics_login_attempts (
  ip_hash text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz
);
alter table public.analytics_login_attempts enable row level security;
revoke all on public.analytics_login_attempts from anon, authenticated;
grant all on public.analytics_login_attempts to service_role;

-- Suggested monthly retention maintenance: remove analytics older than 90 days.
-- delete from public.analytics_events where created_at < now() - interval '90 days';
