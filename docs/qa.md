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
| Playwright                               | 66 kontroller bestått; 22 scenarioer i tre nettleseroppsett |
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
- Scrollstyrt åpning, samme kamera mellom punkt 2 og 3 med reverserbar fargeavsløring, frontal vending mot punkt 4 og nøyaktig retur baklengs. Ingen tidsstyrt autoplay, video eller canvas i den gjeldende sekvensen.
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

## Visuell revisjon V3, 20. september 2026

Målrettet endring av plastbokser, anonyme/fargede matmaterialer, etiketter og sluttkamera. Et fysisk klistremerke på 12 × 14 cm er plassert øverst til høyre på fronten og følger samtlige kameravinkler. Den pakkede Blender-masteren inneholder merket og teksturen; nettbilder og fire stillbilder har samme Blender-renderte merkepass.

Lint, formatering, produksjonsbygg, typekontroll og 29 enhetstester består. Alle 18 nettleserscenarioer er kontrollert i desktop Edge, mobil Chromium og mobil WebKit: totalt 54 beståtte kontroller, kjørt i grupper. Tre rutekontroller ble først kjørt før mellomrute 0002 var eksportert og fant denne reelle 404-feilen. Etter eksport består alle tre uten filtrering av konsollfeil. Den nye feiltesten bekrefter at en manglende fargevariant beholder anonymt innhold og spørsmålstegn, uten feilaktig oversiktstilstand.

`scroll-v3/validation.json` bekrefter 74 Full-HD-kilder og 148 alpha-WebP-eksporter (6 030 470 byte samlet for begge skjermvarianter). Alle produktutsnitt er innenfor bildet, med minst 4,25 % luft øverst og 8,25 % nederst. Scene 2/3 deler bilde 49 og 58° kamerahøyde; scene 4 er 63°. Fargeavsløringen beholder identisk silhuett og plassering. Alle 73 merkepass har riktig format og gyldig plassering.

`scroll-v3/model-validation.json` bekrefter at 159 objekter i selve fryseren er geometrisk uendret fra V2: 85 × 77 × 56 cm, to kurver, samme tre studiolys og fire AO-noder. Perspektivkameraet er fortsatt 52 mm. Ingen endring i appens data, adapter eller backend.

De endelige scenene er inspisert på siden ved 1440 × 1000 og 390 × 844. Merket er diskret i hero og beholder samme fysiske plassering i de åpne scenene. Spørsmålstegn, navn og prioriteringstekst er kontrollert for lesbarhet. Hele lokket vises, og historien klippes fortsatt før mobilseksjonen. V3 ble deretter godkjent sammen med språkendringene og annotasjonsrevisjonen nedenfor.

## Eksterne annotasjoner, 20. september 2026

Avgrenset revisjon oppå lokal V3. Tre spørsmålstegn/varenavn flyttes ut i luftrommet og knyttes til de eksisterende matankrene med tynne SVG-linjer. Prioriteringen flyttes bort fra lokket. Ingen endring i Blender, nettmedier, kamera, fargeavsløring, scrollberegning, språkvasket tekst, navigasjon, footer, app eller dataadapter. SHA-256-sammenligning mot starten av denne revisjonen bekrefter dette.

Lint, full formateringskontroll, produksjonsbygg, typekontroll og 29 enhetstester består. 36 berørte nettleserkontroller består, kjørt i to grupper: 27 annotasjons-/mediekontroller og 9 rute-, overflow- og tilgjengelighetskontroller. Nettlesere: desktop Edge, mobil Chromium og WebKit. Ingen konsollfeil i rutetesten og ingen Axe-brudd i de skannede tilstandene.

Nye kontroller dekker identiske tekstposisjoner/linjer gjennom scene 2–3, kantklaring og ingen kollisjon med fortellerteksten ved 320, 390, 1024 og 1440 px, og statiske scener med redusert bevegelse og JavaScript avslått. Eksisterende medietester bekrefter scroll i begge retninger, samme bilde 49 mellom scene 2–3, og gjenoppretting etter bildefeil. Desktopscene 2, 3 og 4, mobil 390/320 og statiske reservevisninger er også inspisert visuelt.

200 % tekstforstørring er kontrollert ved de fire breddene med fast layout-viewport (`isMobile: false`), slik at tekstforstørring måles separat fra mobilens visuelle panorering. Annotasjonene holder seg innenfor bredden og overlapper ikke fortellerteksten. **Dette er ikke en bekreftelse på at hele siden består 200 % på smal mobil:** kombinasjonen 320 px og 200 % avdekket eksisterende overflow i blant annet header, produkt-/påminnelsesseksjon og footer, samt klipping av lange overskriftsord. I mobil-Chromium utvider dette layout-viewport og kan panorere den synlige flaten forbi det klebrige bildet. Dette er dokumentert, ikke skjult gjennom CSS eller endring av scrollfunksjonen. De berørte sideregionene er utenfor denne annotasjonsrevisjonen og er bevart etter avgrensningen.

Mobilkompromiss: to eksterne varenavn ved 320 px (lasagneannotasjonen skjules), og prioritering under produktet med én diskret linje. Ved 390 px med normal tekst vises alle tre. Fysiske telefoner er ikke testet.

Diffen mot lokal V3 er gjennomlest. Denne annotasjonskontrollen ble avsluttet før godkjenning, med lokale endringer oppå `3f802a5ee61dba1d3c05e4424093029ad3c7647f`. Tidligere V3- og språkendringer ble bevart.

## Avsluttende QA av godkjent V3-baseline, 20. september 2026

Brukeren har godkjent V3, språkendringene og annotasjonene i scene 2–4 som én ferdig lokal baseline. Ingen visuelle endringer er gjort under sluttkontrollen. SHA-256-kontroll bekrefter at frontendkode, tester, Blender-master, geometri, kamera, medier og valideringsdata er identiske med den godkjente leveransen. Dokumentasjonens godkjenningsstatus, QA-resultater og eksplisitte restpunkter er oppdatert. Én ekstra tom sluttlinje er fjernet fra eksportskriptet; Python-syntakstreet er kontrollert uendret.

Lint, full formateringskontroll, produksjonsbygg, typekontroll og alle 29 enhetstester består på nytt. Hele Playwright-pakken er kjørt samlet: **66 av 66 bestått**, fordelt på desktop Edge, mobil Chromium og mobil WebKit. Dette inkluderer appinteraksjoner, datoer/pluss/minus/angre, tastatur/fokus, ruter, konsoll, Axe, scroll frem og tilbake, fargeavsløring, responsive annotasjoner, redusert bevegelse og JavaScript avslått. Begrensningen for kombinert smal mobil og 200 % tekst nedenfor er fortsatt åpen; testresultatene erstatter ikke dette restpunktet.

V3-medievalideringen består på nytt for 74 Full-HD-kilder, 148 nettbilder med alpha, fire Full-HD-stillbilder og 73 merkepass. Hele produktet ligger innenfor utsnittet. Blender-valideringen bekrefter samme 159 fryserobjekter som V2, mål 85 × 77 × 56 cm, to kurver, tre uendrede studiolys, fire AO-noder og perspektivkamera på 52 mm. Fargeavsløringen endrer ikke objekt- eller kameraposisjoner.

Hele diffen og alle nye prosjektfiler er gjennomgått for den samlede lokale baseline-commiten. Bare V3-medier/Blender-kilder, språk-/footerendringer, annotasjoner, tester og tilhørende dokumentasjon inngår. Rå rendersekvenser, previews, backuper, bygg- og testutdata og eksterne rapporter holdes utenfor. V2-baseline `3f802a5` bevares i Git-historikken. Ingen push eller deploy.

## Kjente restpunkter

- **Senere frontend/QA-sprint: smal mobil + 200 % tekst.** Kombinasjonen kan gi overflow i header, produkt-/påminnelsesseksjon og footer, klipping av lange overskriftsord og forskjøvet synlig scrollflate i mobil-Chromium. Problemet er uttrykkelig ikke rettet eller lukket i denne baseline. En senere sprint må kontrollere hele siden med faktisk mobil-viewport, tekstforstørring og fysisk telefon, og legge til en regresjonstest for kombinasjonen uten å endre den nå godkjente komposisjonen utilsiktet.
- Ytelses- og berøringskontroll på fysiske telefoner før offentlig pilot. Eventuelle selvstendige videoeksporter kan lages fra den bevarte Full-HD-sekvensen; nettsiden bruker alpha-WebP for reversering.
- Backend, Auth og RLS med servervalidering, transaksjoner, idempotens og varig konfliktkontroll. Se architecture.md.
- Demoen har ingen automatisk synkronisering mellom faner/enheter. Lokal lagring er ikke en sikkerhetsgrense, og Angre forsvinner ved omlasting.
- Personvern/vilkår er foreløpige demotekster. Ferdigstill dem mot den faktiske databehandlingen før offentlig pilot.
- Hele prototypen har `noindex`. Offentlig SEO, domene, drift og overvåking avklares ved lansering.
- Påminnelsen på forsiden er et tydelig merket eksempel. Ingen e-post, konto, deling eller andre funksjoner utenfor sprinten er aktive.

Ingen push eller deploy er utført. Kjør kommandoene i README for å gjenta kontrollene. Det permanente prosjektet er `C:\_Nettsider\fryseboksen`; samme mappe åpnes i Claude Code.
