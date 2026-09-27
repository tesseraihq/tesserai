import { Window } from "happy-dom";

// What the parity tests compare for each element that has a data-slot: its tag, its data-*
// attributes and its classes (as a set: order carries no meaning once tailwind-merge has run).
export type SlotElement = { slot: string; tag: string; data: Record<string, string>; classes: string[] };

export function slotsOf(root: ParentNode): SlotElement[] {
  return [...root.querySelectorAll("[data-slot]")].map((el) => ({
    slot: el.getAttribute("data-slot")!,
    tag: el.tagName.toLowerCase(),
    data: Object.fromEntries([...el.attributes].filter((a) => a.name.startsWith("data-")).map((a) => [a.name, a.value]).sort(([a], [b]) => a!.localeCompare(b!))),
    classes: withoutLibraryClasses(el.getAttribute("data-slot")!, (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)).sort(),
  }));
}

// The one part a library draws into, where each output's classes reach into its own library's
// markup: those are left out on both sides (neither library's selectors can match the other's
// markup), and what's left is compared. Each with the reason, and where the rest is held.
export type LibraryClasses = { slot: string; react: RegExp; vue: RegExp; why: string };
export const LIBRARY_CLASSES: LibraryClasses[] = [
  {
    slot: "chart",
    // A class prefix (tw:) comes first.
    react: /^(\w+:)?\[&_\.recharts-/,
    vue: /^(\w+:)?(\[--vis-|\[&_\[data-vis-|flex-col$)/,
    why: "React's chart is Recharts', themed through selectors on its SVG's classes; Vue's is Unovis' (shadcn-vue's), themed through its CSS variables, with the legend under the plot (flex-col: Unovis draws it outside its SVG). The system's color for each role (axis, grid, cursor) is the same token in both, which pieces.test.ts holds; the layout and type size are compared here, and the tooltip and legend in chart-parity.test.ts",
  },
];
export const seenLibrary = new Set<LibraryClasses>();

export function withoutLibraryClasses(slot: string, classes: string[]): string[] {
  let out = classes;
  for (const l of LIBRARY_CLASSES) {
    if (l.slot !== slot) continue;
    const kept = out.filter((c) => !l.react.test(c) && !l.vue.test(c));
    if (kept.length !== out.length) seenLibrary.add(l);
    out = kept;
  }
  return out;
}

// Data attributes one library sets that the other doesn't, on elements both render the same: each
// with the reason it makes no difference to how the part looks. A test that strips them records
// which it met, so one that no longer occurs is taken off the list.
// A key is an attribute ("data-active"), or an attribute on one part ("select-value/data-placeholder").
export const ACCEPTED_DATA: Record<string, string> = {
  "data-radix-collection-item": "Radix marks the items of a roving-focus list for its own keyboard handling; no class selects on it",
  "data-reka-collection-item": "Reka's name for the same marker",
  "data-active": "Reka marks the item that holds the roving tab stop; no class of those items selects on it. (Input OTP's slots and the sidebar's buttons write a data-active of their own, from the same expression in both outputs, which class-parity compares)",
  "data-slider-impl": "Reka marks the slider's own element for its pointer handling; no class selects on it",
  "select-value/data-placeholder": "Reka also writes the placeholder text on the value; the classes read data-placeholder on the trigger, which both write",
  // Layout and composition, beyond the everyday set.
  "input-otp/data-input-otp": "input-otp marks its input data-input-otp=\"true\", vue-input-otp with an empty value; only the library's own injected style reads it, by presence",
  "data-radix-scroll-area-viewport": "Radix marks the scroll area's viewport for its own style tag; no class selects on it",
  "data-reka-scroll-area-viewport": "Reka's name for the same marker",
  "sidebar-menu-button/data-grace-area-trigger": "Reka marks a tooltip's trigger for its pointer grace area; no class selects on it",
  ...Object.fromEntries(
    ["resizable-panel-group/data-group", "resizable-panel/data-panel", "resizable-handle/data-separator"].map((k) => [
      k,
      "react-resizable-panels marks its group, panels (data-panel=\"true\"; Reka writes it empty) and handles (with their drag state) for its own lookups; no class reads them",
    ]),
  ),
  ...Object.fromEntries(
    ["resizable-panel-group/data-testid", "resizable-panel/data-testid", "resizable-handle/data-testid"].map((k) => [k, "react-resizable-panels writes each part's id as a test id; no class reads it"]),
  ),
  ...Object.fromEntries(
    [
      "resizable-panel-group/data-panel-group",
      "resizable-panel-group/data-panel-group-id",
      "resizable-panel/data-panel-group-id",
      "resizable-panel/data-panel-id",
      "resizable-panel/data-panel-size",
      "resizable-handle/data-panel-group-id",
      "resizable-handle/data-resize-handle",
      "resizable-handle/data-resize-handle-state",
      "resizable-handle/data-panel-resize-handle-enabled",
      "resizable-handle/data-panel-resize-handle-id",
      "resizable-handle/data-state",
    ].map((k) => [k, "Reka's Splitter marks its group, panels and handles (ids, sizes, a handle's drag state) for its own lookups; no class reads them"]),
  ),
  ...Object.fromEntries(
    ["resizable-panel-group/data-orientation", "resizable-handle/data-orientation"].map((k) => [
      k,
      "Reka writes the group's direction on the group and each handle, which the Vue classes read (see REKA_CLASSES); react-resizable-panels lays the group out with an inline flex-direction (Reka sets one too) and marks a handle with aria-orientation",
    ]),
  ),
  // Menus, overlays, pickers.
  "data-reka-navigation-menu": "Reka marks a navigation menu's root for its own lookups; no class selects on it",
  "data-menu-item": "Reka marks a navigation menu's items for its own lookups; no class selects on it",
  "data-navigation-menu-trigger": "Reka marks a navigation menu's triggers for its own keyboard handling; no class selects on it",
  "menubar-trigger/data-value": "Reka writes the menu's value on its trigger; the trigger's classes read data-state, which both write",
  "hover-card-trigger/data-grace-area-trigger": "Reka marks the trigger for the pointer's grace area on the way to the card; the trigger has no classes",
  "command-list/data-orientation": "Reka's listbox writes its (vertical) orientation; the list's classes don't read it",
  "command-item/data-selected": "cmdk marks the highlighted row data-selected=\"true\" (\"false\" on the rest), Reka data-highlighted; the row's classes are written for each (slots.ts REKA_CLASSES)",
  "command-item/data-disabled": "cmdk writes data-disabled=\"false\" on every enabled row and \"true\" on a disabled one, Reka data-disabled only on a disabled one; the classes are written for each (REKA_CLASSES)",
  "command-item/data-state": "Reka's listbox marks each row checked or unchecked for a chosen value, which a command palette doesn't keep; no class of the row reads it",
  "combobox-input/data-list-empty": "Base UI marks the input while the list has no rows; no class reads it",
  "combobox-trigger/data-list-empty": "Base UI marks the trigger while the list has no rows; no class reads it",
  "combobox-trigger/data-placeholder": "Base UI marks the trigger while nothing is chosen; the trigger's classes don't read it",
  "combobox-trigger/data-state": "Reka writes the list's open state on the trigger, Base UI data-popup-open (only when open); the trigger's classes read neither",
};

// Only on the server: what a part writes before it's mounted.
export const ACCEPTED_SSR_DATA: Record<string, string> = {
  "accordion-content/data-state": "An item open from the start: Reka leaves data-state off until mounted, so the opening animation doesn't run on load; Radix writes it and stops the animation inline. Mounted, both write data-state=open (dom-parity)",
  "collapsible-content/data-state": "The same, for Collapsible (dom-parity checks the mounted state)",
};
export const seenData = new Set<string>();

export function acceptedData(slots: SlotElement[], accepted: Record<string, string> = ACCEPTED_DATA): SlotElement[] {
  return slots.map((s) => ({
    ...s,
    data: Object.fromEntries(
      Object.entries(s.data).filter(([name]) => {
        const key = [name, `${s.slot}/${name}`].find((k) => k in accepted);
        if (key === undefined) return true;
        seenData.add(key);
        return false;
      }),
    ),
  }));
}

// Classes a part is written with for Reka's attributes where the React output's library writes
// others: a state prefix or a variable renamed in every class, or classes swapped for others. Each
// with the reason; the class parity test records which it met, so one no longer needed is taken off.
export type ClassDifference = { slot: string; why: string } & ({ rename: { react: string; vue: string } } | { swap: { react: string[]; vue: string[] } });

const COMMAND_ROW = "Reka's Listbox marks the row under the keyboard or pointer data-highlighted and a disabled one data-disabled, where cmdk writes data-selected=\"true\" and data-disabled=\"true\"";
const SPLITTER = "react-resizable-panels marks a handle's own (crosswise) orientation with aria-orientation; Reka's Splitter writes the group's direction on each handle as data-orientation, so a handle across a vertical group is data-[orientation=vertical]";
export const REKA_CLASSES: ClassDifference[] = [
  { slot: "resizable-panel-group", rename: { react: "aria-[orientation=vertical]:", vue: "data-[orientation=vertical]:" }, why: "Reka's Splitter marks a vertical group data-orientation=vertical; react-resizable-panels writes aria-orientation" },
  { slot: "resizable-handle", rename: { react: "aria-[orientation=horizontal]:", vue: "data-[orientation=vertical]:" }, why: SPLITTER },
  { slot: "resizable-handle", rename: { react: "[&[aria-orientation=horizontal]>div]", vue: "[&[data-orientation=vertical]>div]" }, why: SPLITTER },
  { slot: "command-item", rename: { react: "data-[selected=true]:", vue: "data-highlighted:" }, why: COMMAND_ROW },
  { slot: "command-item", rename: { react: "data-[disabled=true]:", vue: "data-disabled:" }, why: COMMAND_ROW },
  { slot: "combobox-item", rename: { react: "data-selected:", vue: "data-[state=checked]:" }, why: "Reka marks the chosen row data-state=checked (its Listbox's), where Base UI says data-selected" },
  { slot: "combobox-content", rename: { react: "w-(--anchor-width)", vue: "w-(--reka-combobox-trigger-width)" }, why: "The list is as wide as the field it drops from: Base UI calls that width --anchor-width, Reka --reka-combobox-trigger-width (its anchor's)" },
  { slot: "combobox-content", rename: { react: "origin-(--transform-origin)", vue: "origin-(--reka-combobox-content-transform-origin)" }, why: "The list scales from where it opens: Base UI's --transform-origin is Reka's --reka-combobox-content-transform-origin" },
  {
    slot: "combobox-content",
    swap: { react: ["transition-[opacity,scale]", "data-starting-style:opacity-0", "data-starting-style:scale-95", "data-ending-style:opacity-0", "data-ending-style:scale-95"], vue: ["data-[state=open]:animate-enter", "data-[state=closed]:animate-exit"] },
    why: "Base UI fades and scales the list in with a transition from data-starting-style; Reka has no starting style and waits for an animation (not a transition) before unmounting, so the list takes the keyframes every Radix-shaped popup uses (the same fade and scale)",
  },
];
export const seenClasses = new Set<ClassDifference>();

// A React element's classes, as the Vue output writes them for the same slot.
export function asVueClasses(slot: string, classes: string[]): string[] {
  let out = classes;
  for (const d of REKA_CLASSES) {
    if (d.slot !== slot) continue;
    if ("rename" in d) {
      const next = out.map((c) => c.replaceAll(d.rename.react, d.rename.vue));
      if (next.some((c, i) => c !== out[i])) seenClasses.add(d);
      out = next;
    } else if (d.swap.react.every((c) => out.includes(c))) {
      out = [...out.filter((c) => !d.swap.react.includes(c)), ...d.swap.vue];
      seenClasses.add(d);
    }
  }
  return out;
}

// Radix's CSS variables under Reka's names, and the classes above, as the Vue output writes them.
export function rekaVars(slots: SlotElement[]): SlotElement[] {
  return slots.map((s) => ({ ...s, classes: asVueClasses(s.slot, s.classes.map((c) => c.replaceAll("--radix-", "--reka-"))).sort() }));
}

// The slots in a string of server-rendered HTML.
export function slotsInHtml(html: string): SlotElement[] {
  const window = new Window();
  window.document.body.innerHTML = html;
  const slots = slotsOf(window.document.body as unknown as ParentNode);
  void window.happyDOM.close();
  return slots;
}
