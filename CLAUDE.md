# Portfolio-Dashboard

Projekt-Portfolio der Montalux AG für GL und VR: RAG-Status, Budget, Termine, Timeline. Die Initiativen leben hier (Supabase), Jira ist nur Kontext (Entwickler-Epics, JPD-Items) und wird nur gelesen. Ersetzt das Jira-Projekt MON.

## Entscheide

- **Stack:** Vite, React 19, TypeScript, Tailwind 4, shadcn/ui. Hosting GitHub Pages aus öffentlichem Repo (Org auf GitHub Free), `VITE_BASE` erlaubt späteres eigenes Hosting. HashRouter, weil Pages kein SPA-Fallback hat.
- **Supabase:** eigenes Projekt `portfolio-dashboard` (Zürich, eu-central-2, Free Plan), getrennt von Timetracker und CRM.
- **Öffentliches Repo:** keine Secrets, keine Echtdaten, keine E-Mail-Adressen im Repo. Jira-Quellen und User werden pro Umgebung in der DB erfasst.
- **Login:** Magic Link, nur eingeladene User (`shouldCreateUser: false`, Signup im Supabase-Dashboard aus). Zugriff zusätzlich über Allowlist `app_user`.
- **Rollen:** `pm` (Pascal, schreibt), `entscheider` (GL), `leser` (VR). In v1 schreibt nur `pm`.
- **Kein Over-Engineering:** kein State-Management-Framework, keine ORM-Schicht, direkte Client-Queries.
- Code mit 2 Leerzeichen Einrückung. UI auf Deutsch (Schweiz), kein `ß`, Datum `TT.MM.JJJJ`, Beträge `CHF 12'000`.

## Fachregeln

- **RAG** setzt die PM manuell, nach der schlechtesten Dimension: Termin (Gelb bis 4 Wochen Verzug, Rot darüber), Budget-Prognose (Gelb +10 bis 20 %, Rot über 20 %), Scope (Gelb Abstriche, Rot Kernziel gefährdet). Begründung bei Gelb und Rot ist Pflicht (DB-Constraint).
- **Warnzeichen** (berechnet im UI): Due date überschritten, verlinktes Epic endet nach der Initiative, RAG älter als 14 Tage (Ampel grau).
- **Entscheid nötig:** Checkbox plus Frage (DB-Constraint).
- **Budget:** führend ist Pascals Controlling-Excel, monatlich von Hand übertragen. Felder Budget, Budget-Status, Ist verrechnet, Prognose total.
- **Keys:** übernommene Initiativen behalten MON-xx, neue zählen ab MON-21 weiter (Sequence).

## Datenmodell

`supabase/migrations/001_init.sql`: app_user, initiative, milestone, dependency, jira_source, jira_link (mit Cache), change_log, snapshot, sync_run. Trigger für updated_at, rag_updated_at und Änderungshistorie. change_log und snapshot sind append-only (Trigger blockiert Update und Delete auch für Admins). Initiativen werden archiviert, nie gelöscht.
`002_private_helpers.sql`: SECURITY-DEFINER-Hilfsfunktionen im Schema `private`, nicht über die API aufrufbar.

`003_jira_sync.sql`: pg_cron-Job `jira-sync-daily` (05:00 UTC) ruft die Edge Function auf, `check_cron_secret()` und `take_weekly_snapshot()` (nur service_role).
`004_pg_net_schema.sql`: pg_net im Schema `extensions`.

Nach jeder Migration: Typen neu generieren nach `src/lib/database.types.ts` und Security-Advisor prüfen.

## Jira-Sync

Edge Function `supabase/functions/jira-sync` (verify_jwt aus, eigene Prüfung): Cron-Aufruf mit Header `x-cron-secret`, manueller Aufruf nur mit Rolle `pm`. Aktualisiert den Cache in `jira_link` (Titel, Status, Start, Due, Fortschritt der Epics über Children), montags zusätzlich Snapshot. Fehler pro Quelle landen in `jira_link.sync_error` und `sync_run`, der letzte Cache bleibt.

Pro Umgebung nötig (nicht im Repo):
- Vault-Secrets `project_url` und `cron_secret`
- Edge-Function-Secret pro Quelle, Name gemäss `jira_source.secret_name` (z.B. `JIRA_TOKEN_MONTALUX`), Wert = Atlassian-API-Token des Kontos in `jira_source.auth_email`

## Etappen

- **v1:** MON-Import, Bearbeitungsmasken für PM, Jira-Sync lesend (Edge Function, täglich und per Button), Login, Startseite und Drilldown, Snapshots ab Tag 1.
- **v2:** Entscheide und Kommentare (append-only, mit Gremium GL/VR), Rollen aktiv.
- **v3:** RAG-Verlauf, Microsoft-Login (Entra).

## Nicht bauen

Schreiben nach Jira, Anbindung ans Excel oder die Buchhaltung, interne Stundenerfassung, Rechte pro Initiative.
