import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/site/chrome";

export const metadata: Metadata = { title: "Vilkår" };

export default function TermsPage() {
  return (
    <PublicPage
      eyebrow="VILKÅR"
      title="Gratis, og fortsatt tidlig."
      intro="Fryseboksen koster ingenting og har ingen betalingsfunksjoner. Til gjengjeld er dette en tidlig versjon, og det bør du vite før du legger inn hele fryseren."
    >
      <h2>Dato er ikke holdbarhet</h2>
      <p>
        «Bruk dette først» sorterer etter den eldste innfrysingsdatoen du selv har registrert.
        Fryseboksen beregner ingen utløpsdato og vurderer ikke om mat er trygg å spise. Den
        vurderingen er din.
      </p>
      <h2>Innholdet er ditt</h2>
      <p>
        Du bestemmer hva du registrerer, og du kan rette eller slette det når som helst. Vi bruker
        det ikke til noe annet enn å vise deg din egen oversikt.
      </p>
      <h2>Konto</h2>
      <p>
        Du logger inn med en lenke på e-post. Del den ikke med andre; den gir tilgang til fryseren
        din. Du kan slette kontoen selv fra <Link href="/konto">kontosiden</Link>, og da forsvinner
        innholdet med det samme.
      </p>
      <h2>Hva vi ikke lover</h2>
      <p>
        Dette er en tidlig versjon under aktiv utvikling. Vi kan ikke garantere at tjenesten alltid
        er tilgjengelig, og det finnes ingen eksportfunksjon å sikre dataene dine med. Bruk den som
        en hjelp til å huske, ikke som eneste sted innholdet finnes.
      </p>
      <h2>Demoen</h2>
      <p>
        <Link href="/app">Demoen</Link> krever ingen konto. Den lagres bare i nettleseren din og kan
        forsvinne hvis du sletter nettsteddata.
      </p>
      <h2>Endringer</h2>
      <p>
        Vilkårene kan bli endret etter hvert som tjenesten utvikles. Spørsmål tar vi gjerne imot via{" "}
        <Link href="/kontakt">kontaktsiden</Link>.
      </p>
    </PublicPage>
  );
}
