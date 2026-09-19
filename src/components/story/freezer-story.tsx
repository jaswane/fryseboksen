"use client";
import { useEffect, useRef, useState } from "react";
import { SceneMedia } from "./scene-media";
import { sceneMedia } from "./media-config";
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
    body: "Et navn. Et antall. En liten oversikt over det som allerede finnes hjemme hos deg.",
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
    body: "Se hvilke varer som har den eldste registrerte innfrysingsdatoen. Kanskje middagen allerede ligger klar.",
    note: "En prioritering, ikke en utløpsdato.",
  },
];
function FreezerVisual({ stage, active = true }: { stage: number; active?: boolean }) {
  return (
    <div className={"freezer-visual stage-" + stage}>
      <SceneMedia media={sceneMedia.open} active={active} />
      <div className="food-label label-beef" aria-hidden="true">
        <span className="unknown">?</span>
        <span className="known">
          <strong>Kjøttdeig</strong>
          <small>3 pakker</small>
        </span>
      </div>
      <div className="food-label label-salmon" aria-hidden="true">
        <span className="unknown">?</span>
        <span className="known">
          <strong>Laks</strong>
          <small>2 pakker</small>
        </span>
      </div>
      <div className="food-label label-berries" aria-hidden="true">
        <span className="unknown">?</span>
        <span className="known">
          <strong>Blåbær</strong>
          <small>3 pakker</small>
        </span>
      </div>
      <div className="oldest-label" aria-hidden="true">
        <span>BRUK DETTE FØRST</span>
        <strong>Kjøttdeig</strong>
        <small>Innfrysingsdato: 12. januar</small>
      </div>
    </div>
  );
}
export function FreezerStory() {
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const elements = ref.current!.querySelectorAll<HTMLElement>("[data-story-stage]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            setStage(Number((entry.target as HTMLElement).dataset.storyStage));
      },
      { rootMargin: "-25% 0px -45% 0px", threshold: 0 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} id="slik-fungerer-det" className="story-sequence">
      <div className="story-copy">
        {scenes.map((scene, index) => (
          <section
            className="story-scene"
            key={scene.number}
            data-story-stage={index}
            aria-labelledby={"scene-" + scene.number}
          >
            <p className="eyebrow">
              <span>{scene.number} /</span> {scene.kicker}
            </p>
            <h2 id={"scene-" + scene.number}>{scene.title}</h2>
            <p className="story-body">{scene.body}</p>
            <div className="story-mobile-visual">
              <FreezerVisual stage={index} active={stage === index} />
            </div>
            <p className="story-note">
              <span className="note-line" />
              {scene.note}
            </p>
          </section>
        ))}
      </div>
      <div className="story-sticky" aria-hidden="true">
        <FreezerVisual stage={stage} />
        <div className="story-progress">
          {scenes.map((scene, index) => (
            <span key={scene.number} className={index === stage ? "active" : ""}>
              {scene.number}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
