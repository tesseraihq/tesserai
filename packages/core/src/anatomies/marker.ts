import { Anatomy } from "../components";

// A quiet line in a conversation: a date, "Ada joined", "New messages". Plain, between rules, or ruled below.
export const marker = Anatomy.parse({
  name: "marker",
  parts: ["root", "rule"],
  states: [],
  axes: {},
  tokens: {},
  base: {
    root: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}", gap: "{space.3}" } },
    rule: { base: { background: "{intent.neutral.border}", height: "{border.width}" } },
  },
  sizes: {},
  variants: {},
});
