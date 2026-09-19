import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={"brand" + (inverse ? " brand-inverse" : "")}
      aria-label="Fryseboksen – til forsiden"
    >
      <svg aria-hidden="true" viewBox="0 0 28 28" width="27" height="27" fill="none">
        <path d="M4 7.5 14 2l10 5.5v13L14 26 4 20.5v-13Z" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="m4 7.5 10 5.7 10-5.7M14 13.2V26M9 4.8l10 5.7"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      <span>
        Fryseboksen<span className="brand-domain">.no</span>
      </span>
    </Link>
  );
}
export function SiteHeader() {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Hovedmeny">
        <Link href="/#slik-fungerer-det" className="nav-text">
          Slik fungerer det
        </Link>
        <Link href="/guider" className="nav-text">
          Guider
        </Link>
        <Link href="/app" className="button button-small">
          Prøv demoen <ArrowUpRight size={17} />
        </Link>
      </nav>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Brand />
          <p>
            Litt mindre å huske.
            <br />
            Litt mer å bruke.
          </p>
        </div>
        <nav aria-label="Bunnmeny">
          <Link href="/guider">Guider</Link>
          <Link href="/om">Om Fryseboksen</Link>
          <Link href="/kontakt">Kontakt</Link>
          <Link href="/personvern">Personvern</Link>
          <Link href="/vilkar">Vilkår</Link>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>Et prosjekt fra Swane Creative</span>
        <span>Laget for fryseren din.</span>
      </div>
    </footer>
  );
}
export function PublicPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="public-page">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="public-intro">{intro}</p>
        <div className="public-content">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
