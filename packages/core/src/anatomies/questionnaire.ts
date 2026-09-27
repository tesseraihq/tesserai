import { Anatomy } from "../components";
import { focusRing, rem } from "./shared";

// Questions one at a time, as an assistant asks them: choices (single or several), free text,
// progress, and back / skip / next.
export const questionnaire = Anatomy.parse({
  name: "questionnaire",
  parts: ["root", "progress", "title", "description", "choices", "choice", "indicator", "shortcut", "input", "error", "actions"],
  states: ["hover", "focus-visible", "selected", "invalid"],
  axes: {},
  tokens: { "indicator-size": { $type: "dimension", $value: rem(16) } },
  base: {
    root: { base: { gap: "{space.6}" } },
    progress: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", fontWeight: "{font.weight.medium}" } },
    title: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.3}", fontWeight: "{font.weight.semibold}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
    choices: { base: { gap: "{space.4}" } },
    choice: {
      base: { border: "{intent.neutral.border-strong}", borderWidth: "{border.width}", radius: "{control.radius}", paddingX: "{space.5}", paddingY: "{space.4}", gap: "{space.4}", fontSize: "{font.size.2}" },
      states: {
        hover: { background: "{intent.neutral.subtle}" },
        selected: { background: "{intent.neutral.subtle}", border: "{intent.primary.border-strong}" },
        invalid: { border: "{intent.danger.border-strong}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
      },
    },
    indicator: {
      base: { border: "{intent.neutral.border-strong}", borderWidth: "{border.width}", size: "{questionnaire.indicator-size}", radius: "{radius.sm}" },
      states: { selected: { background: "{intent.primary.solid}", foreground: "{intent.primary.solid-foreground}", border: "{intent.primary.solid}" } },
    },
    shortcut: { base: { foreground: "{intent.neutral.text}", border: "{intent.neutral.border}", borderWidth: "{border.width}", radius: "{radius.md}", fontFamily: "{font.family.mono}", fontSize: "{font.size.1}" } },
    input: {
      base: { border: "{intent.neutral.border-strong}", borderWidth: "{border.width}", radius: "{control.radius}", height: "{control.height.md}", paddingX: "{control.padding-x}", fontSize: "{control.font-size}" },
      states: { "focus-visible": focusRing("{intent.primary.focus-ring}"), invalid: { border: "{intent.danger.border-strong}" } },
    },
    error: { base: { foreground: "{intent.danger.text}", fontSize: "{font.size.2}" } },
    actions: { base: { gap: "{space.3}" } },
  },
  sizes: {},
  variants: {},
});
