import type { Metadata } from "next";
import { requireFreezerId } from "@/server/auth/session";
import { FreezerApp } from "./freezer-app";

export const metadata: Metadata = { title: "Fryseren din" };

export default async function MyFreezerPage() {
  // The check belongs here rather than in a layout: a layout does not re-run on
  // every navigation and does not decide whether the rest of the route renders.
  const freezerId = await requireFreezerId();
  return <FreezerApp freezerId={freezerId} />;
}
