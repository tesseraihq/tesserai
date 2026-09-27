import { Anatomy } from "../components";

export const card = Anatomy.parse({
  name: "card",
  parts: ["root", "header", "title", "description", "action", "content", "footer"],
  states: [],
  axes: {
    size: { enabled: ["sm", "md"], default: "md" },
  },
  tokens: {
    padding: {
      sm: { $type: "dimension", $value: "{space.4}" },
      md: { $type: "dimension", $value: "{space.6}" },
    },
    gap: {
      sm: { $type: "dimension", $value: "{space.3}" },
      md: { $type: "dimension", $value: "{space.5}" },
    },
    radius: { $type: "dimension", $value: "{radius.lg}" },
  },
  base: {
    root: {
      base: {
        background: "{surface.card}",
        foreground: "{intent.neutral.text-strong}",
        border: "{intent.neutral.border}",
        borderWidth: "{border.width}",
        radius: "{card.radius}",
        shadow: "{shadow.sm}",
      },
    },
    title: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.3}", fontWeight: "{font.weight.semibold}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
  },
  sizes: {
    sm: { root: { base: { padding: "{card.padding.sm}", gap: "{card.gap.sm}" } } },
    md: { root: { base: { padding: "{card.padding.md}", gap: "{card.gap.md}" } } },
  },
  variants: {},
});
