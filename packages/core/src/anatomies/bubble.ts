import { ALL_INTENTS } from "./shared";
import { Anatomy } from "../components";

// A chat bubble: its look is variant × intent, with shadcn's names (default, secondary, muted,
// tinted, outline, ghost, destructive) as aliases.
export const bubble = Anatomy.parse({
  name: "bubble",
  parts: ["content", "reactions", "group"],
  // Hover applies when the content is a button or link.
  states: ["hover"],
  axes: {
    variant: { enabled: ["solid", "soft", "outline", "ghost"], default: "solid" },
    intent: { enabled: ALL_INTENTS, default: "primary" },
  },
  tokens: {},
  base: {
    content: { base: { radius: "{radius.xl}", paddingX: "{space.4}", paddingY: "{space.3}", fontSize: "{font.size.2}", borderWidth: "{border.width}" } },
    reactions: { base: { background: "{intent.neutral.subtle}", radius: "{radius.full}", ring: "{surface.card}", ringWidth: "{focus.width}", paddingX: "{space.2}", fontSize: "{font.size.2}", gap: "{space.2}" } },
    group: { base: { gap: "{space.3}" } },
  },
  sizes: {},
  variants: {
    solid: { content: { base: { background: "{intent.*.solid}", foreground: "{intent.*.solid-foreground}", border: "{intent.*.solid}" }, states: { hover: { background: "{intent.*.solid-hover}" } } } },
    soft: { content: { base: { background: "{intent.*.subtle}", foreground: "{intent.*.subtle-foreground}", border: "{intent.*.subtle}" }, states: { hover: { background: "{intent.*.subtle-hover}" } } } },
    outline: { content: { base: { background: "{surface.page}", foreground: "{intent.*.text-strong}", border: "{intent.*.border}" }, states: { hover: { background: "{intent.*.subtle}" } } } },
    ghost: { content: { base: { foreground: "{intent.*.text-strong}", border: "{surface.page}" }, states: { hover: { background: "{intent.*.subtle}" } } } },
  },
});
