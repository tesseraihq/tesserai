import { Anatomy } from "../components";
import { focusRing } from "./shared";

// Field lays out a label, control, description and error; FieldSet and FieldGroup stack fields.
// A FieldLabel that wraps a whole Field becomes a selectable card: that is the `choice` part.
export const field = Anatomy.parse({
  name: "field",
  parts: ["root", "set", "legend", "group", "content", "label", "choice", "title", "description", "error", "separator", "separator-label"],
  states: ["hover", "focus-visible", "disabled", "invalid", "selected"],
  axes: {},
  tokens: {
    gap: { $type: "dimension", $value: "{space.4}" },
    "content-gap": { $type: "dimension", $value: "{space.2}" },
    "group-gap": { $type: "dimension", $value: "{space.7}" },
    "set-gap": { $type: "dimension", $value: "{space.6}" },
    "font-size": { $type: "dimension", $value: "{font.size.2}" },
    "choice-padding": { $type: "dimension", $value: "{space.4}" },
    "choice-radius": { $type: "dimension", $value: "{radius.md}" },
  },
  base: {
    root: {
      base: { gap: "{field.gap}" },
      states: { invalid: { foreground: "{intent.danger.text}" } },
    },
    set: { base: { gap: "{field.set-gap}" } },
    legend: { base: { fontSize: "{font.size.3}", fontWeight: "{font.weight.medium}", foreground: "{intent.neutral.text-strong}" } },
    group: { base: { gap: "{field.group-gap}" } },
    content: { base: { gap: "{field.content-gap}" } },
    label: { base: { gap: "{space.3}" }, states: { disabled: { opacity: "{opacity.disabled}" } } },
    choice: {
      base: {
        border: "{intent.neutral.border}",
        borderWidth: "{border.width}",
        radius: "{field.choice-radius}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
      states: {
        hover: { background: "{intent.neutral.subtle}" },
        selected: { background: "{intent.primary.subtle}", border: "{intent.primary.border}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
      },
    },
    title: {
      base: { fontSize: "{field.font-size}", fontWeight: "{font.weight.medium}", foreground: "{intent.neutral.text-strong}" },
      states: { disabled: { opacity: "{opacity.disabled}" } },
    },
    description: { base: { fontSize: "{field.font-size}", foreground: "{intent.neutral.text}" } },
    error: { base: { fontSize: "{field.font-size}", foreground: "{intent.danger.text}" } },
    separator: { base: { background: "{intent.neutral.border}" } },
    "separator-label": { base: { fontSize: "{field.font-size}", foreground: "{intent.neutral.text}", background: "{surface.page}", paddingX: "{space.3}" } },
  },
  sizes: {},
  variants: {},
});
