"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { SceneMedia as SceneMediaConfig } from "./media-config";

let currentVideo: HTMLVideoElement | null = null;

/** Static first. Video is attached only near the viewport and when motion is allowed. */
export function SceneMedia({
  media,
  active = true,
  priority = false,
  className = "",
}: {
  media: SceneMediaConfig;
  active?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [eligible, setEligible] = useState(false);
  const [smallScreen, setSmallScreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)");
    let near = false;
    const update = () => {
      setEligible(near && !motion.matches);
      setSmallScreen(mobile.matches);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        update();
      },
      { rootMargin: "120px" },
    );
    observer.observe(container.current!);
    motion.addEventListener("change", update);
    mobile.addEventListener("change", update);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      mobile.removeEventListener("change", update);
    };
  }, []);
  const sources = smallScreen && media.mobileSources ? media.mobileSources : media.sources;
  const canPlay = !!sources?.length && eligible && active && !failed;
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (canPlay) void element.play().catch(() => setFailed(true));
    else element.pause();
  }, [canPlay]);
  return (
    <div ref={container} className={"scene-media " + className}>
      <picture>
        {media.mobilePoster && <source media="(max-width: 760px)" srcSet={media.mobilePoster} />}
        <Image
          src={media.poster}
          alt={media.alt}
          width={media.width}
          height={media.height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="scene-poster"
          unoptimized
        />
      </picture>
      {canPlay && (
        <video
          ref={video}
          className={"scene-video" + (playing ? " is-playing" : "")}
          muted
          playsInline
          preload="none"
          poster={smallScreen ? (media.mobilePoster ?? media.poster) : media.poster}
          aria-hidden="true"
          onPlay={(event) => {
            if (currentVideo && currentVideo !== event.currentTarget) currentVideo.pause();
            currentVideo = event.currentTarget;
          }}
          onPlaying={() => setPlaying(true)}
          onError={() => setFailed(true)}
        >
          {sources!.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
        </video>
      )}
    </div>
  );
}
