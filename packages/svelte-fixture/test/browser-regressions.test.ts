import { chromium, expect as browserExpect, type Browser, type Page } from "@playwright/test";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { PRESETS } from "@tesserai/core";
import { renderAll } from "@tesserai/templates";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { FIXTURE_DIR, writeGenerated } from "../harness";

let server: ViteDevServer;
let browser: Browser;
let page: Page;
let url: string;
const errors: string[] = [];
beforeAll(async () => {
  const root = await writeGenerated(
    "browser-regressions",
    await renderAll("bits-ui", PRESETS[0]!.build(), { format: false }),
  );
  await writeFile(
    join(root, "index.html"),
    '<div id="app"></div><script type="module" src="/entry.ts"></script>',
  );
  await writeFile(
    join(root, "entry.ts"),
    'import {mount} from "svelte"; import App from "./App.svelte"; mount(App, {target: document.getElementById("app")!});',
  );
  await writeFile(
    join(root, "App.svelte"),
    `<script lang="ts">
import * as C from './components/ui/combobox/index.js';
import {Toaster,toast} from './components/ui/toast/index.js';
import {RangeCalendar} from './components/ui/calendar/index.js';
import {CalendarDate} from '@internationalized/date';
let disabled=$state(true); let multiple=$state(['alpha']); let single=$state('alpha');
</script>
<button id="enable" onclick={()=>disabled=false}>Enable</button>
<section id="multiple"><C.Combobox type="multiple" {disabled} bind:value={multiple}><C.ComboboxChips>{#each multiple as value (value)}<C.ComboboxChip {value}>{value}</C.ComboboxChip>{/each}<C.ComboboxChipsInput /></C.ComboboxChips></C.Combobox><output>{JSON.stringify(multiple)}</output></section>
<section id="single"><C.Combobox type="single" {disabled} bind:value={single}><C.ComboboxInput showClear /></C.Combobox><output>{JSON.stringify(single)}</output></section>
<button id="save" onclick={()=>toast.add({id:'saved',title:'Saved successfully',description:'All changes saved',timeout:Infinity,actionProps:{children:'Undo',altText:'Undo the saved changes'}})}>Save</button>
<button id="finite" onclick={()=>toast.add({id:'finite',title:'Temporary',timeout:600})}>Temporary toast</button><Toaster />
<section id="calendar"><RangeCalendar placeholder={new CalendarDate(2026,5,15)} numberOfMonths={2} captionLayout="dropdown" /></section>
<section id="year-boundary"><RangeCalendar placeholder={new CalendarDate(2026,12,31)} numberOfMonths={2} captionLayout="dropdown" /></section>
<section id="leap"><RangeCalendar placeholder={new CalendarDate(2024,2,29)} numberOfMonths={3} captionLayout="dropdown" /></section>`,
  );
  server = await createServer({
    configFile: false,
    root,
    logLevel: "error",
    plugins: [svelte({ configFile: false })],
    resolve: { alias: { $lib: join(FIXTURE_DIR, "src/lib") } },
    server: { host: "127.0.0.1", port: 0, hmr: false, ws: false, watch: null },
    // No dependency pre-bundling: with the websocket off, a page loaded while Vite re-bundles a
    // dependency it found late is never told to reload, and waits forever (seen in the full
    // suite, where other test files keep the machine busy). The packages here are ES modules
    // and load as they are.
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  await server.listen();
  url = server.resolvedUrls!.local[0]!;
  browser = await chromium.launch({ headless: true });
}, 120_000);
beforeEach(async () => {
  await page?.close();
  page = await browser.newPage();
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator("#save").waitFor();
});
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

it.each(["multiple", "single"])(
  "preserves disabled %s combobox values and reacts when enabled",
  async (id) => {
    const section = page.locator(`#${id}`);
    const button = section.locator(
      `[data-slot="combobox-${id === "multiple" ? "chip-remove" : "clear"}"]`,
    );
    await browserExpect(section.locator("input")).toBeDisabled();
    await browserExpect(button).toBeDisabled();
    // Even synthetic events cannot mutate the disabled control.
    await button.dispatchEvent("click");
    await section.locator("input").dispatchEvent("keydown", { key: "Backspace" });
    await browserExpect(section.locator("output")).toHaveText(
      id === "multiple" ? '["alpha"]' : '"alpha"',
    );
    await page.locator("#enable").click();
    await browserExpect(button).toBeEnabled();
    await button.click();
    await browserExpect(section.locator("output")).toHaveText(id === "multiple" ? "[]" : '""');
    expect(errors).toEqual([]);
  },
);
it.each([
  ["calendar", 3, "2028", ["5", "2028", "6", "2028"]],
  ["year-boundary", 2, "6", ["5", "2027", "6", "2027"]],
  ["leap", 5, "2025", ["2", "2025", "3", "2025", "4", "2025"]],
] as const)("changes the intended month in %s", async (id, index, value, expected) => {
  const selects = page.locator(`#${id} select`);
  await selects.nth(index).selectOption(value);
  await browserExpect
    .poll(() =>
      selects.evaluateAll((elements) => elements.map((e) => (e as HTMLSelectElement).value)),
    )
    .toEqual(expected);
  expect(errors).toEqual([]);
});
it("announces notifications from an already mounted live region without moving focus", async () => {
  const live = page.locator('[data-slot="toast-announcer"]');
  await browserExpect(live).toHaveAttribute("aria-live", "polite");
  await browserExpect(live).toHaveText("");
  await page.locator("#save").click();
  await browserExpect(live).toContainText("Saved successfully");
  await browserExpect(live).toContainText("All changes saved");
  await browserExpect(live).toContainText("Undo the saved changes");
  await browserExpect(page.locator("#save")).toBeFocused();
  await browserExpect(live.locator("button")).toHaveCount(0);
  expect(errors).toEqual([]);
});
it("keeps infinite toasts through pointer and focus pauses until dismissed", async () => {
  await page.locator("#save").click();
  const toast = page.locator('[data-slot="toast"]');
  await browserExpect(toast).toBeVisible();
  await toast.hover();
  await page.locator("#save").hover();
  await toast.focus();
  await page.locator("#save").focus();
  await page.waitForTimeout(700);
  await browserExpect(toast).toBeVisible();
  await toast.locator('[data-slot="toast-close"]').click();
  await browserExpect(toast).toHaveCount(0);
  expect(errors).toEqual([]);
});
it("pauses and resumes finite toast timeouts", async () => {
  await page.locator("#finite").click();
  const toast = page.locator('[data-slot="toast"]');
  await toast.hover();
  await page.waitForTimeout(800);
  await browserExpect(toast).toBeVisible();
  await page.locator("#finite").hover();
  await browserExpect(toast).toHaveCount(0);
  expect(errors).toEqual([]);
});
