import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { applyChangeset, importDtcg, importShadcnTheme, PRESETS } from "@tesserai/core";
import { grade, type FixtureScore, type Outcome, type Truth } from "./grade";
import { routes } from "./routes";

// The import benchmark: every fixture through a route, graded against its answer key.
//   pnpm import:bench                     today's Import dialog (baseline) and the direct route
//   pnpm import:bench --route agent --yes the coding-agent route (costs money: see README)
//   pnpm import:bench --only d6 --label x one fixture, results saved as results/x.json
// Each fixture is copied to a temp folder first (so nothing runs in the repo), with _node_modules
// renamed back to node_modules (git ignores the real name).

const HERE = new URL(".", import.meta.url).pathname;
// `fixtures` were written with the importer; `holdout` by someone who never saw its code, and the
// importer is never tuned against them: their score is the honest one.
// holdout: the first held-out set (seen once its failures were read, 2026-09-26); holdout2: the
// next, unseen until scored.
const SETS = { fixtures: join(HERE, "fixtures"), holdout: join(HERE, "holdout"), holdout2: join(HERE, "holdout2"), holdout3: join(HERE, "holdout3") } as const;
export type SetName = keyof typeof SETS;
let FIXTURES: string = SETS.fixtures;
export function useSet(set: SetName) {
  FIXTURES = SETS[set];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const flag = (name: string) => process.argv.includes(`--${name}`);

export function stage(fixture: string): string {
  const dir = mkdtempSync(join(tmpdir(), `tesserai-import-${fixture}-`));
  cpSync(join(FIXTURES, fixture), dir, { recursive: true });
  rmSync(join(dir, "truth.json"));
  const rename = (d: string) => {
    for (const entry of readdirSync(d)) {
      const path = join(d, entry);
      if (!statSync(path).isDirectory()) continue;
      if (entry === "_node_modules") renameSync(path, join(d, "node_modules"));
      else rename(path);
    }
  };
  rename(dir);
  return dir;
}

// Today: someone drags the theme file they know about into the Import dialog. Given the benefit of
// the doubt: the app's own stylesheet or token file, outside node_modules.
export async function baseline(dir: string): Promise<Outcome> {
  const started = performance.now();
  const files: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const path = join(d, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(css|json)$/.test(entry) && entry !== "package.json" && !entry.startsWith("$")) files.push(path);
    }
  };
  walk(dir);
  const rank = (f: string) => (/(globals|index|app)\.css$/.test(f) ? 0 : /tokens?\b.*\.json$|\/tokens\//.test(f) ? 1 : f.endsWith(".css") ? 2 : 3);
  files.sort((a, b) => rank(a) - rank(b) || a.length - b.length);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    let report;
    if (file.endsWith(".json")) {
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        continue;
      }
      report = importDtcg(json, `Imported from ${basename(file)}`);
    } else report = importShadcnTheme(text, `Imported from ${basename(file)}`);
    if ("error" in report) continue;
    const applied = applyChangeset(PRESETS[0]!.build(), report.changeset);
    if (!applied.ok) continue;
    return { ok: true, system: applied.system, chose: [relative(dir, file)], seconds: (performance.now() - started) / 1000 };
  }
  return { ok: false, error: "no file the Import dialog can read", seconds: (performance.now() - started) / 1000 };
}

export function fixtures(only?: string): string[] {
  if (!existsSync(FIXTURES)) return [];
  return readdirSync(FIXTURES)
    .filter((f) => existsSync(join(FIXTURES, f, "truth.json")))
    .filter((f) => only === undefined || only.split(",").some((o) => f.startsWith(o)))
    .sort();
}

export function truthOf(fixture: string): Truth {
  return JSON.parse(readFileSync(join(FIXTURES, fixture, "truth.json"), "utf8")) as Truth;
}

export type RouteName = "baseline" | keyof typeof routes;

export async function runRoute(route: RouteName, fixture: string, runs = 1): Promise<FixtureScore[]> {
  const truth = truthOf(fixture);
  const out: FixtureScore[] = [];
  for (let i = 0; i < runs; i++) {
    const dir = stage(fixture);
    try {
      const outcome = route === "baseline" ? await baseline(dir) : await routes[route].run(dir, fixture);
      out.push(grade(fixture, dir, truth, outcome));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  return out;
}

const pct = (x: number) => `${Math.round(x * 100)}`.padStart(3);

export function table(route: string, scores: FixtureScore[]): string {
  const lines = [`\n${route}`, "fixture                      score  acc color value trust recall prec evid usable decoy  secs"];
  for (const s of scores) {
    const t = s.trust;
    lines.push(
      `${s.fixture.padEnd(28)} ${pct(s.score)}   ${pct(s.accuracy)}  ${pct(s.colorAccuracy)}  ${pct(s.valueAccuracy)}  ${t === null ? "  -" : pct(t.score)}   ${t === null ? "  -" : pct(t.recall)}  ${t === null ? "  -" : pct(t.precision)} ${t === null ? "  -" : pct(t.evidence)}   ${pct(s.usable)}    ${String(s.decoyHits.length).padStart(2)}  ${s.seconds.toFixed(1).padStart(5)}${s.ok ? "" : `  ✗ ${s.error}`}`,
    );
  }
  const mean = (f: (s: FixtureScore) => number) => scores.reduce((a, s) => a + f(s), 0) / Math.max(1, scores.length);
  lines.push(`${"mean".padEnd(28)} ${pct(mean((s) => s.score))}   ${pct(mean((s) => s.accuracy))}  ${pct(mean((s) => s.colorAccuracy))}  ${pct(mean((s) => s.valueAccuracy))}`);
  const cost = scores.reduce((a, s) => a + (s.costUsd ?? 0), 0);
  if (cost > 0) lines.push(`cost $${cost.toFixed(2)} for ${scores.length} runs ($${(cost / scores.length).toFixed(2)} each)`);
  return lines.join("\n");
}

async function main() {
  useSet((arg("set") ?? "fixtures") as SetName);
  const only = arg("only");
  const set = arg("set");
  const label = (set !== undefined && set !== "fixtures" ? `${set}-` : "") + (arg("label") ?? new Date().toISOString().slice(0, 10));
  const runs = Number(arg("runs") ?? "1");
  const chosen = (arg("route") ?? "baseline,direct").split(",") as RouteName[];
  const results: Record<string, FixtureScore[]> = {};
  for (const route of chosen) {
    if (route !== "baseline" && !(route in routes)) throw new Error(`unknown route ${route}`);
    if (route !== "baseline" && routes[route as keyof typeof routes].paid && !flag("yes")) {
      console.log(`\n${route}: skipped. It calls a paid model; run with --yes after checking the estimate in README.md.`);
      continue;
    }
    const scores: FixtureScore[] = [];
    // --parallel N: that many fixtures at once (the agent route's sessions each take minutes).
    const parallel = Math.max(1, Number(arg("parallel") ?? "1"));
    const queue = fixtures(only).filter((f) => route === "baseline" || routes[route as keyof typeof routes].applies(f));
    const byFixture = new Map<string, FixtureScore[]>();
    await Promise.all(
      Array.from({ length: Math.min(parallel, queue.length) }, async () => {
        for (let f = queue.shift(); f !== undefined; f = queue.shift()) byFixture.set(f, await runRoute(route, f, runs));
      }),
    );
    for (const f of fixtures(only)) scores.push(...(byFixture.get(f) ?? []));
    results[route] = scores;
    console.log(table(route, scores));
  }
  mkdirSync(join(HERE, "results"), { recursive: true });
  const file = join(HERE, "results", `${label}.json`);
  writeFileSync(file, JSON.stringify({ label, at: new Date().toISOString(), results }, null, 2) + "\n");
  console.log(`\nsaved ${relative(process.cwd(), file)}`);
}

if (process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
