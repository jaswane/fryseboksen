# Designsystem

## Visuell tese

En kjølig og presis oversikt, med menneskelig språk og et stille visuelt uttrykk. Landingssiden får rom og store komposisjoner. Appen holder informasjon og handling nær hverandre.

## Retning

Lys kjølig bakgrunn, grafitt, dempet blågrønn, fine skillelinjer og moderat avrunding. Ingen generiske SaaS-kortrutenett, glødende gradients, overdrevne skygger eller kopiering av Polestar.

## Typografi – gjennomført sammenligning og endelig valg

Tre lokale webfontkandidater er sammenlignet visuelt på `/design/typografi`, ved 1440 og 390 px bredde, med:

- «Hva har du egentlig i fryseboksen?»
- «Kjøttdeig», «Blåbær», «Bruk dette først»
- «2 pakker · 12. januar», «− 3 +»
- «Begynn med neste vare du legger i fryseren. Du trenger ikke registrere alt nå.»

| Font            | Vurdering i faktisk norsk innhold                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instrument Sans | Rolige store overskrifter, presise former, tydelige æ/ø/å og lesbare datoer/tall. Tilfører akkurat nok karakter uten å endre den godkjente retningen. **Valgt.** |
| Inter           | Meget tydelig UI, effektiv og nøytral. God funksjonell referanse; mindre av den ønskede rolige karakteren i store overskrifter.                                  |
| IBM Plex Sans   | Tydelig og åpen, men de mer industrielle formene gir sterkere teknisk særpreg enn dette produktet trenger.                                                       |

Fontene er åpne (SIL OFL), distribueres lokalt via Fontsource og lisensene er bevart i `public/licenses/`. Ingen Google Fonts-forespørsler fra nettleseren. Hovednettstedet bruker kun Instrument Sans; de to andre lastes på designstudien. Vurderingen er et designvalg, ikke en objektiv rangering av lesbarhet.

## Tokens

Bakgrunn #F3F5F4, flate #FFFFFF, tekst #172125, sekundærtekst #4F6067 og #536A73, aksent #335D6B, linje #D9E1E3. Prioriterte varer ligger på en dempet grønn/grå flate, uten faresignalering. Mørk produktseksjon bruker lys tekst. De lyseste sekundærtekstene ble mørknet etter faktisk kontrastkontroll.

Fortellingen i punkt 1–4 bruker den eksisterende blågrå flaten #E8EFEE sammenhengende. Fryseren har ekte alpha og en dempet kontaktskygge, slik at ingen rektangulær studiobakgrunn må matches med CSS.

Avstandsskala 4/8/12/16/24/32/48/64/96 px. Primærtekst 16–18 px i app, 18–20 px på forside. Primærknapper og pluss/minus har trykkflater på minst 44 px. Skriftvekter 400–600.

## Tilgjengelighet

Semantiske landemerker, hopp-til-innhold, navngitte ikonknapper, synlig fokus, tilgjengelig dialog, Escape/lukk, fokusretur, statusmeldinger og feiltekst. Ingen informasjon kun gjennom farge eller bevegelse.

prefers-reduced-motion gir statiske medier, umiddelbare etikettendringer og ingen parallax. Historieteksten er serverrendret og lesbar uten JavaScript. Mobil er kontrollert ved 320 px; 200 % tekstforstørring er kontrollert separat ved 760 px bredde. Hele nettstedet skal også vurderes på fysiske telefoner før en offentlig pilot.

Pluss/minus har eksplisitte tilgjengelige navn. Hjelpeteksten sier at minus tar fra eldste innlegging og pluss legger inn én i dag. Rediger viser alle innlegginger hver for seg, og forklarer at korrigering ikke registrerer nytt innhold. Angre er tilgjengelig i en melding uten kort tidsfrist. Ingen brukerflate bruker internordet «lot».

## Illustrasjoner

Blender-modellen brukes konsekvent gjennom en transparent 16:9-sekvens. Hele lokket skal være innenfor bildekanten i samtlige posisjoner. Mobil bruker eget kvadratisk utsnitt av samme rendering. Posene og beholderne er umerkede og gjennomsiktige nok til at matvarene kan gjenkjennes. Prerendrede bilder styres av scroll etter brukerens revisjon 20. september; stillbilder brukes ved redusert bevegelse. Dette er fortsatt lokal medieproduksjon for prototypen.

### Visuell revisjon V3, godkjent 20. september 2026

Ukjent innhold får lyse, dempede materialer med samme silhuetter og plassering som den fargede versjonen. Fargene kommer tilbake mellom punkt 2 og 3, mens kameraet står stille. Dette er en visuell metafor for registrert oversikt, ikke automatisk matgjenkjenning.

Oppbevaringsbokser har svakt skrånende vegger, avrundede hjørner, et tydelig lukket lokk og små låseklips. Materialet er hverdagslig transparent plast. Kjølig lys, frysermodell og hovedkomposisjon følger godkjent baseline.

Spørsmålstegn bruker grafitt #172125, større skrift og ingen bakgrunn, kant eller skyggekort. Matetikettene viser bare varenavn med tynne forbindelseslinjer; antall finnes fortsatt i teksten og appen. Plasseringene følger annotasjonsrevisjonen nedenfor.

Klistremerket er en diskret produktdetalj øverst til høyre på fronten, med plassering etter brukerens referanse. Det følger perspektiv og lys gjennom hele sekvensen. Merket er 12 × 14 cm og bruker samme kubeikon, Instrument Sans og grafitt/blågrå palett som nettsiden.

### Eksterne annotasjoner, godkjent 20. september 2026

Scene 2 og 3 bruker tre faste tekstposisjoner utenfor produktet: kjøttdeig og lasagne i luftrommet til venstre, blåbær til høyre. Spørsmålstegn og varenavn deler samme plass i et CSS-grid, slik at overgangen ikke flytter teksten. SVG-linjene er 0,8 px, dempet blågrå og uten pilspisser. Endepunktene bruker de eksisterende Blender-ankrene for riktig vare. Kamera, produktstørrelse, venstre tekstkolonne og alle V3-medier er uendret.

Scene 4 viser prioritering og dato ved siden av fryseren, uten boks. På smalere bildefelt eller ved stor tekst ligger den under produktet. Mobil bruker egne korte linjer og to annotasjoner når bildefeltet er under 22 rem; ellers vises tre. En reservert rad på 4,5 rem under mobilbildet gir plass til prioriteringen uten å dekke lokket eller fortellerteksten. Samme kompakte system brukes i de statiske reservevisningene.
