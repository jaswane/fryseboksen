import { scrollMedia } from "./media-config";
export interface ScrollStops {
  second: number;
  third: number;
  fourth: number;
  viewport: number;
}
const clamp = (value: number) => Math.max(0, Math.min(1, value));
/** Position is the only clock: scrolling back yields exactly the same frames. */
export function scrollTimeline(position: number, stops: ScrollStops) {
  const openEnd = Math.max(1, stops.second - stops.viewport * 0.15);
  const turnStart = stops.third + stops.viewport * 0.1;
  const turnEnd = Math.max(turnStart + 1, stops.fourth - stops.viewport * 0.15);
  const opening = clamp(position / openEnd);
  const turning = clamp((position - turnStart) / (turnEnd - turnStart));
  const frame =
    opening < 1
      ? 1 + Math.round(opening * (scrollMedia.openFrame - 1))
      : scrollMedia.openFrame +
        Math.round(turning * (scrollMedia.frameCount - scrollMedia.openFrame));
  const stage =
    position >= stops.fourth - stops.viewport * 0.2
      ? 3
      : position >= stops.third - stops.viewport * 0.2
        ? 2
        : opening >= 0.9
          ? 1
          : 0;
  return { frame, stage };
}
