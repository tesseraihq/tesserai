import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { PRESETS } from "@tesserai/core";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { createLoader, FIXTURE_DIR, type Loader } from "../harness";
import { writeRun } from "./systems";

let loader: Loader;
let vue: typeof import("vue");
let dates: typeof import("@internationalized/date");
let calendar: Record<string, any>;
let combobox: Record<string, any>;
let chart: Record<string, any>;
let cleanup: (() => void) | undefined;
beforeAll(async () => {
  GlobalRegistrator.register({ url: "http://localhost/" });
  loader = await createLoader("dom");
  const root = await writeRun("review-regressions", "reka-ui", PRESETS[0]!.build());
  vue = await loader.load(join(FIXTURE_DIR, "node_modules/vue/dist/vue.runtime.esm-bundler.js"));
  // Load the same date objects used by the generated components.
  dates = await import("@internationalized/date");
  calendar = await loader.load(join(root, "components/ui/calendar/index.ts"));
  combobox = await loader.load(join(root, "components/ui/combobox/index.ts"));
  chart = await loader.load(join(root, "components/ui/chart/index.ts"));
});
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
});
afterAll(async () => {
  await loader?.close();
  await GlobalRegistrator.unregister();
});
const date = (y: number, m: number, d = 15) => new dates.CalendarDate(y, m, d);
async function mount(render: () => any) {
  const host = document.body.appendChild(document.createElement("div"));
  const app = vue.createApp({ render });
  cleanup = () => {
    app.unmount();
    host.remove();
  };
  app.mount(host);
  await vue.nextTick();
  await new Promise((r) => setTimeout(r, 50));
  return host;
}

it.each([
  ["Calendar", () => ({ modelValue: date(2020, 2) })],
  ["Calendar", () => ({ defaultValue: date(2020, 2) })],
  ["Calendar", () => ({ multiple: true, modelValue: [date(2020, 2), date(2020, 3)] })],
  ["RangeCalendar", () => ({ modelValue: { start: date(2020, 2), end: date(2020, 3) } })],
  ["RangeCalendar", () => ({ defaultValue: { start: date(2020, 2), end: date(2020, 3) } })],
] as const)("%s opens on the selected date", async (name, props) => {
  const host = await mount(() => vue.h(calendar[name], props()));
  expect(host.querySelector('[role="status"]')?.textContent).toContain("February 2020");
});
it.each(["placeholder", "defaultPlaceholder"])(
  "honors explicit %s over the selection",
  async (key) => {
    const host = await mount(() =>
      vue.h(calendar.Calendar, { modelValue: date(2020, 2), [key]: date(2021, 7) }),
    );
    expect(host.querySelector('[role="status"]')?.textContent).toContain("July 2021");
  },
);
it.each([
  [2026, 5, 15, 2, 3, "2028", ["5", "2028", "6", "2028"]],
  [2026, 12, 31, 2, 2, "6", ["5", "2027", "6", "2027"]],
  [2024, 2, 29, 3, 5, "2025", ["2", "2025", "3", "2025", "4", "2025"]],
] as const)(
  "changes the displayed month's dropdown (%i-%i)",
  async (y, m, d, count, index, value, expected) => {
    const host = await mount(() =>
      vue.h(calendar.RangeCalendar, {
        defaultPlaceholder: date(y, m, d),
        numberOfMonths: count,
        layout: "month-and-year",
      }),
    );
    const select = host.querySelectorAll("select")[index]!;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await vue.nextTick();
    expect(Array.from(host.querySelectorAll("select"), (s) => s.value)).toEqual(expected);
  },
);
it("keeps disabled chips unchanged and follows dynamic enabled state", async () => {
  const disabled = vue.ref(true);
  const value = vue.ref(["alpha"]);
  const host = await mount(() =>
    vue.h(
      combobox.Combobox,
      {
        multiple: true,
        disabled: disabled.value,
        modelValue: value.value,
        "onUpdate:modelValue": (v: string[]) => {
          value.value = v;
        },
      },
      {
        default: () =>
          vue.h(
            combobox.ComboboxChips,
            {},
            {
              default: () => [
                vue.h(combobox.ComboboxChip, { value: "alpha" }, { default: () => "Alpha" }),
                vue.h(combobox.ComboboxChipsInput),
              ],
            },
          ),
      },
    ),
  );
  const remove = host.querySelector('[data-slot="combobox-chip-remove"]') as HTMLButtonElement;
  expect(remove.disabled).toBe(true);
  remove.click();
  host
    .querySelector("input")!
    .dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
  await vue.nextTick();
  expect(value.value).toEqual(["alpha"]);
  disabled.value = false;
  await vue.nextTick();
  expect(remove.disabled).toBe(false);
  remove.click();
  await vue.nextTick();
  expect(value.value).toEqual([]);
});
it("does not clear a disabled single combobox, including synthetic clicks", async () => {
  const disabled = vue.ref(true);
  const value = vue.ref<string | null>("alpha");
  const host = await mount(() =>
    vue.h(
      combobox.Combobox,
      {
        disabled: disabled.value,
        modelValue: value.value,
        "onUpdate:modelValue": (v: string | null) => {
          value.value = v;
        },
      },
      {
        default: () => vue.h(combobox.ComboboxInput, { showClear: true }),
      },
    ),
  );
  const clear = host.querySelector('[data-slot="combobox-clear"]') as HTMLButtonElement;
  expect(clear.disabled).toBe(true);
  clear.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await vue.nextTick();
  expect(value.value).toBe("alpha");
  disabled.value = false;
  await vue.nextTick();
  clear.click();
  await vue.nextTick();
  expect(value.value).toBeNull();
});

it("renders the category label in a generated chart tooltip", () => {
  const template = chart.componentToString(
    { sales: { label: "Sales", color: "red" } },
    chart.ChartTooltipContent,
    { labelKey: "x" },
  );
  const html = document.createElement("div");
  html.innerHTML = template({ x: "January", sales: 42 }, 0);
  expect(html.textContent).toContain("January");
  expect(html.textContent).toContain("Sales");
  expect(html.textContent).toContain("42");
});
