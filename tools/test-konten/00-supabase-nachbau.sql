-- Minimaler Nachbau der Supabase-Umgebung (Rollen, auth-Schema, pgcrypto) – nur für lokale Tests
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create role supabase_auth_admin nologin;
create schema extensions; create extension pgcrypto schema extensions;
create schema auth;
create table auth.users (instance_id uuid, id uuid primary key, aud varchar, role varchar, email varchar, encrypted_password varchar,
  email_confirmed_at timestamptz, invited_at timestamptz, confirmation_token varchar, recovery_token varchar,
  email_change_token_new varchar, email_change varchar, last_sign_in_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz, banned_until timestamptz, is_anonymous boolean default false);
create table auth.identities (provider_id text, user_id uuid references auth.users on delete cascade, identity_data jsonb, provider text,
  last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
  email text generated always as (lower(identity_data->>'email')) stored, id uuid primary key default gen_random_uuid());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
grant usage on schema auth, extensions to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create publication supabase_realtime;
