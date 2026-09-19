# Produktbeslutninger

Godkjent 19. september 2026. Frontend-prototypen bygges i det kanoniske repositoriet.

## FINAL V1 DECISIONS

1. Gratis, mobilprioritert fryseroversikt. Første pilot har én automatisk opprettet fryser og ingen familiedeling. Prototypen tilbyr separat eksempeltilstand og tomtilstand for evaluering; det er ikke en implementert flerbrukerløsning.
2. Ett Next.js App Router-/TypeScript-prosjekt med Tailwind. Planlagt senere backend er Supabase Auth/PostgreSQL/RLS, Resend og Vercel Cron. Ingen av backendtjenestene implementeres i denne sprinten.
3. Offentlig kontaktadresse skal kun forekomme i hovedinnholdet på /kontakt. Header, footer, /om, personvern, vilkår, metadata, schema og globale datafiler henviser til /kontakt uten adressen.
4. Registreringer tilhører fryseren. freezers.owner_id angir eierskap. Senere freezer_members kan utvide tilgang uten flytting av varedata. Medlemskap og RLS implementeres ikke nå.
5. Minus tar én enhet fra eldste tilgjengelige innlegging, ordnet på innfrysingsdato, opprettelsestidspunkt og stabil ID.
6. Pluss på en eksisterende vare registrerer én ny enhet med dagens innfrysingsdato (Europe/Oslo) og et nytt opprettelsestidspunkt.
7. Rediger korrigerer eksisterende innlegging. Opprettelsestidspunkt beholdes, endringstidspunkt oppdateres. Ingen fiktive innkjøps-/uttakshendelser og ingen løfting i «Nylig lagt til».
8. Angre reverserer den konkrete handlingen med opprinnelige datoer. Angre minus er ikke pluss. Konflikter skal oppdages, ikke overskrive senere endringer.
9. Samme normaliserte navn og enhet i samme fryser vises som én samlet varelinje. Datoer bevares på innleggingene. Ordet lot skal ikke brukes i brukergrensesnittet.
10. Hele tellbare enheter. Ingen desimaler eller enhetskonvertering.
11. Bruk dette først baseres på eldste registrerte innfrysingsdato. Ingen utløpsdato, mattrygghetsvurdering eller faresignaler. Senere holdbarhetsstoff er redaksjonelt/kildebelagt.
12. Visuell retning: stram, nordisk premium, kjølig palett, presis typografi og luft. Ingen kopiering av Polestars identitet/proprietære font.
13. Instrument Sans er valgt etter visuell sammenligning med Inter og IBM Plex Sans på desktop og mobil, med faktiske norske overskrifter, varenavn, datoer og antall. Sammenligningen beholdes på /design/typografi. Alle fontene lastes lokalt og lisensene bevares.
14. Landingsside med prerendrede stillbilder/korte MP4-/WebM-klipp og HTML/CSS-overlays. Ingen WebGL, Three.js eller kontinuerlig scroll-scrubbing. Respekter redusert bevegelse. Foreløpige stillbilder brukes i prototypen.
15. Ett kanonisk Git-repository i C:\_Nettsider\fryseboksen, åpnet direkte i Claude Code senere. Ingen separat prototype/Astra-mappe.
16. Månedlig anbefalt påminnelsesfrekvens ved aktivt valg; ukentlig/av senere. Prototype sender ingenting.

## Offentlige ruter

/, /guider, /om, /kontakt, /personvern, /vilkar.
Demo-inngang går direkte til /app. Ingen ekte auth eller falsk innloggingsflyt.

## Sprintens avgrensning

Komplett frontend: historie, demoapp, tomtilstand, støttesider og fontprøve. Ikke Supabase, database, RLS, Resend, cron, familiedeling, AI, tale, strekkoder, oppskrifter, betaling, affiliate eller ferdige filmer.

## Tomtilstand

«Begynn med neste vare du legger i fryseren. Du trenger ikke registrere alt nå.»

## Godkjenningskrav

Lint, typecheck, build, desktop/mobil, add/edit/delete/search/sort, flere innfrysingsdatoer, pluss/minus/angre, tomtilstand, overflow, console, tastatur/fokus, redusert bevegelse og gjennomlest Git-diff.
