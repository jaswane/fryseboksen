# Arkitektur

## Frontend nå

Ett Next.js App Router-prosjekt med TypeScript og Tailwind. Offentlige sider er serverkomponenter. Klientkomponenter er avgrenset til historieprogresjon, medieavspilling og appinteraksjoner.

Ingen autentisering, database, RLS, e-post eller cron. Demoens nettleserlagring er ikke en konto eller en sikkerhetsgrense.

## Lagdeling

1. Domene: fryser, innlegging, samlet vare, kommandoer, datoer og semantikk.
2. Adapterkontrakt: asynkrone lesinger/endringer og konkrete angrekvitteringer. Ingen Supabase-typer i kontrakten.
3. Lokal adapter: realistiske eksempeldata, egen tomtilstand, lokal lagring og feilhåndtering.
4. Applikasjonshook: valgt fryser, lasting, ventende handling, feilmelding og angre.
5. Presentasjon: skjemaer, varelinjer, søk, sortering og redigeringspanel. Kjenner ikke lagringsformat eller database.

## Domenevalg

Registreringer peker på fryser-ID. Normalisert navn + enhet + fryser grupperer varen visuelt. Innfrysingsdato og opprettelsestidspunkt er separate. Antall er heltall. Uttak er eldste innlegging først; ny innlegging får dagens Oslo-dato; korreksjon bevarer opprinnelig opprettelsestidspunkt.

Angre lagrer endringens før/etter-bilde på berørte registreringer og kontrollerer at senere endringer ikke overskrives. Demoens angre er kortvarig, ikke en permanent historikk.

## Supabase senere

Implementer samme adapterkontrakt via serverhandlinger/API-er som validerer identitet og tilgang. Kartlegg databasefelter til domenets modeller i adapteren. Bytt adapter i komposisjonsroten; behold presentasjonskomponentene.

Kontrakten i `src/features/inventory/adapter.ts` har `listFreezers()`, `getInventory(freezerId)`, `execute(command)` og `undo(receipt)`. Endringer returnerer autoritativt snapshot, statusmelding og eventuell ugjennomsiktig angrekvittering. UI-et importerer ingen databaseklient eller databasetyper.

`DemoApp` i `src/features/inventory/inventory-app.tsx` oppretter `LocalInventoryAdapter` og sender demoens valg/tilbakestilling som valgfrie props. Senere oppretter en ny komposisjonsrot den eksterne adapteren og sender inn den innloggede brukerens fryser-ID til samme `InventoryApp`, uten `demo`-prop. Auth legges rundt appens inngang; den skal ikke bygges inn i varelinjer eller redigeringsskjemaer.

Flytt autoritativ validering, Oslo-dato, atomisk uttak og konfliktkontroll til server/database. Lokal demo er ikke en sikker mal for flerenhetssynkronisering. Bruk idempotente kommandoer og serverutstedte angrekvitteringer. Gjenta adapterens kontrakttester mot backend.

Ved integrasjon:

1. Opprett migrasjoner for fryser og innlegginger; bevar skillet mellom `frozenOn` (dato), `createdAt` og `updatedAt` (tidspunkter). Kartlegg feltnavn i adapteren.
2. Implementer Auth og eierbasert RLS med fryseren som tilgangsgrense. Ingen tillit til bruker-/fryser-ID fra klienten alene.
3. Gjør pluss, FIFO-minus, Rediger og Angre atomiske på serveren. Bruk versjonssjekk, låsing og idempotens ved nettverksretry. RLS må også gjelde databasefunksjoner og nye verdier ved oppdatering.
4. Returner samme domenemodeller og forståelige feil gjennom adapterkontrakten. UI-et venter på bekreftet resultat før det viser endringen.
5. Test parallelle uttak, doble forespørsler, utløpt innlogging, forbudt tilgang, nettverksbrudd og angrekonflikter mot ekte backend. Kjør de eksisterende brukerflytene videre.
6. Vurder synkronisering ved gjenåpning/fokus eller realtime i adapter/applikasjonshook. Dette er ikke implementert i den lokale demoen.

Demolagring skal ikke automatisk importeres til en ekte konto. En eventuell senere import trenger en eksplisitt produktbeslutning.

## Lokale lagringsgrenser

Demoen bruker `localStorage` med versjonert nøkkel `fryseboksen.demo.v1`. Hver endring leser fersk lokal tilstand. Lagrede data valideres; full/blokkert lagring gir en synlig feil og endringen vises ikke som lagret. `resetDemo()` finnes kun på den konkrete lokale adapteren.

Angrekvitteringer lever i minnet for den åpne appen. UI-et tilbyr siste handling frem til neste handling, fryserbytte, lukking av meldingen eller omlasting. Underliggende adapter begrenser kvitteringer til 30 og kontrollerer berørte før/etter-verdier. Ingen revisjonslogg opprettes. Endringer i ulike nettleserfaner er ikke transaksjonssikre, og appen har ingen automatisk synkronisering mellom faner.

Varegruppering er en presentasjonsregel basert på fryser, normalisert navn og enhet. Rediger kan derfor samle to varer dersom korrigert navn og enhet blir identiske. Alle innfrysingsdatoer beholdes. Null i en eksisterende innlegging fjerner feilregistreringen; nyregistrering krever minst én.

Planlagt datamodell: auth.users, profiles, freezers, inventory_lots og reminder_deliveries. Ingen av disse opprettes i prototypen.

## Senere deling og RLS

Fryseren er tilgangsgrensen. Eierskap ligger på freezers.owner_id; ikke kopier dette som vareeierskap. Skill mellom lese innhold, endre innhold og administrere fryser. Senere freezer_members har unik fryser/bruker og gir rettigheter uten å flytte registreringene. Autorisasjon skal ikke avhenge av hvem som la inn varen.

RLS må håndheve lese/opprette/endre/slette og nye verdier, med tilgangskontroll i databasefunksjoner og visninger. Unngå rekursive policies mellom freezers/freezer_members. Administrative nøkler er kun for avgrenset serverarbeid.

Kontosletting får en eksplisitt serverflyt; vurder eierskifte før deling. Sletting av et medlems konto skal ikke slette den delte fryseren.

## Mediearkitektur

### Gjeldende løsning: reversibel scroll, 20. september 2026

Brukerens siste revisjon erstatter avgrensningen mot scrollstyring. `freezer-story.tsx` samler punkt 1–4 rundt én sticky fryser. Desktop har 16:9-flate ved siden av teksten; mobil har et kvadratisk mediefelt over teksten. Sidens eksisterende blågrå `#E8EFEE` er bakgrunn gjennom hele fortellingen.

`scroll-timeline.ts` beregner ønsket bilde og fargeovergang direkte fra seksjonenes posisjon i dokumentet. Bilde 1 er lukket, 49 er åpent, og 73 er rett forfra. Mellom punkt 2 og 3 holdes kamera 49, mens et separat bilde av samme innhold med farger (`0049-known`) blandes inn og spørsmålstegn erstattes av varenavn. Mellom 3 og 4 dreies kameraet og løftes subtilt fra 58° til 63°. Scroll opp bruker nøyaktig samme beregning baklengs, uten tidsstyrt avspilling, scroll-låsing eller ekstra treghet.

`scene-media.tsx` laster og dekoder ønsket WebP før bildet byttes. Nærmeste nabobilder forberedes; siste komplette bilde beholdes ved feil eller rask scroll. Utdaterte asynkrone svar får ikke skrive over nyere scrollposisjoner. Mediebeskrivelsen ligger i `media-config.ts`. `story-annotations.tsx` plasserer HTML-tekst i luftrommet rundt produktet; de genererte Blender-ankrene i `scroll-anchors.json` holder SVG-linjenes endepunkter ved riktig matvare under kamerabevegelsen.

Fargevarianten klargjøres ved bilde 49. Hvis den ikke kan dekodes, beholdes anonymt innhold og spørsmålstegn. `scroll-reveal-mask.json` er fryseråpningen projisert fra Blender. Den brukes som CSS-klipp for fargelaget, slik at produktets alpha-skygge ikke legges dobbelt. Desktop og mobil regner fra de samme normaliserte koordinatene. Stillbilder ved redusert bevegelse eller uten JavaScript velger anonymt bilde i punkt 2 og farget bilde i punkt 3 direkte.

Klistremerket er et fysisk UV-mappet objekt på fronten av Blender-modellen. `build_sticker_v3.py` lager grafikken fra lokale fonter og prosjektets kubeikon. `render_sticker_v3.py` rendrer merket separat med samme lys og kamera; `package_scroll_v3.py` krever og legger inn dette passet før WebP-eksport. Merket er dermed bakt inn i alle ferdige stillbilder og scrollbilder. Nettleseren plasserer ikke et løst HTML-merke over fryseren. QR-grafikken peker på prosjektets rotadresse; ingen QR-/innloggingsfunksjon er implementert.

Gjennomsiktig WebP-sekvens er valgt fordi samme prerendrede 3D-modell kan vises presist begge veier og legges direkte over CSS-bakgrunnen. Ingen videokodek med alpha er nødvendig, og ingen WebGL, Three.js eller canvas brukes. Masterne er Full HD 1920 × 1080; nettutgavene er 1440 × 810 / 810 × 810. Mobileksporten fjerner det tomme tekstområdet til venstre, ikke produktet. Nettleseren bruker kun varianten som passer skjermen. Bare faktiske scrollendringer oppdaterer visningen, via én requestAnimationFrame per hendelsesrunde.

`prefers-reduced-motion` og JavaScript avslått gir separate stillbilder per seksjon. Tekst, CTA-er og innhold er serverrendret. `journey.css` eier den nye layouten; prototypeklassene i `site.css` er ikke avhengigheter for scrollberegningen.

Den nye visuelle revisjonen ligger under `assets/freezer/scroll-v3`, med render-, pakke- og valideringsskript suffiksert `_v3.py`. Nettbildene ligger i `public/media/freezer-scroll-v3`. V3 tar den godkjente V2-scenen som inngang og oppdaterer matbeholdere, matmaterialer, siste kamerabevegelse og det fysiske klistremerket. Den opprinnelige masteren, V1-filmene og godkjent V2-baseline er bevart. V3, språkendringene og annotasjonsrevisjonen ble godkjent som én lokal baseline 20. september 2026. Senere endringer i geometri/kamera/lys eksporteres som en ny revisjon slik at ferdigrendrede bilder ikke blandes med gamle.

### Historikk: den første videotesten

Bytt `poster`/`mobilePoster` og eventuelt `sources`/`mobileSources` i `src/components/story/media-config.ts`. Video lastes først når minst 25 % av medieflaten er synlig, spiller uten lyd og uten løkke, og statisk bilde beholdes ved redusert bevegelse eller avspillingsfeil. Video pauser utenfor viewport og beholder sluttbildet ved retur. Pause/fortsett/replay er tilgjengelig med tastatur. Kun én video kan spille om gangen. Desktop bruker diskrete sceneskift med en sticky illustrasjon; mobil har en illustrasjon per scene.

### Første lokale animasjonstest, 20. september 2026 (erstattet)

Hero bruker firesekundersklippet fra `assets/freezer/animation-v1`, kopiert til `public/media/freezer` som WebM og MP4. MP4 er førstevalg etter avspillingskontroll i WebKit; WebM følger som alternativ kilde. Startbildet er den godkjente hero-vinkelen. Dette prøveklippet har spørsmålstegn bakt inn; historien bruker det rene sluttbildet med HTML-etiketter. Neste medieversjon kan bruke det rene klippet og `overlay-track.json` for HTML-markører også under bevegelsen. Ingen backend, canvas, WebGL eller scroll-scrubbing er lagt til.

Mediene vises kvadratisk med `object-fit: contain`, uten ytterligere beskjæring. Desktopstørrelsen tilpasses også skjermhøyden. Dette gjenoppretter ikke innhold som mangler i selve renderingen: det åpne lokket går fortsatt ut over øvre bildekant. Den grå studiobakgrunnen er beholdt slik at den kan vurderes ærlig mot sidens `#F3F5F4` og historieseksjonens `#E8EFEE`.

Neste Blender-revisjon etter vurdering på siden: mer luft rundt hele lokkbevegelsen; lysere/matchet studiobakgrunn med de myke skyggene bevart; gjennomsiktig lukket boks til bær, gjennomsiktig pose rundt brød og lokk/emballasje på lasagnen. Ingen matgeometri eller nye renderinger er laget i denne integrasjonstesten.

Verifisert lokalt: lint, typecheck, produksjonsbygg og formatering av endrede filer; 18 målrettede Playwright-kontroller på desktop Edge, mobil Chromium og mobil WebKit. Kontrollene dekker avspilling én gang, bevart sluttbilde, tastaturstyrt replay/pause, redusert bevegelse uten videonedlasting, sceneskift, ruter, tilgjengelighet, konsoll og horisontal overflow. Desktop og 390 px mobilbredde er også vurdert visuelt i nettleseren. Ingen push eller deploy.

## Kilder

- https://nextjs.org/docs/app
- https://tailwindcss.com/docs/installation/framework-guides/nextjs
- https://supabase.com/docs/guides/database/postgres/row-level-security
