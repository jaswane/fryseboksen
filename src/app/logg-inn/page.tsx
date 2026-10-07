import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PublicPage } from "@/components/site/chrome";
import { getUser } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Logg inn" };

export default async function LoginPage() {
  if (await getUser()) redirect("/min-fryser");
  return (
    <PublicPage
      eyebrow="LOGG INN"
      title="Åpne fryseren din."
      intro="Skriv e-postadressen din, så sender vi en lenke som logger deg inn. Du trenger ikke velge passord."
    >
      <LoginForm />
      <h2>Første gang?</h2>
      <p>
        Samme lenke oppretter kontoen. Vi ber ikke om navn, og fryseren din er tom til du legger
        inn den første varen.
      </p>
      <h2>Vil du se det først?</h2>
      <p>
        <Link href="/app">Demoen</Link> viser hele oversikten uten innlogging. Den lagres bare i
        nettleseren din og har ingenting med kontoen å gjøre.
      </p>
    </PublicPage>
  );
}
