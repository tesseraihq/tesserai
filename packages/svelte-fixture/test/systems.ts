import { applyChangeset, PRESETS, type DesignSystem } from "@tesserai/core";

// The systems the Svelte output is held to the React output on: the default preset as it comes,
// and one changed in every way that reaches the everyday components' classes: added, renamed and
// left-out options, new defaults, a new intent, and styles scoped to a variant, an intent, a size, a
// combination and a state (the same changes templates/src/pieces.test.ts makes). Built from
// operations, the words the builder and the AI use, so they stay valid as the schema moves.
export const DEFAULT_SYSTEM: DesignSystem = PRESETS[0]!.build();

const all = { kind: "all" } as const;
const style = (component: string, part: string, property: string, value: string, scope: object = all, state = "default") => ({
  op: "component.setStyle",
  input: { component, part, scope, state, property, value },
});

export function customSystem(): DesignSystem {
  const ops = [
    { op: "palette.setColor", input: { name: "brand", color: "#0f766e" } },
    { op: "palette.add", input: { name: "violet", color: "#7c3aed" } },
    { op: "intent.add", input: { name: "accent", palette: "violet", addToComponents: true } },
    { op: "type.setFont", input: { role: "heading", families: ["Fraunces", "Georgia", "serif"] } },
    { op: "type.setScale", input: { base: 15 } },
    { op: "radius.set", input: { base: 10 } },
    style("button", "root", "radius", "{radius.full}", { kind: "intent", name: "primary" }),
    style("button", "root", "borderWidth", "2px", { kind: "variant", name: "outline" }),
    style("button", "root", "shadow", "{shadow.sm}", all, "hover"),
    { op: "component.addOption", input: { component: "button", axis: "size", name: "xl", copyFrom: "lg" } },
    { op: "component.setStyle", input: { component: "dialog", part: "popup", scope: all, property: "borderWidth", value: "1px", mode: { colorScheme: "dark" } } },
    style("dialog", "title", "fontSize", "{font.size.5}"),
    style("dialog", "close", "background", "{intent.danger.subtle}", all, "hover"),
    { op: "component.addOption", input: { component: "badge", axis: "size", name: "lg", copyFrom: "md" } },
    { op: "component.renameOption", input: { component: "badge", axis: "variant", name: "soft", to: "tonal" } },
    style("badge", "root", "textTransform", "uppercase", { kind: "size", name: "sm" }),
    style("badge", "root", "fontWeight", "700", { kind: "intent", name: "danger" }, "hover"),
    { op: "component.addOption", input: { component: "input", axis: "size", name: "xl", copyFrom: "lg" } },
    style("input", "placeholder", "fontStyle", "italic"),
    style("input", "root", "letterSpacing", "1px", { kind: "size", name: "sm" }),
    style("textarea", "root", "textTransform", "lowercase", all, "disabled"),
    style("label", "root", "textTransform", "uppercase"),
    style("field", "label", "fontStyle", "italic"),
    style("field", "choice", "border", "{intent.primary.border}", all, "selected"),
    style("checkbox", "root", "radius", "{radius.full}", { kind: "size", name: "sm" }),
    style("checkbox", "indicator", "opacity", "0.9", all, "disabled"),
    { op: "component.addOption", input: { component: "switch", axis: "size", name: "lg", copyFrom: "md" } },
    { op: "component.addOption", input: { component: "radio-group", axis: "size", name: "lg", copyFrom: "md" } },
    style("radio-group", "item", "scale", "0.95", all, "pressed"),
    { op: "component.setDefault", input: { component: "select", axis: "size", option: "lg" } },
    style("select", "item", "fontWeight", "600", all, "selected"),
    style("select", "trigger", "textTransform", "uppercase", { kind: "size", name: "sm" }),
    style("native-select", "select", "fontStyle", "italic", { kind: "size", name: "sm" }),
    { op: "component.setOption", input: { component: "card", axis: "size", option: "sm", enabled: false } },
    style("card", "title", "textTransform", "uppercase"),
    style("separator", "root", "opacity", "0.5"),
    style("skeleton", "root", "radius", "{radius.full}"),
    style("spinner", "root", "opacity", "0.7"),
    style("kbd", "root", "fontStyle", "italic"),
    { op: "component.addOption", input: { component: "alert", axis: "variant", name: "solid", copyFrom: "soft" } },
    style("alert", "title", "fontWeight", "700", { kind: "intent", name: "danger" }),
    style("avatar", "fallback", "textTransform", "uppercase", { kind: "size", name: "lg" }),
    style("typography", "h2", "textTransform", "uppercase"),
    style("table", "row", "fontWeight", "600", all, "selected"),
    { op: "component.addOption", input: { component: "tabs", axis: "variant", name: "pill", copyFrom: "segmented" } },
    style("tabs", "tab", "textTransform", "uppercase", { kind: "variant", name: "line" }),
    style("accordion", "trigger", "textTransform", "uppercase"),
    style("accordion", "content", "duration", "300ms"),
    style("collapsible", "content", "duration", "300ms"),
    style("toggle", "root", "fontWeight", "700", { kind: "combination", when: { variant: "outline", size: "sm" } }),
    { op: "component.setDefault", input: { component: "toggle", axis: "variant", option: "outline" } },
    style("toggle-group", "group", "gap", "{space.2}"),
    style("tooltip", "arrow", "opacity", "0.9"),
    style("popover", "title", "textTransform", "uppercase"),
    style("dropdown-menu", "item", "fontWeight", "500", all, "highlighted"),
    style("dropdown-menu", "shortcut", "fontStyle", "italic"),
    style("progress", "indicator", "opacity", "0.8"),
    style("slider", "thumb", "scale", "1.1", all, "dragging"),
    style("breadcrumb", "link", "textDecoration", "underline", all, "hover"),
    style("pagination", "ellipsis", "opacity", "0.6"),
    { op: "component.addOption", input: { component: "alert-dialog", axis: "size", name: "lg", copyFrom: "md" } },
    style("alert-dialog", "title", "textTransform", "uppercase"),
    style("sheet", "popup", "shadow", "{shadow.sm}"),
  ];
  const applied = applyChangeset(PRESETS[0]!.build(), { summary: "customized", ops } as never);
  if (!applied.ok) throw new Error(`the customized system's operations don't apply: ${applied.error}`);
  return applied.system;
}
