import { Anatomy } from "../components";
import { popupSurface, rem } from "./shared";

export const popover = Anatomy.parse({
  name: "popover",
  parts: ["popup", "header", "title", "description"],
  states: [],
  axes: {},
  tokens: {
    padding: { $type: "dimension", $value: "{space.5}" },
    gap: { $type: "dimension", $value: "{space.4}" },
    radius: { $type: "dimension", $value: "{radius.lg}" },
    width: { $type: "dimension", $value: rem(288) },
  },
  base: {
    popup: {
      base: { ...popupSurface, radius: "{popover.radius}", padding: "{popover.padding}", gap: "{popover.gap}", width: "{popover.width}" },
    },
    header: { base: { gap: "{space.2}" } },
    title: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.2}", fontWeight: "{font.weight.semibold}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
  },
  sizes: {},
  variants: {},
});
