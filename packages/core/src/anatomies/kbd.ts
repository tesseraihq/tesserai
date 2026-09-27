import { Anatomy } from "../components";
import { rem } from "./shared";

// A key or shortcut, e.g. ⌘K.
export const kbd = Anatomy.parse({
  name: "kbd",
  parts: ["root", "group"],
  states: [],
  axes: {},
  tokens: { height: { $type: "dimension", $value: rem(20) } },
  base: {
    root: {
      base: {
        background: "{intent.neutral.subtle}",
        foreground: "{intent.neutral.text}",
        radius: "{radius.sm}",
        height: "{kbd.height}",
        minWidth: "{kbd.height}",
        paddingX: "{space.2}",
        gap: "{space.2}",
        fontSize: "{font.size.1}",
        fontWeight: "{font.weight.medium}",
      },
    },
    group: { base: { gap: "{space.2}" } },
  },
  sizes: {},
  variants: {},
});
