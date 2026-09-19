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

En scene-konfigurasjon beskriver posterbilder, mobil/desktop og eventuelle fremtidige videokilder. Mediekomponenten håndterer synlighet, redusert bevegelse, feil og utsatt lasting. Tekster og etiketter er HTML. Ingen video følger scrollposisjon kontinuerlig.

Bytt `poster`/`mobilePoster` og eventuelt `sources`/`mobileSources` i `src/components/story/media-config.ts`. Video lastes først nær viewport, spiller uten lyd og uten løkke, og statisk bilde beholdes ved redusert bevegelse eller avspillingsfeil. Kun én video kan spille om gangen. Desktop bruker diskrete sceneskift med en sticky illustrasjon; mobil har en illustrasjon per scene. Mediekontrakten er forberedt, men ekte MP4/WebM-filer og avspillings-QA inngår i senere medieproduksjon.

## Kilder

- https://nextjs.org/docs/app
- https://tailwindcss.com/docs/installation/framework-guides/nextjs
- https://supabase.com/docs/guides/database/postgres/row-level-security
