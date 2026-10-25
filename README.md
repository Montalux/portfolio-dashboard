# Portfolio-Dashboard

Projekt-Portfolio der Montalux AG: RAG-Status, Budget, Termine und Timeline für GL und VR.

## Lokal starten

```bash
cp .env.example .env.local   # Werte aus dem Supabase-Projekt eintragen
npm install
npm run dev
```

## Deploy

Push auf `main` baut und deployt auf GitHub Pages. Repository-Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Publishable Key, öffentlich unkritisch, Schutz liegt in RLS).

## Datenbank

Migrationen in `supabase/migrations/`, Reihenfolge nach Nummer. Nach jeder Migration Typen in `src/lib/database.types.ts` neu generieren.

## User freischalten

1. Supabase Dashboard > Authentication > Users > Invite user.
2. Eintrag in `app_user` mit Rolle (`pm`, `entscheider`, `leser`).

Ohne Eintrag in `app_user` sieht ein eingeloggter User keine Daten.
