import { Anatomy } from "../components";
import { disabled, focusRing, rem } from "./shared";

// The application sidebar: collapsible (off-canvas or to icons), floating or inset, a sheet on
// phones. --sidebar-width and --sidebar-width-icon are shadcn's own variable names.
export const sidebar = Anatomy.parse({
  name: "sidebar",
  parts: ["surface", "section", "label", "item", "action", "badge", "sub", "inset", "rail"],
  states: ["hover", "focus-visible", "current", "disabled"],
  axes: {
    // SidebarMenuButton's size.
    size: { enabled: ["sm", "md", "lg"], default: "md" },
  },
  tokens: {
    width: { $type: "dimension", $value: rem(256) },
    "width-icon": { $type: "dimension", $value: rem(48) },
    "width-mobile": { $type: "dimension", $value: rem(288) },
    item: {
      height: {
        sm: { $type: "dimension", $value: rem(28) },
        md: { $type: "dimension", $value: rem(32) },
        lg: { $type: "dimension", $value: rem(48) },
      },
    },
  },
  base: {
    surface: { base: { background: "{surface.card}", foreground: "{intent.neutral.text-strong}", border: "{intent.neutral.border}", borderWidth: "{border.width}" } },
    section: { base: { padding: "{space.3}", gap: "{space.3}" } },
    label: {
      base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", fontWeight: "{font.weight.medium}", height: "{sidebar.item.height.md}", paddingX: "{space.3}", radius: "{radius.md}" },
      states: { "focus-visible": focusRing("{intent.primary.focus-ring}") },
    },
    item: {
      base: { radius: "{radius.md}", paddingX: "{space.3}", gap: "{space.3}", fontSize: "{font.size.2}", duration: "{motion.duration.fast}", easing: "{motion.easing.standard}" },
      states: {
        hover: { background: "{intent.neutral.subtle}" },
        current: { background: "{intent.neutral.subtle}", fontWeight: "{font.weight.medium}" },
        "focus-visible": focusRing("{intent.primary.focus-ring}"),
        disabled,
      },
    },
    action: {
      base: { foreground: "{intent.neutral.text}", radius: "{radius.md}" },
      states: { hover: { background: "{intent.neutral.subtle}", foreground: "{intent.neutral.text-strong}" }, "focus-visible": focusRing("{intent.primary.focus-ring}") },
    },
    badge: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", fontWeight: "{font.weight.medium}", radius: "{radius.md}" } },
    sub: { base: { border: "{intent.neutral.border}", borderWidth: "{border.width}", gap: "{space.2}" } },
    inset: { base: { background: "{surface.page}", radius: "{radius.xl}", shadow: "{shadow.sm}" } },
    rail: { base: { background: "{intent.neutral.border}" } },
  },
  sizes: {
    sm: { item: { base: { height: "{sidebar.item.height.sm}", fontSize: "{font.size.1}" } } },
    md: { item: { base: { height: "{sidebar.item.height.md}" } } },
    lg: { item: { base: { height: "{sidebar.item.height.lg}" } } },
  },
  variants: {},
});
