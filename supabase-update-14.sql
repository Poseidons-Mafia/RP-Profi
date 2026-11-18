-- =============================================================
--  Wiwang Law – Update 14: Nigel „Sehen“ und „Verwenden“
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 13.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Neu: Für Nigel gibt es je Rang zwei Stufen – wie Lesen/Bearbeiten:
--  - "ki_sehen"     = Nigel sehen: iFruit-Handy herausholen (nur Sperrbildschirm),
--                     Arbeitsbereich als zensierte Vorschau ansehen. Kein Zugriff auf Daten.
--  - "ki_assistent" = Nigel verwenden (wie bisher) – schließt Sehen ein.
--
--  Was dieses Skript macht:
--  1. hat_recht() und nutzer_hat_recht(): "ki_assistent" schließt "ki_sehen" ein
--     (so wie "…_schreiben" das passende "…_lesen" einschließt).
--  2. Alle Ränge, die Nigel schon verwenden dürfen, bekommen "ki_sehen" dazu
--     (so setzt es auch die Rechte-Tabelle, wenn man „Verwenden“ anhakt).
--     Das ist nötig, damit Mitglieder mit „Personal verwalten“ solche Ränge
--     weiterhin vergeben dürfen.
-- =============================================================

-- ---------- 1. Rechte prüfen: ki_assistent schließt ki_sehen ein ----------
create or replace function public.hat_recht(p_recht text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  with k as (
    select case p_recht
      when 'personal_verwalten' then 'personal_schreiben'
      when 'personal_sehen'     then 'personal_lesen'
      when 'rechnungen'         then 'rechnungen_schreiben'
      when 'buchhaltung_sehen'  then 'buchhaltung_lesen'
      when 'buchhaltung_buchen' then 'buchhaltung_schreiben'
      when 'gesetzbuch'         then 'gesetzbuch_schreiben'
      when 'einstellungen'      then 'einstellungen_schreiben'
      else p_recht end as p
  )
  select public.is_admin() or exists (
    select 1 from k, public.profiles pr join public.raenge r on r.id = pr.rang_id
     where pr.user_id = auth.uid()
       and pr.status <> 'Ausgeschieden'
       and (r.berechtigungen ? k.p or r.berechtigungen ? p_recht
            or (k.p like '%\_lesen' and r.berechtigungen ? (left(k.p, length(k.p) - 6) || '_schreiben'))
            or (k.p = 'ki_sehen' and r.berechtigungen ? 'ki_assistent')));
$$;
revoke execute on function public.hat_recht(text) from public, anon;
grant  execute on function public.hat_recht(text) to authenticated;

create or replace function public.nutzer_hat_recht(p_user uuid, p_recht text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.ist_admin_konto(p_user) or exists (
    select 1 from public.profiles pr join public.raenge r on r.id = pr.rang_id
     where pr.user_id = p_user
       and pr.status <> 'Ausgeschieden'
       and (r.berechtigungen ? p_recht
            or (p_recht like '%\_lesen' and r.berechtigungen ? (left(p_recht, length(p_recht) - 6) || '_schreiben'))
            or (p_recht = 'ki_sehen' and r.berechtigungen ? 'ki_assistent')));
$$;
revoke execute on function public.nutzer_hat_recht(uuid, text) from public, anon, authenticated;

-- ---------- 2. Ränge mit „Nigel verwenden“ bekommen „Nigel sehen“ dazu ----------
update public.raenge
   set berechtigungen = berechtigungen || '["ki_sehen"]'::jsonb
 where berechtigungen ? 'ki_assistent' and not berechtigungen ? 'ki_sehen';

-- Zur Kontrolle: Nigel-Rechte je Rang
select name as rang,
       berechtigungen ? 'ki_sehen'     as nigel_sehen,
       berechtigungen ? 'ki_assistent' as nigel_verwenden
  from public.raenge order by sortierung;
