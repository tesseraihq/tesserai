import { describe, expect, it } from "vitest";
import { fixtures, runRoute, truthOf } from "./run";

// Holds the free import routes to their targets (README.md), so a change that makes imports
// worse fails the gate. The paid agent route isn't run here.

describe("the direct import route", () => {
  it("reads every project it's meant for, at 90 or better, and invents nothing anywhere", async () => {
    for (const f of fixtures()) {
      const [s] = await runRoute("direct", f);
      const truth = truthOf(f);
      if (truth.route === "direct") {
        expect(s!.score, `${f}: ${JSON.stringify(s!.items.filter((i) => i.score < 1))}`).toBeGreaterThanOrEqual(0.9);
        expect(s!.accuracy, f).toBeGreaterThanOrEqual(0.95);
      }
      // On projects it can't fully read, it may find less, never something that isn't there.
      if (s!.trust !== null) expect(s!.trust.falseClaims, f).toEqual([]);
      expect(s!.decoyHits, f).toEqual([]);
    }
  }, 120_000);
});
