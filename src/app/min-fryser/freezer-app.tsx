"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { InventoryApp } from "@/features/inventory/inventory-app";
import { SupabaseInventoryAdapter } from "@/features/inventory/supabase-adapter";
import { createClient } from "@/lib/supabase/client";

/**
 * The composition root for the signed-in app. It mirrors DemoApp: pick an
 * adapter, hand it to InventoryApp. Nothing below this line knows that the
 * inventory now lives in Postgres.
 */
export function FreezerApp({ freezerId }: { freezerId: string }) {
  const [adapter] = useState(() => new SupabaseInventoryAdapter(createClient()));
  return (
    <InventoryApp
      adapter={adapter}
      initialFreezerId={freezerId}
      account={
        <Link href="/konto" className="text-button app-home-link">
          Konto <ArrowUpRight size={16} />
        </Link>
      }
    />
  );
}
