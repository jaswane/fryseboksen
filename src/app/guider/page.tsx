import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { PublicPage } from "@/components/site/chrome";
export const metadata: Metadata = { title: "Små grep, bedre oversikt" };
export default function GuidesPage() {
  return (
    <PublicPage
      eyebrow="KUNNSKAP / EN LITEN BEGYNNELSE"
      title="Små grep. Bedre oversikt."
      intro="Du trenger ikke et perfekt system. Noen få vaner gjør det lettere å finne igjen det du har."
    >
      <details className="guide-item" open>
        <summary>
          <span className="guide-number">01</span>
          <h2>Begynn med neste vare</h2>
          <ChevronDown size={20} />
        </summary>
        <div>
          <p>
            Du trenger ikke tømme fryseren og telle alt før du begynner. Registrer det neste du
            legger inn, og la oversikten vokse underveis.
          </p>
          <p>
            Skriv et navn du selv kjenner igjen. «Lasagne, to porsjoner» er nok. Hvis maten allerede
            ligger i fryseren, kan du endre innfrysingsdatoen til datoen du husker.
          </p>
        </div>
      </details>
      <details className="guide-item">
        <summary>
          <span className="guide-number">02</span>
          <h2>Gjør det lett å finne igjen maten</h2>
          <ChevronDown size={20} />
        </summary>
        <div>
          <p>
            Samle like varer i samme område eller kurv. Legg pakkene slik at navn og dato er lette å
            lese, og bruk de samme navnene i oversikten som på emballasjen.
          </p>
          <p>
            Bruk «Bruk dette først» som hjelp til å finne varene med eldste registrerte
            innfrysingsdato. Oversikten vurderer ikke om maten er trygg eller hvor lenge den holder.
          </p>
        </div>
      </details>
      <details className="guide-item">
        <summary>
          <span className="guide-number">03</span>
          <h2>La uttaket bli en liten vane</h2>
          <ChevronDown size={20} />
        </summary>
        <div>
          <p>
            Når du tar en pakke ut, trykker du minus på varen. Oversikten trekker fra den eldste
            innleggingen først.
          </p>
          <p>
            Pluss betyr at du legger inn en ny enhet i dag. Oppdager du at du har registrert feil
            antall eller dato, bruker du Rediger. Et feiltrykk kan angres.
          </p>
        </div>
      </details>
      <p className="public-note">
        Flere guider kommer etter hvert. Innhold om holdbarhet, temperatur og tining skal ha
        tydelige kilder og faglig gjennomgang før publisering.
      </p>
      <Link href="/app" className="button mt-10">
        Prøv det i demoen <ArrowUpRight size={18} />
      </Link>
    </PublicPage>
  );
}
