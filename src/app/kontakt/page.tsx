import type { Metadata } from "next";
import { PublicPage } from "@/components/site/chrome";
export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontakt Swane Creative om Fryseboksen.",
};
export default function ContactPage() {
  return (
    <PublicPage
      eyebrow="KONTAKT"
      title="Vi hører gjerne fra deg."
      intro="Et spørsmål, en idé eller noe som kunne vært enklere? Fortell oss det."
    >
      <h2>Swane Creative</h2>
      <p>
        Send oss en e-post om Fryseboksen. Beskriv gjerne hva du prøvde å gjøre, og om du brukte
        mobil eller datamaskin.
      </p>
      <p className="contact-email">kontakt@swanecreative.no</p>
      <p className="mt-8">
        Spørsmål om personvern og opplysninger kan også sendes hit. Demoen har ingen brukerkonto
        eller sentralt lagret fryserinnhold.
      </p>
    </PublicPage>
  );
}
