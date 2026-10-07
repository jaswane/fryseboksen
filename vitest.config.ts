import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    // A remote Supabase project is a network round trip per call.
    testTimeout: 30000,
    hookTimeout: 90000,
  },
});
