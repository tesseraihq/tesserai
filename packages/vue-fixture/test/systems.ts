import { applyChangeset, PRESETS, sanitizeSvg, type DesignSystem } from "@tesserai/core";
import { renderAll, type Target } from "@tesserai/templates";
import { writeGenerated } from "../harness";

// The systems the parity tests compare on: the default preset as it comes, and one customized
// hard through the same operations the builder and the AI use (a new intent on every component,
// an extra button size, a changed default variant, a left-out variant and its shadcn alias, style
// overrides scoped by intent and on the dialog's parts).
export const SYSTEMS: Record<string, () => DesignSystem> = {
  default: () => PRESETS[0]!.build(),
  custom: () => {
    const ops = [
      { op: "palette.setColor", input: { name: "brand", color: "#0f766e" } },
      { op: "palette.add", input: { name: "violet", color: "#7c3aed" } },
      { op: "intent.add", input: { name: "accent", palette: "violet", addToComponents: true } },
      { op: "type.setScale", input: { base: 15 } },
      { op: "radius.set", input: { base: 10 } },
      { op: "component.setStyle", input: { component: "button", part: "root", scope: { kind: "intent", name: "primary" }, property: "radius", value: "{radius.full}" } },
      { op: "component.setStyle", input: { component: "button", part: "root", scope: { kind: "combination", when: { variant: "outline", intent: "accent" } }, property: "borderWidth", value: "2px" } },
      { op: "component.addOption", input: { component: "button", axis: "size", name: "xl", copyFrom: "lg" } },
      { op: "component.setDefault", input: { component: "button", axis: "variant", option: "outline" } },
      { op: "component.setOption", input: { component: "button", axis: "variant", option: "link", enabled: false } },
      { op: "component.setStyle", input: { component: "dialog", part: "popup", scope: { kind: "all" }, property: "borderWidth", value: "1px" } },
      { op: "component.setStyle", input: { component: "dialog", part: "popup", scope: { kind: "all" }, property: "padding", value: "{space.8}" } },
      { op: "component.setStyle", input: { component: "dialog", part: "close", scope: { kind: "all" }, state: "hover", property: "background", value: "{intent.primary.subtle}" } },
      { op: "component.setStyle", input: { component: "dialog", part: "backdrop", scope: { kind: "all" }, property: "background", value: "{surface.backdrop}", mode: { colorScheme: "dark" } } },
      // A chosen combobox row, which Reka marks its own way (slots.ts REKA_CLASSES), and a current link.
      { op: "component.setStyle", input: { component: "combobox", part: "item", scope: { kind: "all" }, state: "selected", property: "fontWeight", value: "600" } },
      { op: "component.setStyle", input: { component: "navigation-menu", part: "link", scope: { kind: "all" }, state: "current", property: "textDecoration", value: "underline" } },
    ];
    const applied = applyChangeset(PRESETS[0]!.build(), { summary: "parity fixture", ops } as never);
    if (!applied.ok) throw new Error(`the custom system's operations don't apply: ${applied.error}`);
    return applied.system;
  },
};

// A logo as the builder stores one: cleaned (colors of its own), with a dark version.
const logo = (fill: string) => {
  const cleaned = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24"><rect width="48" height="24" rx="4" fill="${fill}"/><circle cx="12" cy="12" r="6" fill="#fff"/></svg>`, { currentColor: false });
  if (!cleaned.ok) throw new Error(cleaned.problem);
  return cleaned.icon.svg;
};
const mark = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>`);

// The default preset drawn with each icon library the builder offers (with a weight, a stroke,
// spots taken from another library, and icons of the system's own), for the icon pass.
function withIcons(ops: object[]): () => DesignSystem {
  return () => {
    const applied = applyChangeset(PRESETS[0]!.build(), { summary: "icons fixture", ops } as never);
    if (!applied.ok) throw new Error(`the icon operations don't apply: ${applied.error}`);
    return applied.system;
  };
}
export const ICON_SYSTEMS: Record<string, () => DesignSystem> = {
  tabler: withIcons([
    { op: "icons.setLibrary", input: { library: "tabler" } },
    { op: "icons.setSpot", input: { spot: "select:chevron-down", icon: "remix:RiArrowDownSFill" } },
  ]),
  phosphor: withIcons([{ op: "icons.setLibrary", input: { library: "phosphor" } }]),
  "phosphor-bold": withIcons([
    { op: "icons.setLibrary", input: { library: "phosphor" } },
    { op: "icons.setWeight", input: { weight: "bold" } },
    { op: "icons.setSpot", input: { spot: "spinner:loader-2", icon: "tabler:IconLoader3" } },
  ]),
  hugeicons: withIcons([
    { op: "icons.setLibrary", input: { library: "hugeicons" } },
    { op: "icons.setStroke", input: { stroke: 1.5 } },
    { op: "icons.setSpot", input: { spot: "checkbox:check", icon: "lucide:BadgeCheckIcon" } },
  ]),
  remix: withIcons([
    { op: "icons.setLibrary", input: { library: "remix" } },
    { op: "icons.setWeight", input: { weight: "fill" } },
    { op: "icons.addCustom", input: { id: "acme-logo", icon: { name: "Acme", svg: logo("#0f766e"), dark: logo("#5eead4") } } },
    { op: "icons.addCustom", input: { id: "acme-mark", icon: { name: "Acme mark", svg: mark.ok ? mark.icon.svg : "" } } },
    { op: "icons.setSpot", input: { spot: "dialog:x", icon: "custom:acme-mark" } },
    { op: "icons.setSpot", input: { spot: "sheet:x", icon: "custom:acme-logo" } },
    { op: "icons.setSpot", input: { spot: "breadcrumb:more-horizontal", icon: "custom:acme-logo" } },
    { op: "icons.setSpot", input: { spot: "pagination:chevron-left", icon: "custom:acme-mark" } },
    { op: "icons.setSpot", input: { spot: "dropdown-menu:chevron-right", icon: "hugeicons:ArrowRight01Icon" } },
  ]),
};

// A system's generated code for one target, written to generated/<run>/.
export async function writeRun(run: string, target: Target, system: DesignSystem): Promise<string> {
  return writeGenerated(run, await renderAll(target, system));
}
