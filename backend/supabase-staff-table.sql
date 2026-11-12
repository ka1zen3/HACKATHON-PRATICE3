-- Run this once in your Supabase project → SQL editor
-- Creates the staff table used by the admin login endpoint.

create table if not exists public.staff (
  id            bigint primary key generated always as identity,
  username      text not null unique,
  full_name     text not null,
  role          text not null default 'staff',   -- 'admin' | 'staff'
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- Restrict direct reads so the service-role key (backend only) is required.
-- Anon / authenticated Supabase users cannot read password hashes.
alter table public.staff enable row level security;

create policy "service role only"
  on public.staff
  as restrictive
  to public
  using (false);
