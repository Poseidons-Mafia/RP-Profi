-- =============================================================
--  Wiwang Law – Update 18: Was Nigel anlegt, steht unter „Nigel“
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 17.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Im Modus „Organisatorisch“ legt Nigel Akteneinträge, Termine,
--  Aufgaben und Pinnwand-Beiträge an. Bisher sahen sie aus, als hätte
--  der Auftraggeber sie selbst geschrieben. Jetzt werden sie markiert
--  (von_nigel) und die Website zeigt „Nigel · im Auftrag von …“.
--  Der Auftraggeber bleibt wie bisher als Ersteller gespeichert
--  (created_by/author) – Rechte und Protokoll ändern sich nicht.
--
--  Auch Benachrichtigungen, die dadurch entstehen (z. B. „hat an die
--  Pinnwand gehängt“), werden markiert. Die Edge Function schickt dafür
--  bei Nigels Aktionen die Kopfzeile "x-wiwang-nigel: 1" mit.
-- =============================================================

alter table public.eintraege          add column if not exists von_nigel boolean not null default false;
alter table public.pinnwand           add column if not exists von_nigel boolean not null default false;
alter table public.termine            add column if not exists von_nigel boolean not null default false;
alter table public.aufgaben           add column if not exists von_nigel boolean not null default false;
alter table public.benachrichtigungen add column if not exists von_nigel boolean not null default false;

-- Kam die Anfrage von Nigel (Edge Function ki-assistent, Modus „Organisatorisch“)?
-- Liest die Kopfzeile x-wiwang-nigel der aktuellen Anfrage (PostgREST).
-- Es geht nur um die Anzeige – an Rechten ändert das nichts.
create or replace function public.anfrage_von_nigel()
returns boolean
language plpgsql stable set search_path = ''
as $$
begin
  return coalesce((nullif(current_setting('request.headers', true), '')::json ->> 'x-wiwang-nigel') = '1', false);
exception when others then
  return false;
end $$;

-- Benachrichtigung verschicken (wie Update 7, zusätzlich mit Markierung von_nigel)
create or replace function public.benachrichtige(p_user uuid, p_art text, p_text text, p_link text, p_akte uuid, p_recht text)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if p_user is null or p_user is not distinct from auth.uid() then return; end if;
  if coalesce(current_setting('wiwang.stumm', true), '') = '1' then return; end if;
  if not exists (select 1 from public.profiles where user_id = p_user and status <> 'Ausgeschieden') then return; end if;
  if p_recht is not null and not public.nutzer_hat_recht(p_user, p_recht) then return; end if;
  insert into public.benachrichtigungen (user_id, art, text, link, akte_id, von, von_nigel)
  values (p_user, p_art, left(p_text, 400), p_link, p_akte, auth.uid(), public.anfrage_von_nigel());
end $$;
revoke execute on function public.benachrichtige(uuid, text, text, text, uuid, text) from public, anon, authenticated;

-- Zur Kontrolle
select table_name, column_name from information_schema.columns
 where table_schema = 'public' and column_name = 'von_nigel' order by table_name;
