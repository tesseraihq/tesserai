import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The consumer compilers in the Vue and Svelte fixtures are integration work. Bound concurrency
    // so their TypeScript programs do not exhaust a CI runner or a laptop.
    maxWorkers: 2,
    testTimeout: 30_000,
    include: ["packages/**/*.test.ts"],
    // The CLI never reaches Google Fonts from a test; the tests that cover it pass stand-ins.
    env: { TESSERAI_OFFLINE: "1" },
    // The fixtures compile every generated component, in both frameworks, before their tests.
    hookTimeout: 120_000,
  },
});
