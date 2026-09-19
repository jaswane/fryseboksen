# Fryseboksen.no

En norsk, mobilprioritert fryseroversikt med en gjennomarbeidet offentlig nettside.

## Kanonisk prosjekt

Dette er det permanente Git-repositoriet i `C:\_Nettsider\fryseboksen`. Åpne samme mappe direkte i Claude Code. Det finnes ingen separat prototype- eller Astra-versjon.

## Denne sprinten

Frontend-prototype med Next.js App Router, TypeScript og Tailwind. Landingsside, lokal demoapp og offentlige støttesider. Ingen ekte innlogging, database, Supabase, RLS, e-postutsending eller cron.

Demoen bruker en tydelig avgrenset data-adapter. Ingen brukerdata sendes til en tjeneste. Lokale endringer lagres bare i denne nettleseren. En egen tom fryser gjør det mulig å teste førstegangsopplevelsen.

## Kjør lokalt

- `npm ci`
- `npm run dev`
- Åpne adressen serveren oppgir (vanligvis http://localhost:3000).
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
- Browser-QA og testkommandoer dokumenteres etter gjennomført sprint.

## Dokumentasjon

- [Produktbeslutninger](docs/product-decisions.md)
- [Arkitektur og videre integrasjon](docs/architecture.md)
- [Designsystem og fontvurdering](docs/design-system.md)

## Leveransegrenser

Ikke push eller deploy uten en ny instruksjon. Ferdige fryserfilmer, ekte autentisering og backend er senere arbeid. Kontaktadressen hører kun til hovedinnholdet på kontaktsiden og skal aldri gjentas i globale komponenter, metadata eller schema.

