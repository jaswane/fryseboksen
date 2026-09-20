# Frontend-prototype – QA og overlevering

Kontrollert lokalt på Windows, med Node.js 24.15.0. Nettlesertestene kjører et faktisk Next.js-produksjonsbygg. Testdatoen er låst til 19. september 2026; demoen selv bruker dagens dato i Europe/Oslo.

## Resultater

| Sjekk                                    | Resultat                                                    |
| ---------------------------------------- | ----------------------------------------------------------- |
| ESLint                                   | Bestått                                                     |
| Prettier                                 | Bestått                                                     |
| TypeScript                               | Bestått                                                     |
| Next.js-produksjonsbygg                  | Bestått; alle sider prerendres                              |
| Domene, lokal adapter og scrollberegning | 29 av 29 bestått                                            |
| Playwright                               | 51 kontroller bestått; 17 scenarioer i tre nettleseroppsett |
| Axe                                      | Ingen rapporterte WCAG A/AA-brudd i de skannede tilstandene |
| Nettleserkonsoll                         | Ingen feil på de kontrollerte rutene                        |
| Git-diff                                 | Gjennomlest; whitespace-sjekk bestått                       |

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
- Scrollstyrt åpning, samme bilde mellom punkt 2 og 3, frontal vending mot punkt 4 og nøyaktig retur baklengs. Ingen tidsstyrt autoplay, video eller canvas i den gjeldende sekvensen.
- Statiske scener uten sekvensnedlasting ved redusert bevegelse; separate stillbilder også med JavaScript avslått. En feil i et mellomliggende bilde beholder siste komplette bilde, og senere scroll kan gå videre.
- Hopp til innhold, Tab gjennom modal, Escape, fokusretur, native dato-/antallfelt og navngitte ikonknapper.
- Horisontal overflow ved desktop/mobil; separat kontroll ved 320 px og 200 % tekstforstørring ved 760 px.

Et konsolltest-tilfelle lot full sidenavigering avbryte Next.js sin forhåndslasting, noe WebKit rapporterte som en access-control-feil. Rutetesten lar nå forhåndslastingen fullføres før neste dokumentnavigering. Ingen konsollfeil eller tilgjengelighetsregler filtreres bort.

## Visuell kontroll

Instrument Sans, Inter og IBM Plex Sans er sammenlignet med reelle norske tekster på desktop og mobil. Instrument Sans er valgt og begrunnet i design-system.md; prøven er tilgjengelig på `/design/typografi`.

Landingsside, app, Rediger og tomtilstand er inspisert som faktiske nettleserbilder ved desktop og 390 px. Kontrast og overflow ble rettet under QA. De opprinnelige SVG-illustrasjonene er erstattet av den godkjente Blender-modellen i en transparent scrollsekvens. Desktop bruker et større 16:9-utsnitt; mobil har et kvadratisk utsnitt av samme rendering.

## Medierevisjon 20. september 2026

73 Full-HD-renderinger (1920 × 1080), 73 desktop-WebP og 73 mobil-WebP er kontrollert. Alle har alpha; hele produktet inkludert åpent lokk er innenfor samtlige bilder. Minste luft over lokket er 5,5 %, og under produktet 9,5 %. Lokket går fra 0 til 95 grader, og er helt åpent fra bilde 49. `assets/freezer/scroll-v2/validation.json` inneholder resultatene. Begge nettvariantene samlet er 5 887 434 byte; nettleseren velger bare aktuell skjermvariant.

De opprinnelige 48 nettlesertestene ble kjørt samlet, deretter tre kontroller uten JavaScript. Etter full medieeksport og siste etikettjustering ble alle 21 berørte scroll-, fallback-, rute- og scenekontroller kjørt igjen. Ingen nye funksjonelle feil. Den faktiske siden er også prøvd med scroll begge veier, uendret vinkel mellom 2 og 3 og frontal sluttvinkel på desktop/mobil. Blender-filens renderutgang peker på egen `frames/`-mappe.

### Avslutning etter punkt 4

Fryserlaget, etikettene og fremdriftsmerkene klippes nå ved historiens nedre kant. Den mørkeblå seksjonen dekker dermed fryseren gradvis, og fryseren følger ikke med bak mobilen. `overflow: clip` beholder sticky-funksjonen uten å opprette en ny scrollbeholder. Overgangen og retur oppover er visuelt kontrollert ved 1440 × 1000 og 390 × 844; ingen horisontal overflow eller konsollfeil ble observert. Lint, typekontroll, produksjonsbygg, formatering og Git-whitespace-kontroll bestått. Alle 12 eksisterende medietester bestått i desktop Edge, mobil Chromium og mobil WebKit, inkludert reversering, redusert bevegelse og fallback uten JavaScript.

## Sluttkontroll av godkjent baseline, 20. september 2026

Lint, full formateringskontroll, produksjonsbygg og typekontroll er kjørt på nytt og bestått. Alle 29 domenetester og samtlige 51 nettleserkontroller er kjørt samlet på nytt og bestått, med desktop Edge, mobil Chromium og mobil WebKit. Ingen frontendkode ble endret i denne avsluttende kontrollen.

Blender-masterens mål, to kurver, lokk-klaring og AO-materialer er validert på nytt. Begge stillbilderevisjoner består format- og komposisjonskontroll (30 bildeeksporter), og alle fire bevarte videoer består full dekoding (96 bilder per video). Den gjeldende scrollsekvensen består kontroll av 73 Full-HD-kilder og 146 WebP-nettbilder med alpha og helt produkt innenfor utsnittet.

Diffen og filutvalget er gjennomgått før baseline-commit: prosjektets Blender-kilder, ferdige medier, scrollimplementasjon, tilhørende tester og dokumentasjon inngår. Rå rendersekvenser, previews, Blender-backuper, verktøymapper, bygg- og testutdata holdes utenfor Git. PDF-oppsummeringen ligger utenfor prosjektet og inngår ikke i commiten. Ingen push eller deploy.

## Kjente restpunkter

- Ytelses- og berøringskontroll på fysiske telefoner før offentlig pilot. Eventuelle selvstendige videoeksporter kan lages fra den bevarte Full-HD-sekvensen; nettsiden bruker alpha-WebP for reversering.
- Backend, Auth og RLS med servervalidering, transaksjoner, idempotens og varig konfliktkontroll. Se architecture.md.
- Demoen har ingen automatisk synkronisering mellom faner/enheter. Lokal lagring er ikke en sikkerhetsgrense, og Angre forsvinner ved omlasting.
- Personvern/vilkår er foreløpige demotekster. Ferdigstill dem mot den faktiske databehandlingen før offentlig pilot.
- Hele prototypen har `noindex`. Offentlig SEO, domene, drift og overvåking avklares ved lansering.
- Påminnelsen på forsiden er et tydelig merket eksempel. Ingen e-post, konto, deling eller andre funksjoner utenfor sprinten er aktive.

Ingen push eller deploy er utført. Kjør kommandoene i README for å gjenta kontrollene. Det permanente prosjektet er `C:\_Nettsider\fryseboksen`; samme mappe åpnes i Claude Code.
