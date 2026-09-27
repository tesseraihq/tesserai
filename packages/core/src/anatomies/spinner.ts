import { Anatomy } from "../components";
import { rem } from "./shared";

// A spinning loading indicator in the current text color.
export const spinner = Anatomy.parse({
  name: "spinner",
  parts: ["root"],
  states: [],
  axes: {},
  tokens: { size: { $type: "dimension", $value: rem(16) } },
  base: { root: { base: { size: "{spinner.size}" } } },
  sizes: {},
  variants: {},
});
