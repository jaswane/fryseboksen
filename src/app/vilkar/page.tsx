import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/site/chrome";
export const metadata: Metadata = { title: "Om bruk av demoen" };
export default function TermsPage() {
  return (
    <PublicPage
      eyebrow="VILKÅR / FRONTEND-DEMO"
      title="En oversikt du kan prøve."
      intro="Demoen lar deg utforske Fryseboksen uten konto eller betaling. Dette er foreløpig informasjon om bruk av prototypen."
    >
      <h2>Lokale eksempeldata</h2>
      <p>
        Du kan endre eksempelvarene og prøve en tom fryser. Endringene finnes bare i nettleseren
        din. De synkroniseres ikke med andre enheter, og kan forsvinne hvis nettsteddata slettes.
      </p>
      <h2>Dato er ikke holdbarhet</h2>
      <p>
        «Bruk dette først» sorterer etter registrert innfrysingsdato. Demoen beregner ikke
        utløpsdato og avgjør ikke om mat er trygg å spise. Datoene er opplysninger du selv
        registrerer og kan korrigere.
      </p>
      <h2>Funksjoner som kommer senere</h2>
      <p>
        Innlogging og påminnelser er ikke aktive. Illustrasjoner og mobilvisninger på forsiden viser
        produktretningen. Demoen sender ingen e-post og har ingen betalingsfunksjoner.
      </p>
      <h2>Innspill og spørsmål</h2>
      <p>
        Vi tar gjerne imot tilbakemeldinger gjennom <Link href="/kontakt">kontaktsiden</Link>.
        Vilkår for en offentlig tjeneste ferdigstilles før lansering.
      </p>
    </PublicPage>
  );
}
