import { px, rem } from "../units";

export { px, rem };

export const ALL_INTENTS = ["primary", "neutral", "danger", "warning", "success", "info"];

// The ring only exists in the focus-visible state; a width in the base would draw it permanently.
export const focusRing = (ring: string) => ({
  ring,
  ringWidth: "{focus.width}",
  ringOffset: "{focus.offset}",
  ringOffsetColor: "{surface.page}",
});

export const disabled = { opacity: "{opacity.disabled}", cursor: "not-allowed" } as const;

// Shared popup surface for select, menu and similar floating lists.
export const popupSurface = {
  background: "{surface.raised}",
  foreground: "{intent.neutral.text-strong}",
  border: "{intent.neutral.border}",
  borderWidth: "{border.width}",
  shadow: "{shadow.md}",
  duration: "{motion.duration.fast}",
  easing: "{motion.easing.standard}",
} as const;
