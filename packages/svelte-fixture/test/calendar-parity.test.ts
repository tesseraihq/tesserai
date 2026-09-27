import type { DesignSystem } from "@tesserai/core";
import { renderAll } from "@tesserai/templates";
import { join } from "node:path";
import { afterAll, beforeAll, describe as group, expect, it } from "vitest";
// The comparison by meaning is the Vue fixture's (its calendar.ts says how it works): the same
// check, against Bits' calendar.
import { describe, scenario } from "../../vue-fixture/test/calendar";
import { aliasesFor, createRenderer, writeGenerated, type Renderer } from "../harness";
import { customSystem, DEFAULT_SYSTEM } from "./systems";

// The calendar held to the React one (react-day-picker's) by what its classes mean: Bits' calendar,
// laid out alike, marks state its own way. Rendered on the server with the same dates, each part
// (root, nav, caption, weekday, the cells and days of today, a selected day, a range's ends and
// middle, a day outside the month) has the same classes applied, the same tag and the same text.

type Cn = (...classes: string[]) => string;

// @lucide/svelte adds a lucide-icon class beside lucide and lucide-<name>, which lucide-react
// doesn't; tesserai's styles don't read any of them (as parity.test.ts allows for other icons).
const LUCIDE_SVELTE_CLASS = "lucide-icon";
const withoutLucideSvelteClass = (parts: ReturnType<typeof describe>) => parts.map((p) => ({ ...p, classes: p.classes === null ? null : p.classes.filter((c) => c !== LUCIDE_SVELTE_CLASS) }));

const SYSTEMS: [string, () => DesignSystem][] = [
  ["default", () => DEFAULT_SYSTEM],
  ["custom", customSystem],
];

group.each(SYSTEMS)("Svelte (Bits UI) and React (react-day-picker) calendars for the %s system", (name, build) => {
  const label = `calendar-${name}`;
  let renderer: Renderer;
  let cn: Cn;
  beforeAll(async () => {
    const system = build();
    renderer = await createRenderer();
    const react = await renderAll("radix", { ...system, base: "radix" }, { format: false });
    const reactDir = await renderer.writeReact(label, react.filter((f) => ["lib/utils.ts", "components/ui/button.tsx", "components/ui/calendar.tsx"].includes(f.path)));
    await writeGenerated(label, await renderAll("bits-ui", system, { format: false }));
    cn = (await renderer.module<{ cn: Cn }>(join(reactDir, "lib/utils.ts"))).cn;
  }, 120_000);
  afterAll(() => renderer?.close());

  const s = scenario();
  const date = (d: Date) => `new Date(${d.getFullYear()}, ${d.getMonth()}, ${d.getDate()})`;
  const month = `new Date(${s.today.getFullYear()}, ${s.today.getMonth()}, 1)`;
  const entry = (tsx: string, markup: string) => ({
    tsx: `import { Calendar } from "@/components/ui/calendar";\nfunction Entry() {\n  return ${tsx};\n}`,
    svelte: `<script lang="ts">\n  import { parseDate } from "@internationalized/date";\n  import { Calendar, RangeCalendar } from "${aliasesFor(label).ui}/calendar/index.js";\n</script>\n\n${markup}\n`,
  });

  it("a single date, captioned by its month", async () => {
    const e = entry(`<Calendar mode="single" selected={${date(s.selected)}} defaultMonth={${month}} />`, `<Calendar type="single" value={parseDate("${s.iso(s.selected)}")} />`);
    const [reactHtml, svelteHtml] = await Promise.all([renderer.react(label, "single", e.tsx), renderer.svelte(label, "single", e.svelte)]);
    const expected = describe(reactHtml, s.dates, cn);
    expect(expected.filter((p) => p.classes === null).map((p) => p.name)).toEqual([]);
    expect(svelteHtml).toContain(LUCIDE_SVELTE_CLASS);
    expect(withoutLucideSvelteClass(describe(svelteHtml, s.dates, cn))).toEqual(expected);
  }, 60_000);

  it("a range over two months, with month and year dropdowns", async () => {
    const e = entry(
      `<Calendar mode="range" selected={{ from: ${date(s.selected)}, to: ${date(s.end)} }} defaultMonth={${month}} numberOfMonths={2} captionLayout="dropdown" />`,
      `<RangeCalendar value={{ start: parseDate("${s.iso(s.selected)}"), end: parseDate("${s.iso(s.end)}") }} numberOfMonths={2} captionLayout="dropdown" />`,
    );
    const [reactHtml, svelteHtml] = await Promise.all([renderer.react(label, "range", e.tsx), renderer.svelte(label, "range", e.svelte)]);
    const expected = describe(reactHtml, s.dates, cn);
    expect(expected.filter((p) => p.classes === null).map((p) => p.name)).toEqual([]);
    expect(svelteHtml).toContain(LUCIDE_SVELTE_CLASS);
    expect(withoutLucideSvelteClass(describe(svelteHtml, s.dates, cn))).toEqual(expected);
  }, 60_000);
});
