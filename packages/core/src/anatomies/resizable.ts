import { Anatomy } from "../components";
import { focusRing, rem } from "./shared";

// Panels with draggable dividers between them.
export const resizable = Anatomy.parse({
  name: "resizable",
  parts: ["handle", "grip"],
  states: ["focus-visible"],
  axes: {},
  tokens: { "grip-length": { $type: "dimension", $value: rem(24) } },
  base: {
    handle: { base: { background: "{intent.neutral.border}" }, states: { "focus-visible": focusRing("{intent.primary.focus-ring}") } },
    // withHandle: a visible pill on the divider.
    grip: { base: { background: "{intent.neutral.border-strong}", radius: "{radius.full}", height: "{resizable.grip-length}" } },
  },
  sizes: {},
  variants: {},
});
