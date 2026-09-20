import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bell, Check, Minus, Plus } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site/chrome";
import { FreezerStory } from "@/components/story/freezer-story";
import { PhonePreview } from "@/components/story/phone-preview";
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <FreezerStory />
        <section className="product-section" aria-labelledby="product-heading">
          <div className="product-copy">
            <p className="eyebrow">
              <span>05 /</span> EN LITEN VANE
            </p>
            <h2 id="product-heading">
              Inn med maten.
              <br />
              Ut med glemselen.
            </h2>
            <p>
              Legg til på få sekunder.
              <br />
              Ta ut med ett trykk.
            </p>
            <div className="product-steps">
              <div>
                <span>01</span>
                <p>Skriv hva du legger inn.</p>
              </div>
              <div>
                <span>02</span>
                <p>Velg antall. Datoen fylles inn automatisk.</p>
              </div>
              <div>
                <span>03</span>
                <p>Trykk minus når du tar noe ut.</p>
              </div>
            </div>
            <Link href="/app" className="button button-light">
              Åpne fryseren din <ArrowUpRight size={18} />
            </Link>
            <span className="product-demo-note">Prøv med eksempelvarer i demoen.</span>
          </div>
          <div className="product-visual">
            <span className="phone-orbit orbit-one" />
            <span className="phone-orbit orbit-two" />
            <PhonePreview />
            <div className="phone-caption">
              <Minus size={16} />
              <span>Én mindre ting å huske.</span>
              <Plus size={16} />
            </div>
          </div>
        </section>
        <section className="reminder-section" aria-labelledby="reminder-heading">
          <div>
            <p className="eyebrow">
              <span>06 /</span> NÅR HVERDAGEN TAR OVER
            </p>
            <h2 id="reminder-heading">
              En vennlig
              <br />
              påminnelse.
            </h2>
            <p>
              Et lite blikk i fryseren – rett i innboksen.
              <br />
              Månedlig, ukentlig eller aldri. Du velger.
            </p>
            <p className="coming-note">Påminnelser kommer senere. Demoen sender ingen e-post.</p>
          </div>
          <div className="reminder-preview">
            <div className="reminder-preview-top">
              <span className="bell-frame">
                <Bell size={22} strokeWidth={1.4} />
              </span>
              <div>
                <strong>Fryseboksen</strong>
                <span>Et lite blikk i fryseren</span>
              </div>
              <span>EKSEMPEL</span>
            </div>
            <div className="reminder-preview-body">
              <h3>
                Det ligger noe godt
                <br />
                og venter.
              </h3>
              <p>Kanskje det er på tide å bruke kjøttdeigen eller laksen?</p>
              <span className="reminder-link">
                Se hva du har <ArrowUpRight size={16} />
              </span>
            </div>
            <div className="reminder-preview-bottom">
              <Check size={14} />
              En liten hjelp. På dine premisser.
            </div>
          </div>
        </section>
        <section className="final-cta" aria-labelledby="final-heading">
          <p className="eyebrow">
            <span>07 /</span> DET TRENGER IKKE VÆRE MER
          </p>
          <h2 id="final-heading">
            Begynn med
            <br />
            <span>én vare.</span>
          </h2>
          <p>
            Du trenger ikke registrere alt.
            <br />
            Bare det neste du legger i fryseren.
          </p>
          <Link href="/app" className="button">
            Prøv det selv <ArrowUpRight size={18} />
          </Link>
          <Link href="/guider" className="final-guide-link">
            Små råd for en ryddigere fryser <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
