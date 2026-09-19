# Arkitektur

## Frontend nå

Ett Next.js App Router-prosjekt med TypeScript og Tailwind. Offentlige sider er serverkomponenter. Klientkomponenter er avgrenset til historieprogresjon, medieavspilling og appinteraksjoner.

Ingen autentisering, database, RLS, e-post eller cron. Demoens nettleserlagring er ikke en konto eller en sikkerhetsgrense.

## Lagdeling

1. Domene: fryser, innlegging, samlet vare, kommandoer, datoer og semantikk.
2. Adapterkontrakt: asynkrone lesinger/endringer og konkrete angrekvitteringer. Ingen Supabase-typer i kontrakten.
3. Lokal adapter: realistiske eksempeldata, egen tomtilstand, lokal lagring og feilhåndtering.
4. Applikasjonshook: valgt fryser, lasting, ventende handling, feilmelding og angre.
5. Presentasjon: formularer, varelinjer, søk, sortering og redigeringspanel. Kender ikke lagringsformat eller database.

## Domenevalg

Registreringer peker på fryser-ID. Normalisert navn + enhet + fryser grupperer varen visuelt. Innfrysingsdato og opprettelsestidspunkt er separate. Antall er heltall. Uttak er eldste innlegging først; ny innlegging får dagens Oslo-dato; korreksjon bevarer opprinnelig opprettelsestidspunkt.

Angre lagrer endringens før/etter-bilde på berørte registreringer og kontrollerer at senere endringer ikke overskrives. Demoens angre er kortvarig, ikke en permanent historikk.

## Supabase senere

Implementer samme adapterkontrakt via serverhandlinger/API-er som validerer identitet og tilgang. Kartlegg databasefelter til domenets modeller i adapteren. Bytt adapter i komposisjonsroten; behold presentasjonskomponentene.

Flytt autoritativ validering, Oslo-dato, atomisk uttak og konfliktkontroll til server/database. Lokal demo er ikke en sikker mal for flerenhetssynkronisering. Bruk idempotente kommandoer og serverutstedte angrekvitteringer. Gjenta adapterens kontrakttester mot backend.

Planlagt datamodell: auth.users, profiles, freezers, inventory_lots og reminder_deliveries. Ingen av disse opprettes i prototypen.

## Senere deling og RLS

Fryseren er tilgangsgrensen. Eierskap ligger på freezers.owner_id; ikke kopier dette som vareeierskap. Skill mellom lese innhold, endre innhold og administrere fryser. Senere freezer_members har unik fryser/bruker og gir rettigheter uten å flytte registreringene. Autorisasjon skal ikke avhenge av hvem som la inn varen.

RLS må håndheve lese/opprette/endre/slette og nye verdier, med tilgangskontroll i databasefunksjoner og visninger. Unngå rekursive policies mellom freezers/freezer_members. Administrative nøkler er kun for avgrenset serverarbeid.

Kontosletting får en eksplisitt serverflyt; vurder eierskifte før deling. Sletting av et medlems konto skal ikke slette den delte fryseren.

## Mediearkitektur

En scene-konfigurasjon beskriver posterbilder, mobil/desktop og eventuelle fremtidige videokilder. Mediekomponenten håndterer synlighet, redusert bevegelse, feil og utsatt lasting. Tekster og etiketter er HTML. Ingen video følger scrollposisjon kontinuerlig.

## Kilder

- https://nextjs.org/docs/app
- https://tailwindcss.com/docs/installation/framework-guides/nextjs
- https://supabase.com/docs/guides/database/postgres/row-level-security

