import { describe, expect, it } from "vitest";
import { scrollTimeline } from "./scroll-timeline";

describe("the freezer story follows the reader's scroll position", () => {
  const stops = { second: 1000, third: 2000, fourth: 3000, viewport: 1000 };
  it("stays closed before scrolling and is fully open before point 2", () => {
    expect(scrollTimeline(-100, stops).frame).toBe(1);
    expect(scrollTimeline(0, stops).frame).toBe(1);
    expect(scrollTimeline(425, stops).frame).toBe(25);
    expect(scrollTimeline(850, stops).frame).toBe(49);
  });
  it("keeps the same camera from point 2 into point 3; only labels change", () => {
    expect(scrollTimeline(1000, stops)).toEqual({ frame: 49, stage: 1 });
    expect(scrollTimeline(2000, stops)).toEqual({ frame: 49, stage: 2 });
    expect(scrollTimeline(2100, stops)).toEqual({ frame: 49, stage: 2 });
  });
  it("faces forward at point 4 and yields the same frame on return", () => {
    const positions = [0, 425, 850, 2000, 2475, 3000];
    expect(positions.map((position) => scrollTimeline(position, stops).frame)).toEqual([
      1, 25, 49, 49, 61, 73,
    ]);
    expect(positions.toReversed().map((position) => scrollTimeline(position, stops).frame)).toEqual(
      [73, 61, 49, 49, 25, 1],
    );
    expect(scrollTimeline(99999, stops).frame).toBe(73);
  });
});
