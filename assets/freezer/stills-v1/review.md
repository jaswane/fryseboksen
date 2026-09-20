# Visuell egenvurdering – stillbilder V1

Samlet vurdering: **8,3/10**. Dette er min subjektive vurdering etter visuell inspeksjon av renderinger og detaljutsnitt, ikke en ekstern kvalitetsscore.

| Bilde                    | Score  | Vurdering                                                                                                                                   |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Lukket hero              | 8,4/10 | Troverdig hovedform, innfelt sidegrep og rolige materialer. Myk skygge forankrer produktet på studiogulvet.                                 |
| Åpen med to kurver       | 8,4/10 | Tydelig romfølelse, to separate kurver, pakning og relieff under lokket. Lyssettingen bevarer detaljene i den hvite modellen.               |
| Innhold og spørsmålstegn | 8,2/10 | Lesbar usikkerhet rundt nøytrale pakker og innhold. Maten er stilisert; dette er den svakeste delen sammenlignet med selve produktmodellen. |
| Innhold og oversikt      | 8,3/10 | Diskrete norske etiketter gir forståelse. Samme modell, matplassering og kameravinkel gjør overgangen stabil.                               |

Første utkast ble vurdert til 7,3/10. Arbeidet fortsatte med korrigert lysbalanse, kontaktskygge, kamerautsnitt og matmaterialer. En geometrisk kontroll avdekket at en kant under lokket skar gjennom kurvenes oppheng; kanten ble justert og kontrollen kjørt på nytt. Sluttbildene er rendret etter denne rettelsen.

## Kontroller

- Alle åtte oppgitte referansebilder er lest. Originalene er ikke endret.
- Målt lukket modell: 85 cm bred, 77 cm høy, 56 cm dyp.
- Nøyaktig to kurver. Ingen påviste skjæringer mellom kurvgeometri og lukket lokk i triangelsjekken.
- Cycles-rendering med tre faste arealys, indirekte lys, myke kontaktskygger og AO i fire materialer.
- Ingen logoer, reklameklistremerker eller genererte bildeteksturer.
- Én Blender-modell gjenbrukes i alle scener. Åpne bilder har samme kamera og lys.
- Spørsmålstegn og oversikt er komponert fra samme innholdsrender. `asset-validation.json` dokumenterer at PNG-filene er eksakt lik grunnrenderen med hvert sitt vedlagte tekstlag.
- PNG-mastere: 2400 × 2400. WebP: 2400 × 2400 og 1200 × 1200. Separat transparent overlay i PNG, SVG og JSON.
- Ingen keyframes eller animasjon er laget. Nettstedets frontend er ikke endret.

## Bevisste forenklinger og neste steg

Dette er en referansebasert produktvisualisering, ikke en produksjonsmodell. Skjulte festedetaljer og matteksturer er forenklet. 198 liter er den oppgitte produktspesifikasjonen; innvendig bruksvolum er ikke sertifisert gjennom modellen. Bildene har en lys studiobakgrunn, ikke transparent bakgrunn.

Etter godkjenning av form og uttrykk kan den samme hengselriggen brukes til en rolig åpneanimasjon på 2–4 sekunder. Kamerautsnittet må da kontrolleres gjennom hele bevegelsen. Nettstedet kan senere bruke den rene innholdsrenderen med HTML-etiketter og de vedlagte ankerkoordinatene.
