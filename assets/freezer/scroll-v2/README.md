# Fryseboksen / transparent scrollsekvens V2

Samme godkjente Blender-modell, 85 × 77 × 56 cm og to kurver, nå med gjennomsiktig bakgrunn. Masterbildene er 1920 × 1080 (16:9). Ingen logoer. Myk produktbelysning, indirekte lys og subtil AO er bevart.

73 prerendrede posisjoner: 1–49 åpner lokket og løfter kameraet; 49 holdes gjennom nettstedets punkt 2 og 3; 50–73 dreier kameraet rett forfra, fortsatt med blikk ned i fryseren. Alle posisjonene kan vises i vilkårlig rekkefølge. Lokket er 95 grader åpent fra bilde 49. Hele fryseren og lokket er innenfor utsnittet i hver posisjon.

Matvarene har nå gjennomsiktig pose rundt brødet, lukket gjennomsiktig boks til bærene, lokk på lasagnen og beskyttende film over laksebrettet. Spørsmålstegn/navn er HTML, projisert fra Blender-posisjoner.

## Bruk på siden

`public/media/freezer-scroll` inneholder WebP med alpha: 1440 × 810 til desktop og 810 × 810 til mobil. Mobilvarianten beskjærer bare det tomme tekstområdet til venstre; hele produktet beholdes. Nettstedet bruker sin eksisterende blågrå bakgrunn `#E8EFEE` direkte gjennom de gjennomsiktige pikslene. Den brede, svake tonen fra shadow-catcher-gulvet fjernes i eksporten; en dempet kontaktskygge beholdes. Produktets ugjennomsiktige piksler endres ikke.

WebP-sekvensen er valgt for baklengs bevegelse og gjennomsiktighet uten videoseeking, WebGL eller Three.js. Ingen animasjon går på tid. Full HD-mastere og den animerte `.blend`-filen beholdes for senere videoutgaver. Nettstedets bilder lastes etter behov; redusert bevegelse eller JavaScript avslått gir separate stillbilder.

## Reproduksjon

Kjør fra prosjektroten med Blender 5.2 og Python med Pillow:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background assets/freezer/fryseboksen-master.blend --python-exit-code 1 --python assets/freezer/render_scroll.py -- --frames all
python assets/freezer/package_scroll.py
python assets/freezer/verify_scroll.py
```

`--preview` lager 960 × 540-kontrollbilder. `--device CPU` fungerer uten Intel oneAPI. Rendringen hopper over filer som allerede finnes; bruk en ny revisjonsmappe ved endringer i geometri, kamera eller lys, slik at gamle og nye bilder ikke blandes. Råbilder ligger i ignorerte `frames/`-mapper. Kilde, leveransebilder, koordinater og dokumentasjon ligger i det kanoniske repositoriet.
