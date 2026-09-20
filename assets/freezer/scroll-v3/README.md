# Fryseboksen / visuell revisjon V3

Målrettet videreutvikling av den godkjente V2-modellen. Samme fryseboks, kurver, matplassering, perspektiv, studio og lyssetting. V3 og den tilhørende annotasjonsrevisjonen er godkjent 20. september 2026; V2-baseline er bevart.

## Endringer

- Bær og lasagne har hule, svakt koniske plastbokser med avrundede hjørner, tynt klart lokk, støpt kant, diskret silikonpakning og fire låseklips. Brukerens IKEA-lignende referanse er brukt som formreferanse, uten logo eller import av produktbildet i scenen.
- Bilde 1–49 bruker lyse, avdempede matmaterialer. Geometri, pose, emballasje og plassering beholdes.
- `0049-known` er nøyaktig samme kamera og oppstilling som `0049`, med matens fargede materialer. HTML-laget blander inn fargen etter scrollposisjon mellom punkt 2 og 3. Fargelaget klippes til fryserens åpning for å unngå dobbel kontaktskygge.
- Bilde 50–73 bruker farget innhold. Kameraet dreies som før, men sluttvinkelen er 63° over horisonten mot 58° i punkt 2/3. Produktet fyller 87,5 % av bildehøyden mot 85 % ved åpen sidevinkel. Hele lokket beholdes.
- Mørke, større spørsmålstegn og rene varenavn er HTML/CSS i luftrommet utenfor produktet, med tynne SVG-linjer til maten. Antall beholdes i historieteksten og appen. «Bruk dette først» står ved siden av produktet på desktop og under det på smale bildefelt. Annotasjonene er ikke bakt inn i Blender-renderne.

Klistremerket sitter øverst til høyre på fronten, slik brukerens plasseringsreferanse viser. Det er 12 × 14 cm med matte papirflater, avrundede hjørner, nettstedets originale kubeikon og lokal Instrument Sans. Tekst og QR er gjenskapt som redigerbar grafikk. QR-koden peker på prosjektets offentlige rotadresse, ikke en implementert fryser-/innloggingsflyt. Ingen ny fryseboksmodell, belysningsstil eller landingsside er laget.

## Gjenskap eksporten

Kjør fra prosjektroten med Blender 5.2 og Python med Pillow:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background assets/freezer/scroll-v2/fryseboksen-scroll.blend --python-exit-code 1 --python assets/freezer/render_scroll_v3.py -- --frames all
python assets/freezer/build_sticker_v3.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background assets/freezer/scroll-v3/fryseboksen-scroll.blend --python-exit-code 1 --python assets/freezer/render_sticker_v3.py -- --frames all
python assets/freezer/package_scroll_v3.py
python assets/freezer/verify_scroll_v3.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python-exit-code 1 --python assets/freezer/verify_model_v3.py
```

`--preview --frames 1,49,73` lager fire 960 × 540-kontrollbilder inkludert fargevarianten. `package_scroll_v3.py --preview` lager bare lokale previewfiler og endrer ikke nettstedets bilder eller koordinater. Endelig eksport bruker 40 Cycles-samples, adaptiv sampling, fast seed, denoising, AgX og transparent film. Eksisterende indirekte lys og AO-materialer er beholdt.

Ferdige bildefiler hoppes over. `--overwrite` brukes bare ved bevisst regenerering av utvalgte posisjoner; ved senere geometri-/kamerarevisjoner opprettes en ny medierevisjon. Ikke bland kontrollbilder og Full-HD-renderinger.

Merket rendres som et eget gjennomsiktig Blender-pass med samme kamera, lys, refleksjoner og skyggepåvirkning. Resten av scenen er usynlig for kameraet i dette passet, men påvirker fortsatt lys og refleksjoner. Eksporten legger passet over grunnbildet før alpha-behandling og nedskalering. Dermed kan mat-/kameraarbeid og merkegrafikk revideres uavhengig. Den lagrede `.blend`-filen har hele fryseren med fysisk merke og pakket tekstur; den er ikke lagret med de isolerte passinnstillingene. Merkepasset bruker 64 samples uten denoising for å bevare liten trykt tekst. Grafikkgeneratoren krever også ReportLab for QR-koden.

`frames/`, `sticker-frames/`, `preview-frames/`, `preview-web/` og Blender-backuper ignoreres av Git. Nettbilder, fire Full-HD-stillbilder, `.blend`, merketekstur, tidslinje, kontrollark og validering beholdes. V2-kilden er inngangen til skriptet, slik at V3 kan gjenskapes uten eksterne bildereferanser eller absolutte teksturstier.
