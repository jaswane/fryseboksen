# Fryseboksen – referansebasert Blender-modell og stillbilder

Status: Frontend- og mediearbeidet er godkjent som ny baseline 20. september 2026. Nettstedet bruker nå den transparente, reversible sekvensen i `scroll-v2/`; se [gjeldende medieleveranse](scroll-v2/README.md). Stillbildemasteren, V1/V2-stillbilder og den første åpneanimasjonen i `animation-v1/` er bevart som prosjektets mediekilder og tidligere leveranser.

Dokumentasjonen under beskriver **V2-stillbildene – perspektiv fra høyre**, etter tilbakemeldingen på V1. Kameraene viser fronten og høyre side og bruker perspektivprojeksjon med 52 mm brennvidde på en 36 mm sensor. Hero-modellen fyller 90 % av bildehøyden; den åpne modellen fyller 88 %. Geometri, materialer, matplassering, lysrigg, eksponering og renderinnstillinger er uendret fra V1-stillbildene. De tidligere V1-bildene beholdes som referanse. Den nyere scrollsekvensen har egne utsnitt, transparent bakgrunn og emballasje på maten.

Dette er en del av det kanoniske prosjektet i `C:\_Nettsider\fryseboksen`. Modellen, kameraene og lysriggen gjenbrukes i alle bildene. Ingen generativ AI brukes til geometri, teksturer eller bilder.

## Referansegrunnlag

Alle åtte AVIF-bildene brukeren oppga, er lest. PNG-konverteringer til visuell inspeksjon ligger kun som lokale arbeidsfiler. Modellens mål styres av oppgitt bredde 85 cm, høyde 77 cm og dybde 56 cm. Nettovolum 198 liter behandles som produktets oppgitte spesifikasjon; modellen er ikke en sertifisert måling av bruksvolum.

Formdetaljer fra referansene:

- Ren hvit kasse med lett avrundede produksjonskanter og tynt, flatt lokk.
- Langt, innfelt grep i lokkets sidekapper, ikke et påskrudd håndtak på fronten.
- Støpt innside under lokket med diamantrelieff, pakning og innramming.
- To smale, hengende gitterkurver langs venstre/høyre side og et åpent midtrom.
- Lys metallisk innside med et lavt kompressortrinn på høyre side.
- Diskret termostat/indikator nederst og dreneringslokk. Ingen logoer eller reklameklistremerker. Det svarte temperaturfeltet i referansene er vurdert som et klistremerke, ikke modellert som et stort elektronisk display.

Vegger, festedetaljer og matvarer er forenklet for en stilren produktvisualisering. Baksiden og skjulte tekniske detaljer er ikke rekonstruert som produksjonsunderlag.

## Leveransen

`stills-v2/` inneholder fire bestilte stillbilder og en ren innholdsvariant:

1. `01-hero-closed`: lukket fryseboks i skrå vinkel.
2. `02-open-two-baskets`: åpen fryseboks sett ovenfra, med to synlige kurver.
3. `03-open-questions`: innhold med spørsmålstegn.
4. `04-open-overview`: identisk kameravinkel og innhold, med forståelige varenavn.
5. `05-open-content-clean`: samme innholdsrender uten overlays, til senere HTML/CSS/Motion-bruk.

PNG-mastere er 2400 × 2400. WebP finnes i 2400 og 1200 px. Bildene har en lys studiobakgrunn og fysisk rendret kontaktskygge; dette er ikke transparente utklipp.

Spørsmålstegn og varenavn er også levert som separate transparente PNG-/SVG-lag, med pikselkoordinater i JSON. Instrument Sans og fontlisensen følger med. De to historiebildene er satt sammen fra nøyaktig samme 3D-render, slik at overgangen ikke endrer fryseren, kameravinkelen eller maten.

## 3D-kilden

- `fryseboksen-master.blend`: selvstendig Blender-fil, uten eksterne teksturer.
- `build_freezer.py`: deterministisk modell, materialer, lys, kameraer og rendering.
- `select_shot.py`: bytter mellom `closed`, `open` og `filled` i en eksisterende Blender-fil.
- `validate_model.py`: kontrollerer yttermål, to kurver, AO-materialer, klaring mellom lukket lokk og kurver samt perspektiv og utsnitt uten avkuttet produkt.
- `package_stills.py`: vanlig, deterministisk bildekomposisjon og eksport av overlays/WebP.
- `verify_stills.py`: kontrollerer bildeformater og at begge historiebildene bruker identisk grunnrender.
- `model-validation.json`: maskinell kontrollrapport.

Objektet `LID_PIVOT` er hengselpunktet. Stillbildemasteren har ingen keyframes; åpen stillbildepose er 95 grader. Etter godkjenning er den samme modellen og lysriggen brukt i `animation-v1/fryseboksen-opening.blend`. Den fire sekunder lange animasjonen starter i V2-hero-kameraet, åpner lokket og løfter kameraet inn mot maten. Se `animation-v1/README.md` for videofiler, koordinatspor og bygginstruksjoner.

## Lys og rendering

Blender 5.2.2 LTS, Cycles, 160 samples med adaptiv sampling og denoising. Tre faste store arealys, indirekte lys og subtil Ambient Occlusion i fire materialer. AgX fargestyring. Ingen lys eller materialer endres mellom scenene. Frukt/mat har enkle, deterministiske materialer og ingen kommersiell emballasje.

## Kjør på nytt

Fra prosjektroten, i PowerShell:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python assets/freezer/build_freezer.py -- --quality final --device ONEAPI --shots closed,open,filled
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background assets/freezer/fryseboksen-master.blend --python-exit-code 1 --python assets/freezer/validate_model.py
python assets/freezer/package_stills.py
python assets/freezer/verify_stills.py assets/freezer/stills-v2
```

Bruk `--device CPU` dersom Intel oneAPI ikke finnes. `--quality preview` gir raske kontrollbilder i 1100 px. Pakkeringsskriptet trenger Python med Pillow og `fonttools[woff]`; versjonene er oppgitt i `requirements-assets.txt`. I denne oppgaven er fontverktøyene installert separat under prosjektets ignorerte `work/asset-python/`, uten å endre appens Node-avhengigheter.

ZIP-pakken er en eksport av disse ressursene, ikke et eget webprosjekt. Der ligger Blender-filen og Python-skriptene direkte i pakkens rot. Kjør de samme kommandoene uten prefikset `assets/freezer/` når du står i den utpakkede mappen. `build_freezer.py` lager `renders/`; `package_stills.py` lager en ny `stills-v2/`. De vedlagte fontfilene brukes automatisk uten Node-prosjektet. Åpne `.blend` direkte for manuell redigering, eller bruk `select_shot.py` i Blenders teksteditor for å velge åpen/lukket/med innhold.

## Egenvurdering

Første formpass fikk 7,3/10 og ble ikke levert som ferdig. Etter dette ble eksponering, fylllys, kontaktskygge, kamerautsnitt, kurv/lokk-klaring og matmaterialer justert. De endelige kameraene er eksplisitt fastsatt.

Sluttvurderingen oppsummeres i leveransens `review.md`. Vurderingen er visuell og subjektiv; mål- og kollisjonskontrollen er en separat maskinell sjekk.

Nettstedets nåværende mediekonfigurasjon og HTML-etiketter bruker `scroll-v2/`, ikke de tidligere stillbildeoverlaysene. Se `docs/architecture.md` i prosjektroten for integrasjonen og fallback ved redusert bevegelse.
