import { Anatomy } from "../components";
import { rem } from "./shared";

export const tooltip = Anatomy.parse({
  name: "tooltip",
  parts: ["popup", "arrow"],
  states: [],
  axes: {},
  tokens: {
    "padding-x": { $type: "dimension", $value: "{space.3}" },
    "padding-y": { $type: "dimension", $value: "{space.2}" },
    radius: { $type: "dimension", $value: "{radius.md}" },
    "font-size": { $type: "dimension", $value: "{font.size.1}" },
    "max-width": { $type: "dimension", $value: rem(280) },
    "arrow-size": { $type: "dimension", $value: rem(10) },
  },
  base: {
    popup: {
      base: {
        // Inverted: the strongest text color as the surface, the page surface as the text.
        background: "{intent.neutral.text-strong}",
        foreground: "{intent.neutral.background}",
        paddingX: "{tooltip.padding-x}",
        paddingY: "{tooltip.padding-y}",
        radius: "{tooltip.radius}",
        fontSize: "{tooltip.font-size}",
        maxWidth: "{tooltip.max-width}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
    },
    // A small diamond on the edge nearest the trigger, the popup's color.
    arrow: { base: { background: "{intent.neutral.text-strong}", size: "{tooltip.arrow-size}" } },
  },
  sizes: {},
  variants: {},
});
