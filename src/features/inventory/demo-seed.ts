import type { Entry, Freezer } from "./domain";
import { osloToday } from "./domain";

export interface DemoState {
  schemaVersion: 1;
  freezers: Freezer[];
  entries: Entry[];
}
export const DEMO_FREEZER_ID = "demo-freezer";
export const EMPTY_FREEZER_ID = "empty-freezer";
export function createDemoState(now = new Date()): DemoState {
  const today = osloToday(now);
  const daysAgo = (days: number) => {
    const date = new Date(today + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().slice(0, 10);
  };
  const recentDate = daysAgo(3);
  // Keep 12 January strictly older than the recent entry, including early January.
  const year = Number(recentDate.slice(0, 4)) - (recentDate.slice(5) <= "01-12" ? 1 : 0);
  const entry = (
    id: string,
    name: string,
    quantity: number,
    frozenOn: string,
    unit: Entry["unit"] = "pakker",
  ): Entry => ({
    id,
    freezerId: DEMO_FREEZER_ID,
    name,
    quantity,
    frozenOn,
    unit,
    createdAt: frozenOn + "T12:00:00.000Z",
    updatedAt: frozenOn + "T12:00:00.000Z",
    version: 1,
  });
  return {
    schemaVersion: 1,
    freezers: [
      { id: DEMO_FREEZER_ID, name: "Fryseren hjemme" },
      { id: EMPTY_FREEZER_ID, name: "Min fryser" },
    ],
    entries: [
      entry("beef-january", "Kjøttdeig", 2, year + "-01-12"),
      entry("beef-recent", "Kjøttdeig", 1, recentDate),
      entry("salmon", "Laks", 2, daysAgo(120)),
      entry("blueberries", "Blåbær", 3, daysAgo(65)),
      entry("lasagna", "Lasagne", 2, daysAgo(24), "porsjoner"),
      entry("bread", "Brød", 1, daysAgo(8), "stk"),
    ],
  };
}
