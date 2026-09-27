import { Anatomy } from "../components";

// A placeholder shape that pulses while content loads.
export const skeleton = Anatomy.parse({
  name: "skeleton",
  parts: ["root"],
  states: [],
  axes: {},
  tokens: {},
  base: { root: { base: { background: "{intent.neutral.subtle}", radius: "{radius.md}" } } },
  sizes: {},
  variants: {},
});
