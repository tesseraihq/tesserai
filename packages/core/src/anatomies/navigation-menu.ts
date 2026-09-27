import { Anatomy } from "../components";
import { disabled, focusRing, popupSurface, rem } from "./shared";

// Site navigation whose items open panels of links on hover or click (Base UI and Radix only;
// React Aria has no equivalent).
export const navigationMenu = Anatomy.parse({
  name: "navigation-menu",
  parts: ["trigger", "icon", "popup", "content", "link", "indicator"],
  states: ["hover", "focus-visible", "open", "disabled", "current"],
  axes: {},
  tokens: {
    trigger: {
      height: { $type: "dimension", $value: "{control.height.md}" },
      "padding-x": { $type: "dimension", $value: "{space.4}" },
    },
    "icon-size": { $type: "dimension", $value: rem(12) },
    "content-padding": { $type: "dimension", $value: "{space.3}" },
    radius: { $type: "dimension", $value: "{radius.lg}" },
    // Links sit in the popup, so they highlight as rows in every other popup list do.
    link: { highlight: { $type: "color", $value: "{menu.item.highlight}" } },
  },
  base: {
    trigger: {
      base: {
        foreground: "{intent.neutral.text-strong}",
        height: "{navigation-menu.trigger.height}",
        paddingX: "{navigation-menu.trigger.padding-x}",
        radius: "{radius.md}",
        fontSize: "{font.size.2}",
        fontWeight: "{font.weight.medium}",
        gap: "{space.2}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
      states: {
        hover: { background: "{intent.neutral.subtle}" },
        open: { background: "{intent.neutral.subtle}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
        disabled,
      },
    },
    icon: { base: { size: "{navigation-menu.icon-size}", duration: "{motion.duration.base}", easing: "{motion.easing.standard}" } },
    popup: { base: { ...popupSurface, radius: "{navigation-menu.radius}" } },
    content: { base: { padding: "{navigation-menu.content-padding}" } },
    link: {
      base: { radius: "{radius.sm}", padding: "{space.3}", fontSize: "{font.size.2}", gap: "{space.2}", duration: "{motion.duration.fast}", easing: "{motion.easing.standard}" },
      states: {
        hover: { background: "{navigation-menu.link.highlight}" },
        current: { background: "{navigation-menu.link.highlight}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
      },
    },
    indicator: { base: { background: "{intent.neutral.border}" } },
  },
  sizes: {},
  variants: {},
});
