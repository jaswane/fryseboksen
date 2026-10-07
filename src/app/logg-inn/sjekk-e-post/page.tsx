import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/site/chrome";

export const metadata: Metadata = { title: "Sjekk e-posten din" };

export default function CheckEmailPage() {
  return (
    <PublicPage
      eyebrow="LOGG INN"
      title="Sjekk e-posten din."
      intro="Vi har sendt en lenke til adressen du oppga. Åpne den på enheten du vil bruke Fryseboksen på."
    >
      <h2>Finner du den ikke?</h2>
      <p>
        Se etter den i søppelpost. Lenken virker én gang, og den har begrenset gyldighet. Har det
        gått en stund, <Link href="/logg-inn">be om en ny</Link>.
      </p>
    </PublicPage>
  );
}
