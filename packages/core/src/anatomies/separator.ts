import { Anatomy } from "../components";

// A rule between content, across or down.
export const separator = Anatomy.parse({
  name: "separator",
  parts: ["root"],
  states: [],
  axes: {},
  tokens: {},
  base: { root: { base: { background: "{intent.neutral.border}", height: "{border.width}" } } },
  sizes: {},
  variants: {},
});
