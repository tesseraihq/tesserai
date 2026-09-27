import { Anatomy } from "../components";

export const label = Anatomy.parse({
  name: "label",
  parts: ["root"],
  states: ["disabled"],
  axes: {},
  tokens: {
    "font-size": { $type: "dimension", $value: "{font.size.2}" },
    "font-weight": { $type: "fontWeight", $value: "{font.weight.medium}" },
    gap: { $type: "dimension", $value: "{space.3}" },
  },
  base: {
    root: {
      base: {
        foreground: "{intent.neutral.text-strong}",
        fontSize: "{label.font-size}",
        fontWeight: "{label.font-weight}",
        gap: "{label.gap}",
      },
      // A label dims with the control it names.
      states: { disabled: { opacity: "{opacity.disabled}" } },
    },
  },
  sizes: {},
  variants: {},
});
