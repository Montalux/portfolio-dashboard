# Design: Montalux Mono

Vorlage für die drei Screens der App. Die Mockups in `mockups/*.dc.html` sind statisches HTML mit Beispieldaten und nur lokal (gitignored, enthalten Echtdaten). Sie sind Quelltext zum Nachbauen, nicht zum Öffnen im Browser. Layout und Styles übernehmen, Daten aus Supabase.

- `mockups/MainMono.dc.html`: Startseite
- `mockups/DetailMono.dc.html`: Drilldown einer Initiative
- `mockups/BearbeitenMono.dc.html`: Bearbeitungsmaske (PM)
- `tokens.json`: Farb-, Schrift- und Radius-Tokens des Systems «Montalux Mono»

## Look

Kühl, ohne Farbakzent, bold. Schrift DM Sans (400, 500, 700), Titel 700. Keine Schatten, keine Verläufe. Karten: weiss, 1px `#d9e0e7`, Radius 12px.

| Zweck | Wert |
|---|---|
| Kopfband, Haupttext | `#171e26` |
| Kacheln im Band | `#1f2a35`, Rahmen `#2e4559` |
| Seitenhintergrund, Text auf Navy | `#f4f7fa` |
| Gedämpfter Text hell / auf Navy | `#5a6572` / `#c9d3dd` |
| Akzent (Balken, Zahlen) hell / auf Navy | `#475b6e` / `#a9bccd` |
| Abgeschlossene Balken, Fortschritts-Track | `#c9d3dd`, `#e6ebf0` |
| Ampel Grün / Gelb / Rot / ohne Status | `#2fa66a` / `#e2a92b` / `#d9473f` / `#c5cdd0` |

Ampel ist ein gefüllter Kreis (20 bis 24px) ohne Text, mit `role="img"` und `aria-label`. Das ist die einzige Signalfarbe.

## Aufbau Startseite

1. Kopfband (Navy): Titel, Aktionen (Aktualisieren, Neue Initiative, User, Abmelden), Statuszeile (Portfolio-Ampel, offene Entscheide, laufend/geplant, Datenstand), Budget-Kacheln (Bewilligt, Verbraucht, Rest bewilligt, Noch nicht bewilligt).
2. Initiativen: Kartenraster (`auto-fit`, min 300px). Karte: Key und Phase, Ampel, Titel, optional Lagehinweis, Datum, Budgetbalken mit Marker am Ende, Ist / Prognose / Budget.
3. Timeline: Gantt mit Monatsraster, Heute-Linie, aktive Balken `#475b6e`, abgeschlossene `#c9d3dd`, Meilenstein als gelber Punkt.
4. Nächste Termine (8 Wochen): Tabelle Datum, Start/Ende, Titel. Ganz unten.

## Abstände

Seitenrand `clamp(16px, 4vw, 40px)`, Inhalt max 1328px (Detail/Bearbeiten 1152px). Abstand zwischen Bereichen 96px, Überschrift zu Inhalt 32px, Kartenraster 32px, Karteninnenabstand 32px. Formularfelder 48px hoch.

## Hinweise

- Alle Texte Deutsch (Schweiz): kein `ß`, Datum `TT.MM.JJJJ`, Beträge `CHF 12'000`.
- Warnzeichen und graue Ampel (RAG älter als 14 Tage) kommen aus den Fachregeln in `CLAUDE.md`, sind im Mockup nicht gezeigt.
- Detail: Beschreibung und Meilensteine links, Budget und Jira rechts, Archivieren als Textbutton unten rechts.
- Bearbeiten: Fieldsets Initiative, Status (RAG), Entscheid, Budget. Speichern in Navy, Abbrechen outline.
