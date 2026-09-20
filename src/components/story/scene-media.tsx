"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import revealMask from "./scroll-reveal-mask.json";
import { scrollMedia } from "./media-config";
import { StoryAnnotations } from "./story-annotations";

const path = (frame: number, mobile = false, known = false) =>
  `${scrollMedia.basePath}/${String(frame).padStart(4, "0")}${known ? "-known" : ""}${mobile ? "-mobile" : ""}.webp`;

const revealClip = (mobile = false) =>
  `polygon(${revealMask.map(([x, y]) => `${(mobile ? (x - scrollMedia.mobile.cropLeft) / (1 - scrollMedia.mobile.cropLeft) : x) * 100}% ${y * 100}%`).join(",")})`;
const revealStyle = {
  "--reveal-clip": revealClip(),
  "--mobile-reveal-clip": revealClip(true),
} as CSSProperties;

function Frame({
  frame,
  eager = false,
  known = false,
}: {
  frame: number;
  eager?: boolean;
  known?: boolean;
}) {
  return (
    <picture>
      <source media="(max-width: 760px)" srcSet={path(frame, true, known)} />
      <Image
        src={path(frame, false, known)}
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

export function StillFreezer({ frame, stage }: { frame: number; stage: number }) {
  return (
    <div className="scroll-freezer">
      <Frame frame={frame} known={frame === scrollMedia.openFrame && stage >= 2} />
      <StoryAnnotations frame={frame} stage={stage} />
    </div>
  );
}

/** Alpha WebP frames: scroll can run in either direction without video seek lag. */
export function SceneMedia({
  frame,
  stage,
  reveal,
}: {
  frame: number;
  stage: number;
  reveal: number;
}) {
  const [shown, setShown] = useState(1);
  const [knownReady, setKnownReady] = useState(false);
  const cache = useRef(new Map<string, Promise<void>>());
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    let cancelled = false;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const load = (index: number, known = false) => {
      const url = path(index, mobile, known);
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
        if (frame === scrollMedia.openFrame) {
          void load(frame, true)
            .then(() => {
              if (!cancelled && !motion.matches) setKnownReady(true);
            })
            .catch(() => {});
        }
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
  // The alternate render is exactly frame 49 with different food materials.
  // Hold this camera through 02–03; reveal reverses with the scroll position.
  const visibleReveal =
    shown > scrollMedia.openFrame ? 1 : knownReady && shown === scrollMedia.openFrame ? reveal : 0;
  return (
    <div
      className="scroll-freezer"
      data-frame={shown}
      data-target-frame={frame}
      data-stage={stage}
      data-reveal={visibleReveal}
    >
      <Frame frame={shown} eager />
      {shown === scrollMedia.openFrame && knownReady && (
        <div className="scroll-reveal" style={{ ...revealStyle, opacity: visibleReveal }}>
          <Frame frame={scrollMedia.openFrame} known eager />
        </div>
      )}
      <StoryAnnotations
        frame={shown}
        stage={shown < 45 ? 0 : stage === 2 && visibleReveal < 1 ? 1 : stage}
        reveal={visibleReveal}
      />
    </div>
  );
}
