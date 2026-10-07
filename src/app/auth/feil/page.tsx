import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/site/chrome";

export const metadata: Metadata = { title: "Lenken virket ikke" };

export default function AuthErrorPage() {
  return (
    <PublicPage
      eyebrow="LOGG INN"
      title="Lenken virket ikke."
      intro="Den er enten brukt før eller for gammel. Be om en ny, så sender vi en fersk."
    >
      <p>
        <Link href="/logg-inn" className="button">
          Send ny innloggingslenke
        </Link>
      </p>
    </PublicPage>
  );
}
