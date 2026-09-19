export interface SceneMedia {
  poster: string;
  mobilePoster?: string;
  alt: string;
  width: number;
  height: number;
  sources?: { src: string; type: "video/mp4" | "video/webm" }[];
  mobileSources?: { src: string; type: "video/mp4" | "video/webm" }[];
}
export const sceneMedia: Record<"closed" | "open", SceneMedia> = {
  closed: {
    poster: "/media/freezer-closed.svg",
    alt: "En lukket fryseboks i et lyst, kjølig rom.",
    width: 900,
    height: 700,
  },
  open: {
    poster: "/media/freezer-open.svg",
    alt: "Den åpne fryseren med pakker, bokser og poser med mat.",
    width: 900,
    height: 700,
  },
};
// Replace these prototype illustrations with final stills, and optionally add short sources.
// No autoplay loop and no scroll scrubbing. Keep all text/labels in HTML.
