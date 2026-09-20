"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import anchors from "./scroll-anchors.json";
import { scrollMedia } from "./media-config";

const path = (frame: number, mobile = false) =>
  `${scrollMedia.basePath}/${String(frame).padStart(4, "0")}${mobile ? "-mobile" : ""}.webp`;

function Frame({ frame, eager = false }: { frame: number; eager?: boolean }) {
  return (
    <picture>
      <source media="(max-width: 760px)" srcSet={path(frame, true)} />
      <Image
        src={path(frame)}
        alt="Hvit fryseboks med to kurver og innpakket mat."
        width={scrollMedia.desktop.width}
        height={scrollMedia.desktop.height}
        unoptimized
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        className="scroll-frame"
      />
    </picture>
  );
}

function Labels({ frame, stage }: { frame: number; stage: number }) {
  const points = anchors[frame - 1];
  const position = (point: number[]): CSSProperties =>
    ({
      "--marker-x": `${point[0] * 100}%`,
      "--mobile-x": `${((point[0] - scrollMedia.mobile.cropLeft) / (1 - scrollMedia.mobile.cropLeft)) * 100}%`,
      top: `${point[1] * 100}%`,
    }) as CSSProperties;
  return (
    <div className={`scroll-labels stage-${stage}`} aria-hidden="true">
      {Object.entries(points).map(([name, point]) => (
        <div
          key={name}
          className="food-label"
          style={{
            ...position(point),
            opacity: stage === 2 ? Math.max(0, 1 - (frame - scrollMedia.openFrame) / 8) : undefined,
          }}
        >
          <span className="unknown">?</span>
          <span className="known">
            <strong>{{ beef: "Kjøttdeig", berries: "Blåbær", lasagne: "Lasagne" }[name]}</strong>
            <small>{{ beef: "3 pakker", berries: "1 boks", lasagne: "1 form" }[name]}</small>
          </span>
        </div>
      ))}
      <div className="oldest-label" style={position(points.beef)}>
        <span>BRUK DETTE FØRST</span>
        <strong>Kjøttdeig</strong>
        <small>Innfrysingsdato: 12. januar</small>
      </div>
    </div>
  );
}

export function StillFreezer({ frame, stage }: { frame: number; stage: number }) {
  return (
    <div className="scroll-freezer">
      <Frame frame={frame} />
      <Labels frame={frame} stage={stage} />
    </div>
  );
}

/** Alpha WebP frames: scroll can run in either direction without video seek lag. */
export function SceneMedia({ frame, stage }: { frame: number; stage: number }) {
  const [shown, setShown] = useState(1);
  const cache = useRef(new Map<string, Promise<void>>());
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    let cancelled = false;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const load = (index: number) => {
      const url = path(index, mobile);
      const cached = cache.current.get(url);
      if (cached) return cached;
      const promise = new Promise<void>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => image.decode().then(() => resolve(), reject);
        image.onerror = reject;
        image.src = url;
      }).catch((error) => {
        cache.current.delete(url);
        throw error;
      });
      cache.current.set(url, promise);
      if (cache.current.size > 16) cache.current.delete(cache.current.keys().next().value!);
      return promise;
    };
    void load(frame)
      .then(() => {
        if (cancelled || motion.matches) return;
        setShown(frame);
        for (const nearby of [frame - 1, frame + 1]) {
          if (nearby >= 1 && nearby <= scrollMedia.frameCount) void load(nearby).catch(() => {});
        }
      })
      .catch(() => {
        /* Keep the last complete still when a frame cannot load. */
      });
    return () => {
      cancelled = true;
    };
  }, [frame]);
  return (
    <div className="scroll-freezer" data-frame={shown} data-target-frame={frame} data-stage={stage}>
      <Frame frame={shown} eager />
      <Labels frame={shown} stage={shown < 45 ? 0 : stage} />
    </div>
  );
}
