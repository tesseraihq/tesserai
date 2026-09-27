import { Anatomy } from "../components";
import { rem } from "./shared";

// Sonner, shadcn's toast library: toast("Saved") from anywhere, stacked and swipeable. Its
// defaults match Toast's so the two look alike.
export const sonner = Anatomy.parse({
  name: "sonner",
  parts: ["toast", "title", "description", "action", "cancel"],
  states: [],
  axes: {},
  tokens: {
    padding: { $type: "dimension", $value: "{space.5}" },
    gap: { $type: "dimension", $value: "{space.3}" },
    radius: { $type: "dimension", $value: "{radius.lg}" },
    width: { $type: "dimension", $value: rem(360) },
  },
  base: {
    toast: {
      base: {
        background: "{surface.raised}",
        foreground: "{intent.neutral.text-strong}",
        border: "{intent.neutral.border}",
        borderWidth: "{border.width}",
        radius: "{sonner.radius}",
        shadow: "{shadow.lg}",
        padding: "{sonner.padding}",
        gap: "{sonner.gap}",
        width: "{sonner.width}",
      },
    },
    title: { base: { fontSize: "{font.size.2}", fontWeight: "{font.weight.medium}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
    action: {
      base: {
        background: "{intent.primary.solid}",
        foreground: "{intent.primary.solid-foreground}",
        radius: "{radius.sm}",
        fontSize: "{font.size.1}",
        fontWeight: "{font.weight.medium}",
      },
    },
    cancel: {
      base: { background: "{intent.neutral.subtle}", foreground: "{intent.neutral.text-strong}", radius: "{radius.sm}", fontSize: "{font.size.1}", fontWeight: "{font.weight.medium}" },
    },
  },
  sizes: {},
  variants: {},
});
