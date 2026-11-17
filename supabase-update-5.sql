-- =============================================================
--  Wiwang Law – Update 5: Lese- und Schreibrechte je Bereich
--
--  Diesen ganzen Text in Supabase unter "SQL Editor" einfügen und
--  auf "Run" klicken. Voraussetzung: Updates 2, 3 und 4.
--  Kann gefahrlos mehrfach ausgeführt werden.
--
--  Jeder Bereich hat ein Lese- und ein Schreibrecht (<bereich>_lesen,
--  <bereich>_schreiben). Schreiben schließt Lesen ein.
--  Bereiche: akten, mandanten, termine, rechnungen, buchhaltung,
--  gesetzbuch, personal, einstellungen (nur schreiben) + akten_loeschen.
-- =============================================================


-- ---------- Rechte prüfen (alte Namen werden übersetzt) ----------
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
            or (k.p like '%\_lesen' and r.berechtigungen ? (left(k.p, length(k.p) - 6) || '_schreiben'))));
$$;
revoke execute on function public.hat_recht(text) from public, anon;
grant  execute on function public.hat_recht(text) to authenticated;


-- ---------- Bestehende Ränge einmalig umstellen ----------
-- Bisher durften alle Mitglieder Akten, Mandanten, Termine bearbeiten und
-- Rechnungen sowie das Gesetzbuch lesen – das bleibt so erhalten.
do $$
begin
  if coalesce((select daten ->> 'rechte_version' from public.einstellungen where id = 1), '1') <> '2' then
    update public.raenge set berechtigungen = (
      select coalesce(jsonb_agg(distinct k order by k), '[]'::jsonb) from (
        select unnest(array['akten_lesen', 'akten_schreiben', 'mandanten_lesen', 'mandanten_schreiben',
                            'termine_lesen', 'termine_schreiben', 'rechnungen_lesen', 'gesetzbuch_lesen']) as k
        union
        select case e
          when 'rechnungen'         then 'rechnungen_schreiben'
          when 'buchhaltung_sehen'  then 'buchhaltung_lesen'
          when 'buchhaltung_buchen' then 'buchhaltung_schreiben'
          when 'gesetzbuch'         then 'gesetzbuch_schreiben'
          when 'personal_sehen'     then 'personal_lesen'
          when 'personal_verwalten' then 'personal_schreiben'
          when 'einstellungen'      then 'einstellungen_schreiben'
          else e end
        from jsonb_array_elements_text(berechtigungen) as e
      ) x);
    update public.einstellungen set daten = daten || '{"rechte_version":"2"}'::jsonb where id = 1;
  end if;
end $$;


-- ---------- Alle bisherigen Regeln der Bereiche entfernen ----------
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
     where schemaname = 'public'
       and tablename = any (array['akten', 'eintraege', 'beteiligte', 'beweise', 'mandanten', 'termine', 'aufgaben',
                                  'rechnungen', 'buchungen', 'konten', 'gesetze', 'gebuehren',
                                  'personalakte', 'personal_vermerke', 'einstellungen', 'protokoll'])
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;


-- ---------- Neue Regeln: Lesen / Schreiben je Bereich ----------
do $$
declare
  t text; b text;
  zuordnung text[][] := array[
    ['akten', 'akten'], ['eintraege', 'akten'], ['beteiligte', 'akten'], ['beweise', 'akten'],
    ['mandanten', 'mandanten'], ['termine', 'termine'], ['aufgaben', 'termine'],
    ['rechnungen', 'rechnungen'], ['gesetze', 'gesetzbuch'], ['gebuehren', 'gesetzbuch']];
  i int;
begin
  for i in 1 .. array_length(zuordnung, 1) loop
    t := zuordnung[i][1]; b := zuordnung[i][2];
    execute format('create policy "Lesen" on public.%I for select to authenticated using (public.hat_recht(%L))', t, b || '_lesen');
    execute format('create policy "Anlegen" on public.%I for insert to authenticated with check (public.hat_recht(%L))', t, b || '_schreiben');
    execute format('create policy "Ändern" on public.%I for update to authenticated using (public.hat_recht(%L)) with check (public.hat_recht(%L))', t, b || '_schreiben', b || '_schreiben');
    execute format('create policy "Löschen" on public.%I for delete to authenticated using (public.hat_recht(%L))', t,
                   case when t = 'akten' then 'akten_loeschen' else b || '_schreiben' end);
  end loop;
end $$;

-- Buchhaltung: Buchungen nie ändern/löschen (GoB)
create policy "Lesen"   on public.buchungen for select to authenticated using (public.hat_recht('buchhaltung_lesen'));
create policy "Buchen"  on public.buchungen for insert to authenticated with check (public.hat_recht('buchhaltung_schreiben'));
create policy "Lesen"   on public.konten for select to authenticated using (public.hat_recht('buchhaltung_lesen'));
create policy "Anlegen" on public.konten for insert to authenticated with check (public.hat_recht('buchhaltung_schreiben'));
create policy "Ändern"  on public.konten for update to authenticated
  using (public.hat_recht('buchhaltung_schreiben')) with check (public.hat_recht('buchhaltung_schreiben'));

-- Kanzlei-Einstellungen: lesen alle (Währung, Ort …), ändern mit Recht
create policy "Lesen"  on public.einstellungen for select to authenticated using (true);
create policy "Ändern" on public.einstellungen for update to authenticated
  using (public.hat_recht('einstellungen_schreiben')) with check (public.hat_recht('einstellungen_schreiben'));

-- Personalakte & Vermerke: eigene immer lesbar
do $$
declare t text;
begin
  foreach t in array array['personalakte', 'personal_vermerke'] loop
    execute format('create policy "Lesen" on public.%I for select to authenticated
                    using (user_id = auth.uid() or public.hat_recht(''personal_lesen''))', t);
    execute format('create policy "Anlegen" on public.%I for insert to authenticated
                    with check (public.hat_recht(''personal_schreiben'') and (user_id <> auth.uid() or public.is_admin()))', t);
    execute format('create policy "Ändern" on public.%I for update to authenticated
                    using (public.hat_recht(''personal_schreiben'') and (user_id <> auth.uid() or public.is_admin()))
                    with check (public.hat_recht(''personal_schreiben'') and (user_id <> auth.uid() or public.is_admin()))', t);
    execute format('create policy "Löschen" on public.%I for delete to authenticated
                    using (public.hat_recht(''personal_schreiben'') and (user_id <> auth.uid() or public.is_admin()))', t);
  end loop;
end $$;

-- Änderungsprotokoll: nur Einträge aus Bereichen, die man lesen darf
create policy "Lesen" on public.protokoll for select to authenticated using (public.hat_recht(
  case tabelle
    when 'akten' then 'akten_lesen' when 'eintraege' then 'akten_lesen'
    when 'beteiligte' then 'akten_lesen' when 'beweise' then 'akten_lesen'
    when 'mandanten' then 'mandanten_lesen'
    when 'termine' then 'termine_lesen' when 'aufgaben' then 'termine_lesen'
    when 'rechnungen' then 'rechnungen_lesen'
    when 'buchungen' then 'buchhaltung_lesen'
    else 'admin_only' end));


-- Zur Kontrolle: Rechte je Rang
select name as rang, berechtigungen from public.raenge order by sortierung;
