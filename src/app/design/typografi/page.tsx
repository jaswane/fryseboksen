import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/inter";
import "@fontsource-variable/ibm-plex-sans";
export const metadata: Metadata = {
  title: "Typografiprøve",
  robots: { index: false, follow: false },
};
const candidates = [
  {
    name: "Instrument Sans",
    family: '"Instrument Sans Variable", sans-serif',
    direction: "Presis, rolig og litt egenart.",
  },
  {
    name: "Inter",
    family: '"Inter Variable", sans-serif',
    direction: "Nøytral, tydelig og funksjonell.",
  },
  {
    name: "IBM Plex Sans",
    family: '"IBM Plex Sans Variable", sans-serif',
    direction: "Industriell, teknisk og karakterfull.",
  },
];
export default function TypographyPage() {
  return (
    <main id="main" tabIndex={-1} className="font-lab">
      <Link href="/">← Fryseboksen</Link>
      <p className="mt-12 text-sm uppercase tracking-widest">Designstudie / 01</p>
      <h1>Tre stemmer. Samme oversikt.</h1>
      <p className="max-w-2xl text-lg text-muted">
        Samme norske tekst, samme størrelser og samme vekt. En sammenligning av typografi til
        Fryseboksen.
      </p>
      <p className="mt-6 max-w-2xl leading-relaxed text-muted">
        <strong className="font-medium text-ink">Valgt: Instrument Sans.</strong> Den gir store
        overskrifter en rolig, presis form, samtidig som norske varenavn, datoer og tall er tydelige
        i den kompakte appen. Inter er den mest nøytrale kandidaten. IBM Plex Sans får et mer
        industrielt uttrykk enn vi trenger her.
      </p>
      <div className="font-comparison">
        {candidates.map((font) => (
          <section className="font-specimen" key={font.name} style={{ fontFamily: font.family }}>
            <h2>{font.name}</h2>
            <h3>Hva har du egentlig i fryseboksen?</h3>
            <p>{font.direction}</p>
            <div className="font-sample-row">
              <div>
                Kjøttdeig
                <br />
                <small>2 pakker · 12. januar</small>
              </div>
              <span>− &nbsp; 3 &nbsp; +</span>
            </div>
            <div className="font-sample-row">
              <div>
                Blåbær
                <br />
                <small>Bruk dette først</small>
              </div>
              <span>− &nbsp; 2 &nbsp; +</span>
            </div>
            <p>Begynn med neste vare du legger i fryseren. Du trenger ikke registrere alt nå.</p>
            <span className="font-sample-button">Legg til vare</span>
            <p className="mt-6">Æ Ø Å &nbsp; æ ø å &nbsp; 0123456789</p>
          </section>
        ))}
      </div>
    </main>
  );
}
