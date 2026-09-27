import { Anatomy, type Recipe } from "../components";
import type { TokenGroup } from "../tokens";
import { popupSurface, rem } from "./shared";

// The parts every menu has (dropdown menu, context menu, menubar): the floating popup and the rows
// in it, including checkbox and radio rows, submenu triggers, labels, separators and shortcuts.
// A destructive row (shadcn's variant="destructive") is its own part so it can be styled apart.
export const MENU_PARTS = ["popup", "item", "destructive", "item-indicator", "sub-trigger", "label", "separator", "shortcut"] as const;

export function menuTokens(): TokenGroup {
  return {
    popup: {
      padding: { $type: "dimension", $value: "{menu.popup.padding}" },
      radius: { $type: "dimension", $value: "{menu.popup.radius}" },
      "min-width": { $type: "dimension", $value: rem(176) },
    },
    item: {
      height: { $type: "dimension", $value: "{menu.item.height}" },
      "padding-x": { $type: "dimension", $value: "{menu.item.padding-x}" },
      radius: { $type: "dimension", $value: "{menu.item.radius}" },
      "font-size": { $type: "dimension", $value: "{menu.item.font-size}" },
      gap: { $type: "dimension", $value: "{space.3}" },
      highlight: { $type: "color", $value: "{menu.item.highlight}" },
    },
    destructive: { highlight: { $type: "color", $value: "{menu.destructive.highlight}" } },
    "indicator-size": { $type: "dimension", $value: rem(16) },
  };
}

export function menuRecipe(name: string): Recipe {
  const t = (path: string) => `{${name}.${path}}`;
  return {
    popup: {
      base: { ...popupSurface, radius: t("popup.radius"), padding: t("popup.padding"), minWidth: t("popup.min-width") },
    },
    item: {
      base: {
        foreground: "{intent.neutral.text-strong}",
        height: t("item.height"),
        paddingX: t("item.padding-x"),
        radius: t("item.radius"),
        fontSize: t("item.font-size"),
        gap: t("item.gap"),
      },
      states: {
        highlighted: { background: t("item.highlight") },
        disabled: { opacity: "{opacity.disabled}" },
      },
    },
    destructive: {
      base: { foreground: "{intent.danger.text}" },
      states: { highlighted: { background: t("destructive.highlight"), foreground: "{intent.danger.text}" } },
    },
    "item-indicator": { base: { size: t("indicator-size") } },
    "sub-trigger": { states: { open: { background: t("item.highlight") } } },
    label: {
      base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", fontWeight: "{font.weight.medium}", paddingX: t("item.padding-x") },
    },
    separator: { base: { background: "{intent.neutral.border}", height: "{border.width}" } },
    shortcut: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", letterSpacing: "{font.tracking.wide}" } },
  };
}

export function menuAnatomy(name: string, extra: { parts?: string[]; tokens?: TokenGroup; base?: Recipe } = {}): Anatomy {
  return Anatomy.parse({
    name,
    parts: [...(extra.parts ?? []), ...MENU_PARTS],
    states: ["hover", "focus-visible", "highlighted", "disabled", "open"],
    axes: {},
    tokens: { ...menuTokens(), ...extra.tokens },
    base: { ...extra.base, ...menuRecipe(name) },
    sizes: {},
    variants: {},
  });
}
