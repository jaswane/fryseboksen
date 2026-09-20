import type { CSSProperties } from "react";
import anchors from "./scroll-anchors.json";
import { scrollMedia } from "./media-config";

type Point = readonly [number, number];
type Food = "beef" | "lasagne" | "berries";

// Fixed label positions through 02–03; only endpoints follow the rendered food.
const annotations: Record<Food, { text: string; wide: Point; compact: Point }> = {
  beef: { text: "Kjøttdeig", wide: [0.54, 0.27], compact: [0.04, 0.26] },
  lasagne: { text: "Lasagne", wide: [0.54, 0.7], compact: [0.1, 0.79] },
  berries: { text: "Blåbær", wide: [0.92, 0.41], compact: [0.96, 0.78] },
};
const origins: Record<Food, { wide: Point; compact: Point }> = {
  beef: { wide: [0.551, 0.27], compact: [0.18, 0.3] },
  lasagne: { wide: [0.551, 0.7], compact: [0.1, 0.73] },
  berries: { wide: [0.909, 0.41], compact: [0.92, 0.72] },
};
const compactPoint = ([x, y]: readonly number[]): Point => [
  (x - scrollMedia.mobile.cropLeft) / (1 - scrollMedia.mobile.cropLeft),
  y,
];
const pointsAttribute = (points: readonly (readonly number[])[]) =>
  points.map(([x, y]) => `${x * 1000},${y * 1000}`).join(" ");

export function StoryAnnotations({
  frame,
  stage,
  reveal = stage >= 2 ? 1 : 0,
}: {
  frame: number;
  stage: number;
  reveal?: number;
}) {
  const points = anchors[frame - 1];
  const foodOpacity = stage === 2 ? Math.max(0, 1 - (frame - scrollMedia.openFrame) / 8) : 1;
  const compactBeef = compactPoint(points.beef);
  return (
    <div className={`scroll-labels stage-${stage}`} aria-hidden="true">
      {(["wide", "compact"] as const).map((layout) => (
        <svg
          key={layout}
          className={`annotation-lines annotation-lines-${layout}`}
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          focusable="false"
        >
          <g className="annotation-food-lines" style={{ opacity: foodOpacity }}>
            {(Object.keys(annotations) as Food[]).map((food) => (
              <polyline
                key={food}
                className={`annotation-line-${food}${layout === "wide" && food === "berries" ? " annotation-berries-wide" : ""}`}
                data-food={food}
                points={pointsAttribute([
                  origins[food][layout],
                  layout === "compact" ? compactPoint(points[food]) : points[food],
                ])}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {layout === "wide" && (
              <polyline
                className="annotation-berries-narrow"
                points={pointsAttribute([[0.89, 0.41], points.berries])}
                vectorEffect="non-scaling-stroke"
              />
            )}
          </g>
          {layout === "wide" ? (
            <>
              <polyline
                className="annotation-oldest-line annotation-oldest-side"
                points={pointsAttribute([[0.515, 0.35], points.beef])}
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                className="annotation-oldest-line annotation-oldest-below"
                points={pointsAttribute([
                  [0.68, 0.94],
                  [0.49, 0.94],
                  [0.49, points.beef[1]],
                  points.beef,
                ])}
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : (
            <polyline
              className="annotation-oldest-line"
              points={pointsAttribute([
                [0.12, 1.055],
                [0.08, 1.055],
                [0.08, compactBeef[1]],
                compactBeef,
              ])}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      ))}
      {(Object.entries(annotations) as [Food, (typeof annotations)[Food]][]).map(
        ([food, label]) => (
          <div
            key={food}
            className={`food-label food-label-${food}`}
            data-annotation={food}
            style={
              {
                "--label-x": `${label.wide[0] * 100}%`,
                "--label-y": `${label.wide[1] * 100}%`,
                "--compact-label-x": `${label.compact[0] * 100}%`,
                "--compact-label-y": `${label.compact[1] * 100}%`,
                opacity: foodOpacity,
              } as CSSProperties
            }
          >
            <span className="unknown" style={{ opacity: Math.max(0, 1 - reveal * 2) }}>
              ?
            </span>
            <span className="known" style={{ opacity: Math.max(0, reveal * 2 - 1) }}>
              <strong>{label.text}</strong>
            </span>
          </div>
        ),
      )}
      <div className="oldest-label" data-annotation="oldest">
        <span>BRUK DETTE FØRST</span>
        <strong>Kjøttdeig</strong>
        <small>Innfrysingsdato: 12. januar</small>
      </div>
    </div>
  );
}
