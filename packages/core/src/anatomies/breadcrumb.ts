import { Anatomy } from "../components";
import { focusRing, rem } from "./shared";

// Where you are: links to each level above, the current page last.
export const breadcrumb = Anatomy.parse({
  name: "breadcrumb",
  parts: ["list", "link", "page", "separator", "ellipsis"],
  states: ["hover", "focus-visible"],
  axes: {},
  tokens: {
    gap: { $type: "dimension", $value: "{space.3}" },
    "font-size": { $type: "dimension", $value: "{font.size.2}" },
    "separator-size": { $type: "dimension", $value: rem(14) },
    "ellipsis-size": { $type: "dimension", $value: rem(20) },
  },
  base: {
    list: { base: { foreground: "{intent.neutral.text}", fontSize: "{breadcrumb.font-size}", gap: "{breadcrumb.gap}" } },
    link: {
      base: { radius: "{radius.sm}", duration: "{motion.duration.fast}", easing: "{motion.easing.standard}" },
      states: { hover: { foreground: "{intent.neutral.text-strong}" }, "focus-visible": focusRing("{intent.primary.focus-ring}") },
    },
    page: { base: { foreground: "{intent.neutral.text-strong}" } },
    separator: { base: { size: "{breadcrumb.separator-size}" } },
    ellipsis: { base: { size: "{breadcrumb.ellipsis-size}" } },
  },
  sizes: {},
  variants: {},
});
