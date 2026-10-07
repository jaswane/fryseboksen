import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/site/chrome";
import { requireUser } from "@/server/auth/session";
import { signOut } from "@/server/auth/actions";
import { DeleteAccount } from "./delete-account";

export const metadata: Metadata = { title: "Kontoen din" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <PublicPage
      eyebrow="KONTO"
      title="Kontoen din."
      intro="Det eneste vi har registrert på deg er e-postadressen du logger inn med."
    >
      <h2>Innlogget som</h2>
      <p className="account-email">{user.email}</p>
      <p>
        <Link href="/min-fryser">Tilbake til fryseren</Link>
      </p>

      <h2>Logg ut</h2>
      <p>Du blir logget ut på denne enheten. Innholdet i fryseren blir liggende.</p>
      <form action={signOut} className="auth-form">
        <button type="submit" className="button button-light">
          Logg ut
        </button>
      </form>

      <h2>Slett kontoen</h2>
      <p>
        Dette fjerner kontoen, fryseren og alle innleggingene med datoene sine. Vi beholder ingen
        kopi, og det finnes ingen eksport å ta ut først.
      </p>
      <DeleteAccount />
    </PublicPage>
  );
}
