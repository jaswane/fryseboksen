# Frontend-prototype – QA og overlevering

Kontrollert lokalt på Windows, med Node.js 24.15.0. Nettlesertestene kjører et faktisk Next.js-produksjonsbygg. Testdatoen er låst til 19. september 2026; demoen selv bruker dagens dato i Europe/Oslo.

## Resultater

| Sjekk                        | Resultat                                                    |
| ---------------------------- | ----------------------------------------------------------- |
| ESLint                       | Bestått                                                     |
| Prettier                     | Bestått                                                     |
| TypeScript                   | Bestått                                                     |
| Next.js-produksjonsbygg      | Bestått; alle sider prerendres                              |
| Domenetester / lokal adapter | 26 av 26 bestått                                            |
| Playwright                   | 39 av 39 bestått; 13 scenarioer i tre nettleseroppsett      |
| Axe                          | Ingen rapporterte WCAG A/AA-brudd i de skannede tilstandene |
| Nettleserkonsoll             | Ingen feil på de kontrollerte rutene                        |
| Git-diff                     | Gjennomlest; whitespace-sjekk bestått                       |

Nettleseroppsett: desktop Microsoft Edge 1440 × 1000, mobil Chromium 390 × 844 med berøring, og mobil WebKit med iPhone 13-emulering. Mobil er ikke kontrollert på fysisk iOS-/Android-maskinvare. Axe er en automatisk kontroll, ikke en full tilgjengelighetsrevisjon.

## Testet atferd

- Én samlet kjøttdeiglinje med to pakker fra 12. januar og én fra nyere dato.
- Minus tar den eldste innleggingen, og går videre til neste dato når den første er brukt opp.
- Pluss oppretter en ny innlegging med dagens Oslo-dato, også når en innlegging fra i dag finnes fra før.
- Angre gjenoppretter faktisk antall, ID og dato; overskriver ikke senere endringer på berørte innlegginger.
- Rediger korrigerer antall/dato/navn/enhet uten å endre opprettelsestid eller flytte varen til toppen av «Nylig lagt til».
- Slett/angre, null som korreksjon, navneendring, enheter, normalisering, validering, konfliktkontroll og gjentatte uttak.
- Tom fryser, innlegging med valgt dato, bruk av siste enhet og angre tilbake fra tomtilstand.
- Søk med norsk tekst, begge sorteringer, tilbakestilling og data etter omlasting.
- Full/blokkert lokal lagring: synlig feil, beholdt skjema og ingen falsk bekreftelse.
- Alle offentlige ruter, én synlig kontaktadresse kun i kontaktinnholdet, ingen adresse i head/header/footer.
- Diskrete sceneskift og alle syv historiedeler ved redusert bevegelse; ingen video eller canvas i denne leveransen.
- Hopp til innhold, Tab gjennom modal, Escape, fokusretur, native dato-/antallfelt og navngitte ikonknapper.
- Horisontal overflow ved desktop/mobil; separat kontroll ved 320 px og 200 % tekstforstørring ved 760 px.

Et konsolltest-tilfelle lot full sidenavigering avbryte Next.js sin forhåndslasting, noe WebKit rapporterte som en access-control-feil. Rutetesten lar nå forhåndslastingen fullføres før neste dokumentnavigering. Ingen konsollfeil eller tilgjengelighetsregler filtreres bort.

## Visuell kontroll

Instrument Sans, Inter og IBM Plex Sans er sammenlignet med reelle norske tekster på desktop og mobil. Instrument Sans er valgt og begrunnet i design-system.md; prøven er tilgjengelig på `/design/typografi`.

Landingsside, app, Rediger og tomtilstand er inspisert som faktiske nettleserbilder ved 1440 og 390 px. Kontrast og overflow ble rettet under QA. Endelige frysermedier er bevisst erstattet av originale, enkle SVG-stillbilder.

## Kjente restpunkter

- Ekte fryserrender/stillbilder og korte MP4/WebM-klipp, med avspillings- og ytelseskontroll på fysiske telefoner.
- Backend, Auth og RLS med servervalidering, transaksjoner, idempotens og varig konfliktkontroll. Se architecture.md.
- Demoen har ingen automatisk synkronisering mellom faner/enheter. Lokal lagring er ikke en sikkerhetsgrense, og Angre forsvinner ved omlasting.
- Personvern/vilkår er foreløpige demotekster. Ferdigstill dem mot den faktiske databehandlingen før offentlig pilot.
- Hele prototypen har `noindex`. Offentlig SEO, domene, drift og overvåking avklares ved lansering.
- Påminnelsen på forsiden er et tydelig merket eksempel. Ingen e-post, konto, deling eller andre funksjoner utenfor sprinten er aktive.

Ingen push eller deploy er utført. Kjør kommandoene i README for å gjenta kontrollene. Det permanente prosjektet er `C:\_Nettsider\fryseboksen`; samme mappe åpnes i Claude Code.
