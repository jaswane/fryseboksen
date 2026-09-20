"use client";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SceneMedia, StillFreezer } from "./scene-media";
import { scrollTimeline } from "./scroll-timeline";

const scenes = [
  {
    number: "02",
    kicker: "DET SOM LETT BLIR GLEMT",
    title: (
      <>
        Du vet at det
        <br />
        ligger mat der.
      </>
    ),
    body: "Men var det laks eller lasagne? Og hvor lenge har den pakken egentlig ligget der?",
    note: "Litt kjent?",
  },
  {
    number: "03",
    kicker: "FRA SPØRSMÅL TIL OVERSIKT",
    title: (
      <>
        Å ja.
        <br />
        Det har vi jo.
      </>
    ),
    body: "Et navn. Et antall. En enkel oversikt over det du allerede har hjemme.",
    note: "Kjøttdeig · 3 pakker",
  },
  {
    number: "04",
    kicker: "BRUK DET DU ALLEREDE HAR",
    title: (
      <>
        Det eldste først.
        <br />
        Helt enkelt.
      </>
    ),
    body: "Se hvilke varer som har den eldste registrerte innfrysingsdatoen. Kanskje middagen allerede ligger i fryseren.",
    note: "En prioritering, ikke en utløpsdato.",
  },
];

export function FreezerStory() {
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ frame: 1, stage: 0, reveal: 0 });
  useEffect(() => {
    const element = root.current!;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sections = [...element.querySelectorAll<HTMLElement>("[data-story-stage]")];
    let request = 0;
    const update = () => {
      request = 0;
      if (motion.matches) return;
      const top = element.getBoundingClientRect().top;
      const offsets = sections.map((section) => section.getBoundingClientRect().top - top);
      const next = scrollTimeline(-top, {
        second: offsets[0],
        third: offsets[1],
        fourth: offsets[2],
        viewport: innerHeight,
      });
      setView((previous) =>
        previous.frame === next.frame &&
        previous.stage === next.stage &&
        previous.reveal === next.reveal
          ? previous
          : next,
      );
    };
    const schedule = () => {
      if (!request) request = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(element);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(request);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", schedule);
    };
  }, []);
  return (
    <div ref={root} className="freezer-journey">
      <noscript>
        <style>{`.journey-stage,.journey-scroll-note{display:none}.journey-static{display:block;width:57%}.journey-section{min-height:75svh}.journey-static .scroll-freezer{aspect-ratio:1;overflow:visible}.journey-static .scroll-frame{width:177.777%;max-width:none;margin-left:-77.777%}@media(max-width:760px){.journey-section{padding-top:38px;min-height:auto}.journey-static{width:100%;margin-top:24px}.journey-static .scroll-frame{width:100%;margin:0}}`}</style>
      </noscript>
      <div className="journey-stage" aria-hidden="true">
        <div className="journey-media">
          <SceneMedia frame={view.frame} stage={view.stage} reveal={view.reveal} />
        </div>
        <span className="journey-art-label">FRYSEBOKSEN, SETT MED NYE ØYNE</span>
        <div className="journey-progress">
          {["01", "02", "03", "04"].map((n, i) => (
            <span key={n} className={view.stage === i ? "active" : ""}>
              {n}
            </span>
          ))}
        </div>
      </div>
      <div className="journey-copy">
        <section className="journey-section journey-hero" aria-labelledby="hero-title">
          <div className="journey-text hero-copy">
            <p className="eyebrow">
              <span>01 /</span> FOR DET DU ALLEREDE HAR
            </p>
            <h1 id="hero-title">
              Hva har du
              <br />
              egentlig i<br />
              <span>fryseboksen?</span>
            </h1>
            <p className="hero-intro">
              En enkel oversikt over maten du har.
              <br />
              Så slipper du å lure på hva som ligger der.
            </p>
            <div className="hero-actions">
              <Link href="/app" className="button">
                Prøv demoen <ArrowUpRight size={18} />
              </Link>
              <a href="#slik-fungerer-det" className="text-button">
                Se hvordan det fungerer <ArrowDown size={16} />
              </a>
            </div>
            <p className="hero-footnote">Gratis å prøve. Ingen innlogging.</p>
            <p className="journey-scroll-note">
              Bla ned og ta en titt <ArrowDown size={14} />
            </p>
          </div>
          <div className="journey-static">
            <StillFreezer frame={1} stage={0} />
          </div>
        </section>
        {scenes.map((scene, index) => (
          <section
            key={scene.number}
            id={index === 0 ? "slik-fungerer-det" : undefined}
            className="journey-section"
            data-story-stage={index}
            aria-labelledby={`scene-${scene.number}`}
          >
            <div className="journey-text">
              <p className="eyebrow">
                <span>{scene.number} /</span> {scene.kicker}
              </p>
              <h2 id={`scene-${scene.number}`}>{scene.title}</h2>
              <p className="story-body">{scene.body}</p>
              <p className="story-note">
                <span className="note-line" />
                {scene.note}
              </p>
            </div>
            <div className="journey-static">
              <StillFreezer frame={index === 2 ? 73 : 49} stage={index + 1} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
