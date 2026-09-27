import { Anatomy } from "../components";
import { ALL_INTENTS, rem } from "./shared";

// A message in the page: an optional icon, a title, a description and an action at the top right.
export const alert = Anatomy.parse({
  name: "alert",
  parts: ["root", "icon", "title", "description", "action"],
  states: [],
  axes: {
    variant: { enabled: ["outline", "soft"], default: "outline" },
    intent: { enabled: ALL_INTENTS, default: "neutral" },
  },
  tokens: {
    "padding-x": { $type: "dimension", $value: "{space.5}" },
    "padding-y": { $type: "dimension", $value: "{space.4}" },
    radius: { $type: "dimension", $value: "{radius.lg}" },
    "icon-size": { $type: "dimension", $value: rem(16) },
  },
  base: {
    root: {
      base: {
        foreground: "{intent.*.text-strong}",
        radius: "{alert.radius}",
        paddingX: "{alert.padding-x}",
        paddingY: "{alert.padding-y}",
        gap: "{space.4}",
        fontSize: "{font.size.2}",
      },
    },
    icon: { base: { foreground: "{intent.*.text}", size: "{alert.icon-size}" } },
    title: { base: { fontWeight: "{font.weight.medium}" } },
    description: { base: { foreground: "{intent.*.text}" } },
  },
  sizes: {},
  variants: {
    outline: { root: { base: { background: "{surface.card}", border: "{intent.*.border}", borderWidth: "{border.width}" } } },
    soft: { root: { base: { background: "{intent.*.subtle}" } } },
  },
});
