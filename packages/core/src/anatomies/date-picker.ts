import { Anatomy } from "../components";
import { rem } from "./shared";

// A button showing the chosen date that opens the Calendar in a Popover: the system's Button,
// Popover and Calendar, composed as shadcn's docs do.
export const datePicker = Anatomy.parse({
  name: "date-picker",
  parts: ["trigger", "placeholder"],
  states: [],
  axes: {},
  tokens: { width: { $type: "dimension", $value: rem(240) } },
  base: {
    // A chosen date reads as a value; the placeholder stays soft.
    trigger: { base: { width: "{date-picker.width}", foreground: "{intent.neutral.text-strong}" } },
    placeholder: { base: { foreground: "{intent.neutral.text}" } },
  },
  sizes: {},
  variants: {},
});
