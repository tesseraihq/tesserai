import { SHADCN_VARIANT_ALIASES, type DesignSystem } from "@tesserai/core";
import { renderAll, type GeneratedFile } from "@tesserai/templates";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aliasesFor, createRenderer, generatedDir, writeGenerated, type Renderer } from "../harness";
import { domCases } from "./cases";
import { styledSlots, type Styled } from "./classes";
import { allowing, asReactClasses, LIBRARY_CLASSES, seenLibrary, slotElements, withoutOneSided, type Allowed, type SlotElement } from "./dom";
import { customSystem, DEFAULT_SYSTEM } from "./systems";

// The Svelte output is held to the React output the builder previews, on the library Bits UI is
// shaped like (Radix). Static parity compares the classes the two print for each data-slot, for
// every component; DOM parity renders both on the server with the same props and compares each
// data-slot element's tag, classes and data attributes.

const EVERYDAY = [
  "button", "badge", "input", "textarea", "label", "field", "checkbox", "switch", "radio-group", "select", "native-select", "card", "separator", "skeleton",
  "spinner", "kbd", "alert", "avatar", "typography", "table", "tabs", "accordion", "collapsible", "toggle", "toggle-group", "tooltip", "popover", "dialog",
  "alert-dialog", "sheet", "dropdown-menu", "progress", "slider", "breadcrumb", "pagination",
  "aspect-ratio", "button-group", "empty", "item", "input-group", "input-otp", "scroll-area", "resizable", "sidebar", "carousel",
];
// Beyond the everyday set.
const MORE = [
  "message", "bubble", "attachment", "marker",
  "data-table",
  "calendar", "date-picker",
  // Menus, overlays, pickers and toasts.
  "context-menu", "menubar", "hover-card", "drawer", "command", "combobox", "navigation-menu", "toast", "sonner",
  // The long tail.
  "chart", "message-scroller", "questionnaire",
];

// Each library marks its parts with attributes of its own for its own lookups: Bits one named after
// the part (data-dialog-content, data-select-item…), Radix data-radix-* (a roving-focus collection's
// items, a menu's content). No class selects them; they're dropped before comparing.
const BITS_PART_ATTRIBUTE = /^data-(accordion|alert-dialog|avatar|checkbox|collapsible|dialog|label|menu|popover|progress|radio-group|select|separator|slider|switch|tabs|toggle|toggle-group|tooltip|dropdown-menu|context-menu|menubar|link-preview|command|combobox|navigation-menu)-[a-z-]+$/;
const RADIX_PART_ATTRIBUTE = /^data-radix-/;
// The same for the layout parts: Bits' pin input, scroll area and aspect ratio.
const BITS_LAYOUT_PART_ATTRIBUTE = /^data-(pin-input|scroll-area|aspect-ratio)-[a-z-]+$/;

// Accepted differences, each with its reason. Class renames apply to the static and the DOM
// comparison alike; the rest to the DOM.
const ALLOWED: Allowed[] = [
  // Variables Bits names its own way (css-vars.ts renameRadixVarsForBits).
  { slot: "popover-content", classes: { react: "--radix-popover-content-transform-origin", svelte: "--bits-popover-content-transform-origin" }, reason: "Bits sets the popover's transform origin as --bits-popover-content-transform-origin" },
  { slot: "select-content", classes: { react: "--radix-select-content-transform-origin", svelte: "--bits-select-content-transform-origin" }, reason: "Bits sets the list's transform origin as --bits-select-content-transform-origin" },
  { slot: "select-content", classes: { react: "--radix-select-content-available-height", svelte: "--bits-select-content-available-height" }, reason: "Bits sets the room below the trigger as --bits-select-content-available-height" },
  { slot: "accordion-content", classes: { react: "--radix-accordion-content-height", svelte: "--bits-accordion-content-height" }, reason: "Bits measures the open content as --bits-accordion-content-height" },
  { slot: "collapsible-content", classes: { react: "--radix-collapsible-content-height", svelte: "--bits-collapsible-content-height" }, reason: "Bits measures the open content as --bits-collapsible-content-height" },
  { slot: "select-item", classes: { react: "data-[state=checked]:", svelte: "data-selected:" }, reason: "Bits marks the chosen item data-selected where Radix says data-state=checked" },
  // Parts one side has and the other doesn't.
  { slot: "toast-announcer", only: "svelte", reason: "Svelte owns its persistent live region; Radix provides the React toast announcer internally without a data-slot. Browser regressions verify the Svelte announcement text and focus behavior" },
  { slot: "dropdown-menu-group-heading", only: "svelte", reason: "shadcn-svelte's GroupHeading (Bits' labelled group heading) is kept beside the plain Label, styled like it" },
  // Menus, overlays, pickers and toasts.
  ...["context-menu", "menubar"].map((menu) => ({ slot: `${menu}-group-heading`, only: "svelte" as const, reason: "shadcn-svelte's GroupHeading (Bits' labelled group heading) is kept beside the plain Label, styled like it" })),
  { slot: "hover-card-content", classes: { react: "--radix-hover-card-content-transform-origin", svelte: "--bits-link-preview-content-transform-origin" }, reason: "Bits calls a hover card a link preview and sets its transform origin as --bits-link-preview-content-transform-origin" },
  ...["height", "width"].map((d) => ({ slot: "navigation-menu-viewport", classes: { react: `--radix-navigation-menu-viewport-${d}`, svelte: `--bits-navigation-menu-viewport-${d}` }, reason: `Bits measures the open panel as --bits-navigation-menu-viewport-${d}` })),
  { slot: "command-item", classes: { react: "data-[selected=true]:", svelte: "data-selected:" }, reason: "Bits' Command marks the highlighted row data-selected (present or absent), where cmdk writes data-selected=\"true\" or \"false\"" },
  { slot: "command-item", classes: { react: "data-[disabled=true]:", svelte: "data-disabled:" }, reason: "Bits' Command marks a disabled row data-disabled (present or absent), where cmdk writes data-disabled=\"true\" or \"false\"" },
  { slot: "command-group", classes: { react: "**:[[cmdk-group-heading]]:", svelte: "**:[[data-command-group-heading]]:" }, reason: "The group styles its heading through the heading's marker: cmdk's cmdk-group-heading, Bits' data-command-group-heading" },
  { slot: "combobox-content", classes: { react: "--anchor-width", svelte: "--bits-combobox-anchor-width" }, reason: "The list is as wide as the field it drops from: Base UI calls that width --anchor-width, Bits --bits-combobox-anchor-width" },
  { slot: "combobox-content", classes: { react: "--transform-origin", svelte: "--bits-combobox-content-transform-origin" }, reason: "The list scales from where it opens: Base UI's --transform-origin is Bits' --bits-combobox-content-transform-origin" },
  { slot: "toast", classes: { react: "--radix-toast-swipe-move-x", svelte: "--toast-swipe-move-x" }, reason: "The swipe's distance, which Radix sets as --radix-toast-swipe-move-x and the Svelte toast (a port: Bits has no toast) sets as --toast-swipe-move-x" },
  ...["menubar", "menubar-trigger", "menubar-content", "menubar-item", "menubar-checkbox-item", "menubar-radio-item", "menubar-sub-trigger"].map((slot) => ({
    slot,
    attribute: "data-orientation",
    reason: "Radix writes the bar's orientation (horizontal) on it and its triggers, and a menu's (vertical) on its content and rows; Bits doesn't; none of their classes read it",
  })),
  { slot: "command-empty", only: "react", reason: "cmdk counts rows as they mount, so on the server it has none and renders its empty state; Bits renders it only after its first render finds nothing. Mounted, neither shows it while rows match" },
  { slot: "command-item", attribute: "data-selected", reason: "cmdk writes data-selected=\"false\" on rows that aren't highlighted, Bits leaves it off; the row's classes read it present (Bits) or \"true\" (cmdk), written for each (see the class rename)" },
  { slot: "command-item", attribute: "data-disabled", reason: "cmdk writes data-disabled=\"false\" or \"true\", Bits data-disabled only on a disabled row; the classes are written for each (see the class rename)" },
  ...["data-group", "data-value"].map((attribute) => ({ slot: "command-item", attribute, reason: "Bits writes a row's value and group out, for its own filtering; no class reads them" })),
  { slot: "command-group", attribute: "data-value", reason: "Bits writes a group's value (its heading) out, for its own filtering; no class reads it" },
  ...["combobox-input", "combobox-trigger"].flatMap((slot) => [
    { slot, attribute: "data-list-empty", reason: "Base UI marks the field's parts while its list has no rows; no class reads it" },
    { slot, attribute: "data-state", reason: "Bits writes the list's open state on the field's parts; their classes don't read it" },
  ]),
  { slot: "combobox-clear", attribute: "data-visible", reason: "Base UI marks its clear button shown (it renders it only then, as the Svelte one does); no class reads it" },
  { slot: "navigation-menu-trigger", attribute: "data-value", reason: "Bits writes the item's value on its trigger; the trigger's classes read data-state, which both write" },
  { slot: "avatar-image", only: "svelte", reason: "Bits renders the image from the start, hidden (display: none) until it loads; Radix adds it once loaded, which never happens on the server" },
  {
    slot: "calendar",
    only: "svelte",
    reason:
      "React's calendar is react-day-picker's, which passes the calendar's classes into its Root (the data-slot element) through className, so React's source writes none there; calendar-parity.test.ts compares the two calendars part by part, with each state prefix resolved against the rendered calendar",
  },
  // Classes a Svelte icon package adds of its own.
  ...["select-icon", "native-select-icon", "spinner", "accordion-trigger-icon", "questionnaire-choice-indicator-check"].map((slot) => ({
    slot,
    extraClass: "lucide-icon",
    reason: "@lucide/svelte adds a lucide-icon class beside lucide and lucide-<name>, which lucide-react doesn't; tesserai's styles don't read any of them",
  })),
  {
    slot: "avatar",
    tag: { react: "span", svelte: "div" },
    reason: "Bits renders the avatar as a <div> where Radix renders a <span>; both are display: flex from the classes, so they lay out the same",
  },
  // State Bits or Radix writes out that no class reads.
  ...["radio-group", "radio-group-item"].map((slot) => ({
    slot,
    attribute: "data-orientation",
    reason: "Bits writes the group's default orientation (vertical) out, Radix only a given one; the group's and items' classes don't read it",
  })),
  ...["dropdown-menu-content", "dropdown-menu-item", "dropdown-menu-checkbox-item", "dropdown-menu-radio-item", "dropdown-menu-sub-trigger"].map((slot) => ({
    slot,
    attribute: "data-orientation",
    reason: "Radix marks a menu's content and rows data-orientation=vertical, Bits doesn't; their classes don't read it",
  })),
  { slot: "select-content", attribute: "data-align-trigger", reason: "Bits' list always opens below the trigger (Radix's position=\"popper\", which the React case asks for): it has no item-aligned mode, so nothing marks the popup aligned or not" },
  ...["avatar", "avatar-fallback"].map((slot) => ({ slot, attribute: "data-status", reason: "Bits writes the image's loading status on the avatar and its fallback; no class reads it" })),
  ...["data-state", "data-selected"].map((attribute) => ({
    slot: "select-item",
    attribute,
    reason: "Bits marks the chosen item data-selected, Radix data-state=checked (unchecked for the rest); the item's classes are written for each library's (see the select-item class rename)",
  })),
  ...["data-label", "data-value"].map((attribute) => ({ slot: "select-item", attribute, reason: "Bits writes an item's value and label out; no class reads them" })),
  { slot: "select-value", attribute: "data-placeholder", reason: "Bits marks the value data-placeholder while it shows the placeholder, as both mark the trigger; the value has no classes" },
  { slot: "progress", attribute: "data-indeterminate", reason: "Bits marks an unknown value data-indeterminate beside data-state=indeterminate, as Radix's state says; no class reads it" },
  { slot: "progress", attribute: "data-state", reason: "Bits calls a full bar data-state=loaded where Radix says complete; the bar's classes don't read it (the indicator, which is ours, says complete as Radix's does)" },
  ...["alert-dialog-action", "alert-dialog-cancel"].map((slot) => ({
    slot,
    attribute: "data-state",
    reason: "Bits puts the dialog's data-state on its closing buttons, Radix doesn't; the Button classes they take don't read it",
  })),
  ...["tabs-trigger", "tabs-content", "toggle-group-item", "slider-thumb", "radio-group-item"].map((slot) => ({
    slot,
    attribute: "data-value",
    reason: "Bits writes the part's value out as data-value; no class reads it",
  })),
  { slot: "progress", attribute: "data-min", reason: "Bits writes the minimum out as data-min beside data-max; no class reads it" },
  ...["dialog-title", "sheet-title", "alert-dialog-title"].map((slot) => ({
    slot,
    tag: { react: "h2", svelte: "div" },
    reason: 'Bits renders a dialog title as <div role="heading" aria-level="2"> where Radix renders <h2>; Tailwind\'s preflight gives h2 no size, weight or margin of its own, so the classes decide both',
  })),
  ...["dialog-description", "sheet-description", "alert-dialog-description"].map((slot) => ({
    slot,
    tag: { react: "p", svelte: "div" },
    reason: "Bits renders a dialog description as a <div> where Radix renders <p>; Tailwind's preflight takes the paragraph's margins away, so they look the same",
  })),
  ...["dialog-title", "dialog-description", "dialog-close", "alert-dialog-title", "alert-dialog-description", "sheet-title", "sheet-description", "sheet-close"].map((slot) => ({
    slot,
    attribute: "data-state",
    reason: "Bits puts the dialog's data-state on every part, Radix only on the trigger, overlay and content; the title, description and close classes don't read it",
  })),
  // Layout and composition, beyond the everyday set.
  {
    slot: "input-otp",
    heldBy: "the row of slots (Bits' PinInput root), as [&_input]: classes",
    reason: "Bits gives `class` to the row of slots and has no way to class the input the code is typed into, so the row styles the input ([&_input]:disabled:cursor-not-allowed), which has no classes of its own",
  },
  { slot: "input-otp-slot", classes: { react: "data-[active=true]:", svelte: "data-active:" }, reason: "Bits marks the active cell with a bare data-active where input-otp writes data-active=\"true\"" },
  { slot: "input-otp-slot", attribute: "data-active", reason: "input-otp writes data-active=\"true\" or \"false\" on every slot, Bits a bare data-active on the active cell only (see the input-otp-slot class rename)" },
  { slot: "input-otp-slot", attribute: "data-inactive", reason: "Bits marks the other cells data-inactive; no class reads it" },
  { slot: "input-otp", attribute: "data-input-otp", reason: "input-otp marks its input for its own injected style; Bits marks it data-pin-input-input" },
  { slot: "input-otp", attribute: "data-input-otp-placeholder-shown", reason: "input-otp marks its empty input for its own injected style; no class reads it" },
  { slot: "resizable-panel-group", classes: { react: "aria-[orientation=vertical]:", svelte: "data-[direction=vertical]:" }, reason: "paneforge marks a vertical group data-direction=vertical (react-resizable-panels writes no attribute; both lay the group out with an inline flex-direction)" },
  ...[
    { react: "aria-[orientation=horizontal]:", svelte: "data-[direction=vertical]:" },
    { react: "[&[aria-orientation=horizontal]>div]", svelte: "[&[data-direction=vertical]>div]" },
  ].map((classes) => ({
    slot: "resizable-handle",
    classes,
    reason: "react-resizable-panels marks a handle's own (crosswise) orientation with aria-orientation; paneforge writes the group's direction on each handle as data-direction, so a handle across a vertical group is data-[direction=vertical]",
  })),
  ...[
    ["resizable-panel-group", "data-group"],
    ["resizable-panel", "data-panel"],
    ["resizable-handle", "data-separator"],
    ...["resizable-panel-group", "resizable-panel", "resizable-handle"].map((slot) => [slot, "data-testid"]),
  ].map(([slot, attribute]) => ({ slot: slot!, attribute: attribute!, reason: "react-resizable-panels marks its group, panels and handles (a test id, a handle's drag state) for its own lookups; no class reads them" })),
  ...[
    ["resizable-panel-group", "data-pane-group"],
    ["resizable-panel-group", "data-pane-group-id"],
    ["resizable-panel", "data-pane"],
    ["resizable-panel", "data-pane-id"],
    ["resizable-panel", "data-pane-group-id"],
    ["resizable-panel", "data-pane-state"],
    ["resizable-panel", "data-expanded"],
    ["resizable-handle", "data-pane-group-id"],
    ["resizable-handle", "data-pane-resizer"],
    ["resizable-handle", "data-pane-resizer-id"],
    ["resizable-handle", "data-enabled"],
  ].map(([slot, attribute]) => ({ slot: slot!, attribute: attribute!, reason: "paneforge marks its group, panes and handles (ids, a pane's state, a handle's) for its own lookups; no class reads them" })),
  ...["resizable-panel-group", "resizable-handle"].map((slot) => ({
    slot,
    attribute: "data-direction",
    reason: "paneforge writes the group's direction on the group and each handle, which the Svelte classes read (see the resizable class renames); react-resizable-panels lays the group out with an inline flex-direction and marks a handle with aria-orientation",
  })),
  { slot: "sidebar-menu-button", attribute: "data-delay-duration", reason: "Bits writes a tooltip trigger's delay on it; no class reads it" },
  { slot: "carousel-item", attribute: "data-embla-slide", reason: "shadcn-svelte's carousel marks each slide for Embla's slides selector; no class reads it" },
];
const used = new Set<Allowed>();

const SYSTEMS: [string, () => DesignSystem][] = [
  ["default", () => DEFAULT_SYSTEM],
  ["custom", customSystem],
];

// The React files these tests need, as renderAll writes them for Radix. Radix portals render nothing
// on the server (they mount in a layout effect), so here each portal renders its children in place;
// the Svelte side asks Bits for the same with portalProps={{ disabled: true }}.
function reactFiles(files: GeneratedFile[]): GeneratedFile[] {
  const wanted = new Set(["lib/utils.ts", ...[...EVERYDAY, ...MORE].map((c) => `components/ui/${c}.tsx`)]);
  return files
    .filter((f) => wanted.has(f.path))
    .map((f) => {
      const source = f.source
        .replace(/<\w+\.Portal\b[^>]*?\{\.\.\.props\}\s*\/>/g, "<>{props.children}</>")
        .replace(/<\w+\.Portal\b[^>]*>/g, "<>")
        .replace(/<\/\w+\.Portal>/g, "</>");
      if (/<\/?\w+\.Portal\b/.test(source)) throw new Error(`${f.path}: a Radix portal the parity test's stand-in doesn't know; update it`);
      return { ...f, source };
    });
}

type ButtonVariants = (props: Record<string, string>) => string;
type Rendered = { react: SlotElement[]; svelte: SlotElement[] };

const without = (pattern: RegExp) => (e: SlotElement): SlotElement => ({ ...e, data: Object.fromEntries(Object.entries(e.data).filter(([name]) => !pattern.test(name))) });

function expectDomParity(rendered: Rendered, name: string) {
  const { react, svelte } = withoutOneSided(ALLOWED, rendered.react.map(without(RADIX_PART_ATTRIBUTE)), rendered.svelte.map(without(BITS_PART_ATTRIBUTE)).map(without(BITS_LAYOUT_PART_ATTRIBUTE)), used);
  expect(react.length, name).toBeGreaterThan(0);
  expect(svelte.map((e) => e.slot), name).toEqual(react.map((e) => e.slot));
  react.forEach((r, i) => expect(allowing(ALLOWED, r, svelte[i]!, used), `${name}: ${r.slot} #${i}`).toEqual(r));
}

// A styled element as the React output writes it, from Svelte's.
function asReact(slot: string, styled: Styled): Styled {
  if ("classes" in styled) return { classes: asReactClasses(ALLOWED, slot, styled.classes, used) };
  const rename = (classes: string[]) => asReactClasses(ALLOWED, slot, classes, used);
  const { base, variants, compound, defaults } = styled.cva;
  return { cva: { base: rename(base), variants: Object.fromEntries(Object.entries(variants).map(([a, vs]) => [a, Object.fromEntries(Object.entries(vs).map(([v, cs]) => [v, rename(cs)]))])), compound, defaults } };
}

// A slot's distinct styles: a Svelte part may print one element in two branches (input's file branch).
const sorted = (list: Styled[]) => [...new Set(list.map((s) => JSON.stringify(s)))].sort();

describe.each(SYSTEMS)("Svelte (Bits UI) and React (Radix) parity for the %s system", (name, build) => {
  const system = build();
  const label = `parity-${name}`;
  const ui = aliasesFor(label).ui;
  let renderer: Renderer;
  let react: GeneratedFile[];
  let svelte: GeneratedFile[];
  let reactDir: string;

  // Every Button selection: each variant and shadcn name (and none), each intent (and none), each
  // size, "default", "icon" and every icon size (and none).
  const button = system.components["button"]!;
  const variants = [undefined, ...(button.axes.variant?.enabled ?? []), ...Object.keys(SHADCN_VARIANT_ALIASES)];
  const intents = [undefined, ...(button.axes.intent?.enabled ?? [])];
  const sizes = [undefined, "default", "icon", ...(button.axes.size?.enabled ?? []).flatMap((s) => [s, `icon-${s}`])];
  const cases: Record<string, string>[] = [];
  for (const variant of variants) for (const intent of intents) for (const size of sizes) cases.push(Object.fromEntries(Object.entries({ variant, intent, size }).filter(([, v]) => v !== undefined)) as Record<string, string>);

  beforeAll(async () => {
    renderer = await createRenderer();
    react = reactFiles(await renderAll("radix", { ...system, base: "radix" }, { format: false }));
    svelte = await renderAll("bits-ui", system, { format: false });
    reactDir = await renderer.writeReact(label, react);
    await writeGenerated(label, svelte);
  }, 60_000);
  afterAll(() => renderer?.close());

  it("prints the same classes for every data-slot of every component (static)", async () => {
    const r = styledSlots(react, "className");
    const s = styledSlots(svelte, "class");
    const only = new Map(ALLOWED.filter((a) => "only" in a).map((a) => [a.slot, a]));
    for (const slot of [...s.keys()].filter((slot) => !r.has(slot))) {
      expect(only.get(slot)?.["only" as never], `${slot} is styled in Svelte only`).toBe("svelte");
      used.add(only.get(slot)!);
      s.delete(slot);
    }
    expect([...s.keys()].sort()).toEqual([...r.keys()].sort());
    // A slot whose classes Svelte writes on another element (heldBy) is compared in the DOM, where the
    // elements are told apart.
    const held = new Map(ALLOWED.filter((a) => "heldBy" in a).map((a) => [a.slot, a]));
    for (const [slot, list] of r) {
      if (held.has(slot)) {
        used.add(held.get(slot)!);
        continue;
      }
      expect(sorted(s.get(slot)!.map((st) => asReact(slot, st))), slot).toEqual(sorted(list));
    }

    // Button's classes come from buttonVariants on both sides (the cva config, the shadcn names, the
    // square icon sizes): the same list for every selection.
    const reactVariants = (await renderer.module<{ buttonVariants: ButtonVariants }>(join(reactDir, "components/ui/button.tsx"))).buttonVariants;
    const svelteVariants = (await renderer.module<{ buttonVariants: ButtonVariants }>(join(generatedDir(label), "components/ui/button/button.svelte"))).buttonVariants;
    const tokens = (classes: string) => [...new Set(classes.split(/\s+/).filter(Boolean))].sort();
    for (const selection of cases) expect(tokens(svelteVariants(selection)), JSON.stringify(selection)).toEqual(tokens(reactVariants(selection)));
    expect(new Set(cases.map((c) => reactVariants(c))).size).toBeGreaterThan(button.axes.variant!.enabled.length * button.axes.size!.enabled.length);
  }, 60_000);

  async function render(entry: string, tsx: string, markup: string): Promise<Rendered> {
    const [r, s] = await Promise.all([renderer.react(label, entry, tsx), renderer.svelte(label, entry, markup)]);
    return { react: slotElements(r), svelte: slotElements(s) };
  }

  it("renders every Button selection alike, and a class override (server DOM)", async () => {
    // cn resolves a caller's classes against the component's the same way on both sides, type steps included.
    const all = [...cases, { variant: "outline", size: "sm", class: "px-8 text-5 rounded-none" }];
    const json = JSON.stringify(all);
    const rendered = await render(
      "button",
      `import { Button } from "@/components/ui/button";
const cases: Record<string, string>[] = ${json};
function Entry() {
  return <>{cases.map(({ class: className, ...p }, i) => <Button key={i} className={className} {...(p as object)}>Go</Button>)}</>;
}`,
      `<script lang="ts">
  import { Button } from "${ui}/button/index.js";
  const cases = ${json};
</script>

{#each cases as props}<Button {...props}>Go</Button>{/each}
`,
    );
    expect(rendered.react).toHaveLength(all.length);
    expectDomParity(rendered, "button");
  }, 60_000);

  it("renders Dialog alike: open with every part, with the close button hidden and classes overridden, and closed with a trigger (server DOM)", async () => {
    const rendered = await render(
      "dialog",
      `import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
function Entry() {
  return (
    <>
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Saved when you're done.</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton><DialogClose>Cancel</DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open>
        <DialogContent showCloseButton={false} className="p-2 sm:max-w-md">
          <DialogTitle className="text-6 font-normal">Plain</DialogTitle>
          <DialogFooter className="gap-8" />
        </DialogContent>
      </Dialog>
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
      </Dialog>
    </>
  );
}`,
      `<script lang="ts">
  import * as Dialog from "${ui}/dialog/index.js";
</script>

<Dialog.Root open>
  <Dialog.Content portalProps={{ disabled: true }}>
    <Dialog.Header>
      <Dialog.Title>Edit profile</Dialog.Title>
      <Dialog.Description>Saved when you're done.</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer showCloseButton><Dialog.Close>Cancel</Dialog.Close></Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
<Dialog.Root open>
  <Dialog.Content portalProps={{ disabled: true }} showCloseButton={false} class="p-2 sm:max-w-md">
    <Dialog.Title class="text-6 font-normal">Plain</Dialog.Title>
    <Dialog.Footer class="gap-8" />
  </Dialog.Content>
</Dialog.Root>
<Dialog.Root>
  <Dialog.Trigger>Open</Dialog.Trigger>
</Dialog.Root>
`,
    );
    const slots = new Set(rendered.react.map((e) => e.slot));
    expect([...slots].sort()).toEqual(["dialog-close", "dialog-content", "dialog-description", "dialog-footer", "dialog-header", "dialog-overlay", "dialog-title", "dialog-trigger"]);
    expectDomParity(rendered, "dialog");
  }, 60_000);

  it.each(domCases(system).map((c) => [c.name, c] as const))("renders %s alike (server DOM)", async (entry, c) => {
    const rendered = await render(
      entry,
      `${c.react.imports}\nfunction Entry() {\n  return (\n${c.react.jsx}\n  );\n}`,
      `<script lang="ts">\n  ${c.svelte.imports.replaceAll("$UI$", ui)}\n</script>\n\n${c.svelte.markup}\n`,
    );
    expectDomParity(rendered, entry);
  }, 60_000);
});

// An allowance nothing needs any more hides nothing, but it tells a reader something false.
it("every allowance is still needed", () => {
  expect(ALLOWED.filter((a) => !used.has(a)).map((a) => a.slot)).toEqual([]);
  expect(LIBRARY_CLASSES.filter((l) => !seenLibrary.has(l)).map((l) => l.slot)).toEqual([]);
});
