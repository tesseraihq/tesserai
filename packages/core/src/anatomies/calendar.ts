import { Anatomy } from "../components";
import { focusRing, rem } from "./shared";

// A month grid for picking a day or a range (react-day-picker on Base UI and Radix, React Aria's
// own Calendar). Days are the system's ghost buttons; these parts are what makes a day selected,
// in a range, today, or outside the month.
export const calendar = Anatomy.parse({
  name: "calendar",
  parts: ["root", "caption", "weekday", "day", "selected", "range", "today", "outside", "dropdown"],
  states: ["focus-visible"],
  axes: {},
  tokens: {
    "cell-size": { $type: "dimension", $value: rem(32) },
    "cell-radius": { $type: "dimension", $value: "{radius.md}" },
    padding: { $type: "dimension", $value: "{space.4}" },
  },
  base: {
    root: { base: { background: "{surface.page}", padding: "{calendar.padding}" } },
    caption: { base: { fontSize: "{font.size.2}", fontWeight: "{font.weight.medium}" } },
    weekday: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}" } },
    day: { base: { foreground: "{intent.neutral.text-strong}", fontSize: "{font.size.2}" }, states: { "focus-visible": focusRing("{intent.primary.focus-ring}") } },
    selected: { base: { background: "{intent.primary.solid}", foreground: "{intent.primary.solid-foreground}" } },
    range: { base: { background: "{intent.neutral.subtle}", foreground: "{intent.neutral.text-strong}" } },
    today: { base: { background: "{intent.neutral.subtle}", foreground: "{intent.neutral.text-strong}" } },
    outside: { base: { foreground: "{intent.neutral.text}" } },
    dropdown: {
      base: { border: "{intent.neutral.border-strong}", borderWidth: "{border.width}", radius: "{calendar.cell-radius}" },
      states: { "focus-visible": focusRing("{intent.primary.focus-ring}") },
    },
  },
  sizes: {},
  variants: {},
});
