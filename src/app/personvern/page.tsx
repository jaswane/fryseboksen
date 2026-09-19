import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/site/chrome";
export const metadata: Metadata = { title: "Personvern i demoen" };
export default function PrivacyPage() {
  return (
    <PublicPage
      eyebrow="PERSONVERN / FRONTEND-DEMO"
      title="Din fryser. På din enhet."
      intro="Denne informasjonen gjelder den lokale demoen du kan prøve nå. En full personvernerklæring skal være på plass før en tjeneste med konto lanseres."
    >
      <h2>Hva lagres?</h2>
      <p>
        Varenavn, antall, innfrysingsdatoer og frysernavn lagres lokalt i nettleseren du bruker. Det
        opprettes ingen konto, og fryserinnholdet sendes ikke til en database eller e-posttjeneste.
      </p>
      <p>
        Dataene kan være tilgjengelige for andre som bruker samme nettleserprofil. Demoen er ikke en
        sikker løsning for fortrolige opplysninger.
      </p>
      <h2>Hvordan fjerner du endringene?</h2>
      <p>
        «Tilbakestill demo» i appen erstatter endringene dine med eksempeldata og tømmer den
        separate tomme fryseren. Du kan også slette nettsteddata for denne adressen i nettleserens
        innstillinger.
      </p>
      <h2>Ingen analyse eller markedsføring</h2>
      <p>
        Demoen bruker ingen analyseverktøy, annonser eller sporingspiksler. Fontene leveres lokalt
        sammen med nettstedet. Serveren mottar vanlige sideforespørsler; utviklingsserveren kan
        logge tekniske forespørsler og feil.
      </p>
      <h2>Hvem står bak?</h2>
      <p>
        Swane Creative står bak prosjektet. Spørsmål om personvern kan sendes via{" "}
        <Link href="/kontakt">kontaktsiden</Link>.
      </p>
    </PublicPage>
  );
}
