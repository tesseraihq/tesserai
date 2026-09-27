import { Anatomy } from "../components";
import { ALL_INTENTS, focusRing, rem } from "./shared";

export const toast = Anatomy.parse({
  name: "toast",
  parts: ["root", "icon", "title", "description", "action", "close"],
  states: ["hover", "focus-visible"],
  axes: {
    intent: { enabled: ALL_INTENTS, default: "neutral" },
  },
  tokens: {
    padding: { $type: "dimension", $value: "{space.5}" },
    gap: { $type: "dimension", $value: "{space.3}" },
    radius: { $type: "dimension", $value: "{radius.lg}" },
    width: { $type: "dimension", $value: rem(360) },
    "action-height": { $type: "dimension", $value: rem(28) },
  },
  base: {
    root: {
      base: {
        background: "{surface.raised}",
        foreground: "{intent.neutral.text-strong}",
        border: "{intent.*.border}",
        borderWidth: "{border.width}",
        radius: "{toast.radius}",
        shadow: "{shadow.lg}",
        padding: "{toast.padding}",
        gap: "{toast.gap}",
        width: "{toast.width}",
        duration: "{motion.duration.base}",
        easing: "{motion.easing.enter}",
      },
    },
    icon: { base: { foreground: "{intent.*.text}" } },
    title: { base: { fontSize: "{font.size.2}", fontWeight: "{font.weight.medium}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
    // An optional button beside the text (toast.add({ actionProps: { children: "Undo", onClick } })).
    action: {
      base: {
        foreground: "{intent.neutral.text-strong}",
        border: "{intent.neutral.border-strong}",
        borderWidth: "{border.width}",
        radius: "{radius.sm}",
        height: "{toast.action-height}",
        paddingX: "{space.3}",
        fontSize: "{font.size.1}",
        fontWeight: "{font.weight.medium}",
      },
      states: { hover: { background: "{intent.neutral.subtle}" }, "focus-visible": focusRing("{intent.primary.focus-ring}") },
    },
    close: {
      base: { foreground: "{intent.neutral.text}", radius: "{radius.sm}" },
      states: { hover: { foreground: "{intent.neutral.text-strong}" }, "focus-visible": focusRing("{intent.primary.focus-ring}") },
    },
  },
  sizes: {},
  variants: {},
});
