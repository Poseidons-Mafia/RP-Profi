-- =============================================================
--  Wiwang Law – Update 17: Gebührenkatalog gehört zu den Finanzen
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2 bis 16.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Bisher hing der Gebührenkatalog am Recht „Gesetzbuch“ – wer Rechnungen
--  schreibt, aber das Gesetzbuch nicht lesen durfte, sah keine Preise, und
--  wer Gesetzestexte pflegt, durfte Preise ändern. Jetzt:
--  - Lesen:  wer Rechnungen lesen darf (rechnungen_lesen)
--  - Ändern: wer die Kanzlei-Einstellungen bearbeiten darf
--            (einstellungen_schreiben) – feste Preise sind Kanzlei-Vorgaben.
-- =============================================================

drop policy if exists "Lesen"   on public.gebuehren;
drop policy if exists "Anlegen" on public.gebuehren;
drop policy if exists "Ändern"  on public.gebuehren;
drop policy if exists "Löschen" on public.gebuehren;

create policy "Lesen"   on public.gebuehren for select to authenticated using (public.hat_recht('rechnungen_lesen'));
create policy "Anlegen" on public.gebuehren for insert to authenticated with check (public.hat_recht('einstellungen_schreiben'));
create policy "Ändern"  on public.gebuehren for update to authenticated
  using (public.hat_recht('einstellungen_schreiben')) with check (public.hat_recht('einstellungen_schreiben'));
create policy "Löschen" on public.gebuehren for delete to authenticated using (public.hat_recht('einstellungen_schreiben'));

-- Zur Kontrolle
select policyname, cmd, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'gebuehren' order by cmd;
