import type { Metadata } from "next";
import { DemoApp } from "@/features/inventory/inventory-app";
export const metadata: Metadata = { title: "Din fryser – demo" };
export default function AppPage() {
  return <DemoApp />;
}
