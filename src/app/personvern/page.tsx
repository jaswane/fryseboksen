import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/site/chrome";

export const metadata: Metadata = { title: "Personvern" };

export default function PrivacyPage() {
  return (
    <PublicPage
      eyebrow="PERSONVERN"
      title="E-postadressen din, og det du legger i fryseren."
      intro="Det er alt vi lagrer. Vi ber ikke om navn, vi bruker ingen analyseverktøy, og vi selger ingenting videre."
    >
      <h2>Med konto</h2>
      <p>
        Når du logger inn, lagrer vi e-postadressen din og innholdet du registrerer: varenavn,
        antall, enhet, innfrysingsdato og navnet på fryseren. Vi lagrer også når hver registrering
        ble opprettet og sist endret, slik at «Bruk dette først» og Angre fungerer.
      </p>
      <p>
        E-postadressen brukes til å logge deg inn. Vi sender ingen nyhetsbrev, og det finnes ingen
        påminnelser på e-post i denne versjonen.
      </p>
      <h2>Angre-informasjon</h2>
      <p>
        For at Angre skal kunne reversere en handling med riktige datoer, lagrer vi en kopi av det
        som ble endret. Disse kopiene slettes automatisk etter et døgn, og vi beholder maksimalt de
        30 siste per fryser. Det opprettes ingen varig historikk over hva du har tatt ut.
      </p>
      <h2>Uten konto</h2>
      <p>
        <Link href="/app">Demoen</Link> krever ingen innlogging. Det du registrerer der lagres bare
        i nettleseren du bruker, og sendes aldri til oss. Demodata knyttes ikke til en konto, heller
        ikke hvis du logger inn senere.
      </p>
      <h2>Informasjonskapsler</h2>
      <p>
        Vi bruker bare de informasjonskapslene som trengs for å holde deg innlogget. Ingen
        analyseverktøy, ingen annonser, ingen sporingspiksler. Skriftene leveres fra vår egen
        server, så nettleseren din kontakter ingen tredjepart for å vise siden.
      </p>
      <h2>Hvem behandler dataene</h2>
      <p>
        Swane Creative står bak Fryseboksen. Innlogging, database og e-post med innloggingslenke
        leveres av Supabase på våre vegne.
      </p>
      <h2>Hva du kan gjøre selv</h2>
      <p>
        Du ser og retter alt innholdet ditt i appen. På <Link href="/konto">kontosiden</Link> kan du
        logge ut eller slette kontoen. Sletting fjerner kontoen, fryseren og alle innleggingene med
        det samme. Vi beholder ingen kopi, og det finnes foreløpig ingen eksportfunksjon å ta ut
        dataene med først.
      </p>
      <p>
        Spørsmål om personvern kan sendes via <Link href="/kontakt">kontaktsiden</Link>.
      </p>
    </PublicPage>
  );
}
