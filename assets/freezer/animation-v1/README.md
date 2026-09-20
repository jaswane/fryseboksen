# Fryseboksen – åpning og innhold

Fire sekunders animasjon av den godkjente Blender-modellen fra stillbilderevisjon V2. Den starter i nøyaktig samme hero-kamera, åpner lokket fra 0 til 95 grader og løfter kameraet før en rolig bevegelse nærmere maten. Tre spørsmålstegn kommer inn etter tur. Den siste delen holdes stille slik at innholdet kan leses.

Dette er en asset-leveranse i det kanoniske prosjektet `C:\_Nettsider\fryseboksen`. Nettstedet er ikke endret.

## Filer

- `fryseboksen-opening-questions.mp4` og `.webm`: ferdig klipp med spørsmålstegn.
- `fryseboksen-opening-clean.mp4` og `.webm`: samme klipp uten grafikk.
- `fryseboksen-opening.blend`: redigerbar animasjon med kamera og lokk.
- `poster-hero`, `poster-questions`, `poster-content-clean`: stillbilder i PNG og WebP.
- `overlay-track.json`: normaliserte posisjoner, størrelse og opasitet for spørsmålstegnene, bilde for bilde.
- `timeline.json`: kamera, lokkvinkel og markørankere gjennom hele bevegelsen.
- `animation-validation.json`: kontroll av alle 96 posisjoner, kamerasamsvar og klaring mot kurvene.
- `video-validation.json`: kontroll av de kodede videofilene.
- `storyboard.jpg`: utvalgte bilder gjennom sekvensen.
- `review.html`: lokal avspiller med vanlig videokontroll og valg av ren variant.

## Uttrykk og teknikk

1080 × 1080, 24 fps, 96 bilder, 4 sekunder, uten lyd. MP4 bruker H.264/yuv420p med faststart; WebM bruker VP9. Klippet har ingen automatisk loop.

Geometri, matvarer, materialer, lysrigg og fargestyring er hentet fra den godkjente V2-modellen. Cycles med 64 samples, adaptiv sampling, denoising og subtil AO. Ingen generativ bildegenerering brukes. Det øverste av lokket går bevisst ut av utsnittet når oppmerksomheten flyttes til maten.

Et preview avdekket en feilaktig selvskygge på lokket med bevegelsesuskarphet og persistent render-cache aktivert samtidig på Intel oneAPI. Begge innstillingene er slått av, og den korrigerte varianten er kontrollert. Fast støymønster og identiske stillbilder i de planlagte holdene hindrer støyvandring når kameraet står stille. Ingen bevegelige bilder erstattes med kopier: bare de stillestående bildene 1–4 og 82–96 deles.

Spørsmålstegnene er vanlig 2D-grafikk med posisjoner projisert fra de samme matvarene i 3D-scenen. Instrument Sans og lisensen følger med. De er bakt inn i `questions`-klippet, men er ikke Blender-geometri. `clean`-klippet og JSON-sporet gjør det mulig å bruke HTML/CSS-overlays senere.

## Bruk på nettsiden senere

Spill klippet én gang når riktig seksjon blir synlig, og behold sluttbildet. Startbildet er hero-vinkelen. Ved redusert bevegelse brukes et stillbilde; ikke start video automatisk. Unngå scroll-scrubbing og kontinuerlig loop. Bruk `object-fit: contain` for hele det leverte utsnittet. Eventuell alternativ mobilbeskjæring må vurderes separat.

For HTML-overlays: hent riktig bilde fra `video.currentTime * 24` og interpoler de normaliserte koordinatene i `overlay-track.json`. Posisjonene gjelder selve den kvadratiske videoflaten, ikke eventuell tom plass rundt den. Bruk den rene videoen når markørene gjenskapes i HTML, slik at de ikke vises dobbelt.

## Bygg på nytt

Fra prosjektroten:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background assets/freezer/fryseboksen-master.blend --python-exit-code 1 --python assets/freezer/animate_freezer.py -- --quality final --frames all
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background assets/freezer/animation-v1/fryseboksen-opening.blend --python-exit-code 1 --python assets/freezer/validate_animation.py
python assets/freezer/package_animation.py
python assets/freezer/verify_animation.py
```

Python trenger Pillow og `imageio-ffmpeg` (versjoner i `requirements-animation.txt`). Blender kan bruke `--device CPU` dersom Intel oneAPI ikke finnes. I prosjektet er kodeverktøyene installert separat i den ignorerte arbeidsmappen; appens Node-avhengigheter er ikke endret.

ZIP-pakken inneholder `source/` med skript og den opprinnelige V2-masteren. Når skriptene kjøres derfra, opprettes en ny `source/animation-v1/` med renderinger og eksportfiler. Bruk de vedlagte fontene i `source/fonts/`. Den ferdige animerte Blender-filen ligger i pakkens rot.
