# Egenvurdering av åpneanimasjonen

**8,4/10 etter korrigering og sluttkontroll.** Dette er en subjektiv vurdering av uttrykk, bevegelse og lesbarhet.

Sekvensen følger ønsket bevegelse: godkjent hero-vinkel, åpning av lokket, høyere kameravinkel og en rolig tilnærming til maten. Spørsmålstegnene kommer inn etter tur og følger matvarene. Et stillestående sluttbilde gir ro før nettsiden eventuelt går videre i historien.

Jeg vurderer produktform og konsistens til 8,5/10, kamerabevegelse og timing til 8,5/10, og mat/grafikk til 8,2/10. Matmaterialene er bevisst stiliserte. Toppen av lokket beskjæres bevisst i siste del når maten blir hovedmotivet.

## Iterasjon

Første animasjonspreview hadde en tydelig, uønsket selvskygge på lokket og var under leveransekravet på 8/10. Fullrenderingen ble stoppet. Kontroller med bevegelsesuskarphet og persistent render-cache avslått fjernet feilen, og hele den leverte sekvensen ble rendret med disse innstillingene. Lysrigg, geometri og materialer ble beholdt.

## Gjennomført kontroll

- Alle 96 posisjoner er kontrollert. Startkameraets posisjon, rotasjon og perspektiv samsvarer med V2-heroen.
- Lokket går jevnt fra 0 til 95 grader uten påviste skjæringer mot kurvene.
- Kamerabevegelsen er sammenhengende og har rolige stillestående start- og slutthold.
- Nøkkelbilder, sluttbilde og bildesekvens er visuelt inspisert. Filmen er spilt i den lokale nettleseravspilleren.
- Alle 96 bilder i hver av fire videoer er dekodet. Samtlige har korrekt oppløsning, bildefrekvens og varighet: 1080 × 1080, 24 fps, 4 sekunder.
- Pikselforskjellen mellom dekodet video og utvalgte PNG-mastere er i gjennomsnitt under 1,35 nivåer på en 8-bits skala.
- Kontrollpunktet på lokket har median lysstyrke 216 gjennom den siste delen, uten sprang mellom bilder. Den første feilaktige varianten ga 134 på samme punkt.
- Den lokale avspilleren er kontrollert med spørsmålstegn, ren variant og tastaturstart. Ingen registrerte konsollfeil eller horisontal overflow i den kontrollerte visningen. Video starter ikke automatisk og har ingen loop.
- Git-diffen og Python-syntaksen er kontrollert. Appens frontend og Node-avhengigheter er uendret.

MP4 med spørsmålstegn er omtrent 0,78 MB; WebM omtrent 0,37 MB. Ren video, Blender-kilde, koordinatspor, stillbilder og fontlisens følger med.

Nettstedintegrasjon og eventuell særskilt mobilbeskjæring er ikke gjort. Ved integrasjon skal redusert bevegelse gi et stillbilde, og klippet skal ikke følge scrollposisjonen kontinuerlig.
