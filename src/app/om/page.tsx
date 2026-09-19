import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/site/chrome";
export const metadata: Metadata = { title: "Om prosjektet" };
export default function AboutPage() {
  return (
    <PublicPage
      eyebrow="OM FRYSEBOKSEN"
      title="Litt mindre å huske."
      intro="Fryseboksen begynner med et enkelt spørsmål: Hva har vi egentlig liggende der?"
    >
      <h2>En liten hjelp i hverdagen</h2>
      <p>
        Mat blir lagt i fryseren med gode intensjoner. Så går ukene, og det blir lett å glemme hva
        som finnes. Fryseboksen skal gjøre det enkelt å holde oversikt over maten du allerede har.
      </p>
      <p>Et navn, et antall og en dato. Mer trenger det ikke være for å begynne.</p>
      <h2>Hvem står bak?</h2>
      <p>
        Fryseboksen.no er et prosjekt fra Swane Creative. Målet er en enkel, gratis tjeneste for
        norske husholdninger, med mobilopplevelsen først.
      </p>
      <h2>Dette er en tidlig demo</h2>
      <p>
        Du kan prøve registrering, uttak og redigering med lokale eksempelvarer. Det er ingen konto,
        og endringene dine blir bare lagret i denne nettleseren. Innlogging og påminnelser kommer
        senere.
      </p>
      <p>
        Har du innspill eller spørsmål? <Link href="/kontakt">Du finner oss på kontaktsiden.</Link>
      </p>
    </PublicPage>
  );
}
