// Scores `scan` on the fixtures: pnpm --filter @tesserai/cli exec tsx bench/scan/run.ts [--problems]
// No network, no AI. The mean of the fixtures is the score reported at each milestone.
import { PRESETS } from "@tesserai/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scan } from "../../src/scan";
import { gradeScan, type Truth } from "./grade";

const here = fileURLToPath(new URL(".", import.meta.url));
const system = PRESETS[0]!.build();
const show = process.argv.includes("--problems");
// "fixtures": written with the code; "blind": written from the spec by someone who never saw it
// (blind/README.md). The blind mean is the honest one.
const sets = process.argv.includes("--blind") ? [["blind", ["react-app", "vue-app", "svelte-app"]] as const] : [["fixtures", ["react", "vue", "svelte"]] as const];
const scores: number[] = [];
for (const [set, names] of sets) for (const name of names) {
  const dir = join(here, set, name);
  const truth = JSON.parse(readFileSync(join(dir, "truth.json"), "utf8")) as Truth;
  const grade = gradeScan(await scan(dir, system), truth, system);
  scores.push(grade.score);
  console.log(`${String(grade.score).padStart(5)}  ${name.padEnd(7)} ${Object.entries(grade.areas).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (show) for (const p of grade.problems) console.log(`         ${p}`);
}
console.log(`${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1).padStart(5)}  mean`);
