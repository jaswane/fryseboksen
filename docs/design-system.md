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

Avstandsskala 4/8/12/16/24/32/48/64/96 px. Primærtekst 16–18 px i app, 18–20 px på forside. Primærknapper og pluss/minus har trykkflater på minst 44 px. Skriftvekter 400–600.

## Tilgjengelighet

Semantiske landemerker, hopp-til-innhold, navngitte ikonknapper, synlig fokus, tilgjengelig dialog, Escape/lukk, fokusretur, statusmeldinger og feiltekst. Ingen informasjon kun gjennom farge eller bevegelse.

prefers-reduced-motion gir statiske medier, umiddelbare etikettendringer og ingen parallax. Historieteksten er serverrendret og lesbar uten JavaScript. Mobil er kontrollert ved 320 px; 200 % tekstforstørring er kontrollert separat ved 760 px bredde. Hele nettstedet skal også vurderes på fysiske telefoner før en offentlig pilot.

Pluss/minus har eksplisitte tilgjengelige navn. Hjelpeteksten sier at minus tar fra eldste innlegging og pluss legger inn én i dag. Rediger viser alle innlegginger hver for seg, og forklarer at korrigering ikke registrerer nytt innhold. Angre er tilgjengelig i en melding uten kort tidsfrist. Ingen brukerflate bruker internordet «lot».

## Illustrasjoner

Foreløpige stillbilder/illustrasjoner er eksplisitt prototypeassets. Sluttproduksjon erstattes gjennom mediekonfigurasjonen. Ingen ferdige filmer denne sprinten.
