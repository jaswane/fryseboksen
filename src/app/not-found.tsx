import Link from "next/link";
import { PublicPage } from "@/components/site/chrome";
export default function NotFound() {
  return (
    <PublicPage
      eyebrow="404"
      title="Denne siden fant vi ikke."
      intro="Kanskje det er enklere å begynne på forsiden."
    >
      <Link href="/" className="button">
        Til forsiden
      </Link>
    </PublicPage>
  );
}
