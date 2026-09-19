# Fryseboksen.no

En norsk, mobilprioritert fryseroversikt med en gjennomarbeidet offentlig nettside.

## Kanonisk prosjekt

Dette er det permanente Git-repositoriet i `C:\_Nettsider\fryseboksen`. Åpne samme mappe direkte i Claude Code. Det finnes ingen separat prototype- eller Astra-versjon.

## Denne sprinten

Frontend-prototype med Next.js App Router, TypeScript og Tailwind. Landingsside, lokal demoapp og offentlige støttesider. Ingen ekte innlogging, database, Supabase, RLS, e-postutsending eller cron.

Demoen bruker en tydelig avgrenset data-adapter. Ingen brukerdata sendes til en tjeneste. Lokale endringer lagres bare i denne nettleseren. En egen tom fryser gjør det mulig å teste førstegangsopplevelsen.

## Kjør lokalt

Krever Node.js 22 eller nyere. Testet med Node.js 24.15.0 på Windows.

```sh
npm ci
npm run dev
```

Åpne http://127.0.0.1:3000. Serveren lytter bare lokalt.

| Rute                         | Innhold                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| `/`                          | Landingsside med syv scener og utskiftbare stillbilder           |
| `/app`                       | Lokal, interaktiv demo; bytt mellom eksempelvarer og tom fryser  |
| `/design/typografi`          | Faktisk sammenligning av Instrument Sans, Inter og IBM Plex Sans |
| `/guider`, `/om`, `/kontakt` | Enkle offentlige støttesider                                     |
| `/personvern`, `/vilkar`     | Foreløpige tekster som beskriver denne demoen                    |

## Sjekker

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
npx playwright install msedge webkit
npm run test:e2e
```

Microsoft Edge må være installert. Nettleserkommandoen installerer Edge dersom den mangler, og henter Playwright WebKit. Testene starter produksjonsbygget på lokal port 3100; porten må være ledig. De kjører desktop Edge, mobil Chromium og mobil WebKit med isolert nettleserlagring og fast testdato. Mobiltestene er emulering, ikke tester på fysiske telefoner.

`npm run format` formaterer kildekode og dokumentasjon. `npm run start` starter det ferdige produksjonsbygget lokalt. Ingen av kommandoene publiserer noe.

## Struktur

```text
src/app/                       Ruter, metadata og globale designstiler
src/components/site/           Merke, header, footer og offentlig sidemal
src/components/story/          Scroll-historie, mediekontrakt og mobilillustrasjon
src/components/ui/             Tilgjengelig dialog
src/features/inventory/        Domene, adapterkontrakt, lokal adapter og app
src/features/inventory/components/  Legg til, samlet varelinje og Rediger
public/media/                  Originale foreløpige fryserillustrasjoner
public/licenses/               Fontlisenser
tests/e2e/                     Nettlesertester av produktflyter og tilgjengelighet
docs/                          Beslutninger, arkitektur, design og QA
```

Start videre integrasjon i `src/features/inventory/adapter.ts` og les arkitekturdokumentet. `InventoryApp` mottar adapter og fryser-ID; `DemoApp` er den eneste komposisjonsroten som velger lokal lagring og demokontroller.

## Dokumentasjon

- [Produktbeslutninger](docs/product-decisions.md)
- [Arkitektur og videre integrasjon](docs/architecture.md)
- [Designsystem og fontvurdering](docs/design-system.md)
- [QA og gjenstående arbeid](docs/qa.md)

## Leveransegrenser

Ikke push eller deploy uten en ny instruksjon. Ferdige fryserfilmer, ekte autentisering og backend er senere arbeid. Kontaktadressen hører kun til hovedinnholdet på kontaktsiden og skal aldri gjentas i globale komponenter, metadata eller schema.
