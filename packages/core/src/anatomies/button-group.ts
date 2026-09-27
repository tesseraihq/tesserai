import { Anatomy } from "../components";

// Buttons (and inputs, selects, text) joined into one control. The buttons keep their own look;
// the group only joins their edges, and styles its text and separator.
export const buttonGroup = Anatomy.parse({
  name: "button-group",
  parts: ["text", "separator"],
  states: [],
  axes: {},
  tokens: {},
  base: {
    text: {
      base: {
        background: "{intent.neutral.subtle}",
        foreground: "{intent.neutral.text-strong}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{button.radius}",
        paddingX: "{space.4}",
        gap: "{space.3}",
        fontSize: "{font.size.2}",
        fontWeight: "{font.weight.medium}",
      },
    },
    separator: { base: { background: "{intent.neutral.border-strong}" } },
  },
  sizes: {},
  variants: {},
});
