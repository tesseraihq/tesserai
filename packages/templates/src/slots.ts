import { DEFAULT_ANATOMIES } from "@tesserai/core";

// data-slot values the templates emit, mapped back to anatomy parts. shadcn's slot names are kept
// so existing selectors keep working; this table is how the preview turns an element into a part.
export const SLOT_PARTS: Record<string, Record<string, string>> = {
  button: { button: "root" },
  badge: { badge: "root" },
  input: { input: "root" },
  checkbox: { checkbox: "root", "checkbox-indicator": "indicator" },
  card: {
    card: "root",
    "card-header": "header",
    "card-title": "title",
    "card-description": "description",
    "card-content": "content",
    "card-footer": "footer",
  },
  dialog: {
    "dialog-backdrop": "backdrop",
    "dialog-overlay": "backdrop",
    dialog: "popup",
    "dialog-content": "popup",
    "dialog-title": "title",
    "dialog-description": "description",
    "dialog-close": "close",
  },
  select: {
    "select-trigger": "trigger",
    "select-icon": "icon",
    "select-content": "popup",
    "select-item": "item",
    "select-item-indicator": "item-indicator",
  },
  "dropdown-menu": {
    "dropdown-menu-content": "popup",
    "dropdown-menu-sub-content": "popup",
    "dropdown-menu-item": "item",
    "dropdown-menu-checkbox-item": "item",
    "dropdown-menu-radio-item": "item",
    "dropdown-menu-sub-trigger": "sub-trigger",
    "dropdown-menu-label": "label",
    "dropdown-menu-separator": "separator",
    "dropdown-menu-shortcut": "shortcut",
    "dropdown-menu-checkbox-item-indicator": "item-indicator",
    "dropdown-menu-radio-item-indicator": "item-indicator",
  },
  tabs: { "tabs-list": "list", "tabs-trigger": "tab", "tabs-indicator": "indicator", "tabs-content": "panel" },
  table: {
    table: "root",
    "table-header": "header",
    "table-row": "row",
    "table-head": "head-cell",
    "table-cell": "cell",
    "table-caption": "caption",
  },
  toast: { toast: "root", "toast-title": "title", "toast-description": "description", "toast-close": "close" },
  tooltip: { "tooltip-content": "popup" },
  label: { label: "root" },
  textarea: { textarea: "root" },
  "native-select": { "native-select": "select", "native-select-icon": "icon" },
  switch: { switch: "root", "switch-thumb": "thumb" },
  "radio-group": { "radio-group": "group", "radio-group-item": "item", "radio-group-indicator": "indicator" },
  toggle: { toggle: "root" },
  "context-menu": {
    "context-menu-content": "popup",
    "context-menu-sub-content": "popup",
    "context-menu-item": "item",
    "context-menu-checkbox-item": "item",
    "context-menu-radio-item": "item",
    "context-menu-sub-trigger": "sub-trigger",
    "context-menu-label": "label",
    "context-menu-separator": "separator",
    "context-menu-shortcut": "shortcut",
    "context-menu-checkbox-item-indicator": "item-indicator",
    "context-menu-radio-item-indicator": "item-indicator",
  },
  menubar: {
    menubar: "bar",
    "menubar-trigger": "trigger",
    "menubar-content": "popup",
    "menubar-sub-content": "popup",
    "menubar-item": "item",
    "menubar-checkbox-item": "item",
    "menubar-radio-item": "item",
    "menubar-sub-trigger": "sub-trigger",
    "menubar-label": "label",
    "menubar-separator": "separator",
    "menubar-shortcut": "shortcut",
    "menubar-checkbox-item-indicator": "item-indicator",
    "menubar-radio-item-indicator": "item-indicator",
  },
  popover: { "popover-content": "popup", "popover-header": "header", "popover-title": "title", "popover-description": "description" },
  "hover-card": { "hover-card-content": "popup" },
  combobox: {
    "combobox-input-wrapper": "field",
    "combobox-chips": "field",
    "combobox-input": "input",
    "combobox-chip-input": "input",
    "combobox-trigger": "button",
    "combobox-clear": "button",
    "combobox-content": "popup",
    "combobox-item": "item",
    "combobox-label": "label",
    "combobox-empty": "empty",
    "combobox-separator": "separator",
    "combobox-chip": "chip",
    "combobox-chip-remove": "chip-remove",
  },
  command: {
    command: "root",
    "command-input-wrapper": "input",
    "command-input": "input",
    "command-list": "list",
    "command-empty": "empty",
    "command-item": "item",
    "command-separator": "separator",
    "command-shortcut": "shortcut",
  },
  drawer: {
    "drawer-overlay": "backdrop",
    "drawer-popup": "popup",
    "drawer-content": "popup",
    "drawer-swipe-handle": "handle",
    "drawer-header": "header",
    "drawer-footer": "footer",
    "drawer-title": "title",
    "drawer-description": "description",
  },
  "alert-dialog": {
    "alert-dialog-overlay": "backdrop",
    "alert-dialog": "popup",
    "alert-dialog-content": "popup",
    "alert-dialog-header": "header",
    "alert-dialog-footer": "footer",
    "alert-dialog-title": "title",
    "alert-dialog-description": "description",
    "alert-dialog-media": "media",
  },
  sheet: {
    "sheet-overlay": "backdrop",
    sheet: "popup",
    "sheet-content": "popup",
    "sheet-header": "header",
    "sheet-footer": "footer",
    "sheet-title": "title",
    "sheet-description": "description",
    "sheet-close": "close",
  },
  "input-otp": { "input-otp-group": "group", "input-otp-slot": "slot", "input-otp-separator": "separator" },
  "input-group": { "input-group": "root", "input-group-control": "control", "input-group-addon": "addon", "input-group-button": "button" },
  field: {
    field: "root",
    "field-set": "set",
    "field-legend": "legend",
    "field-group": "group",
    "field-content": "content",
    "field-label": "label",
    "field-description": "description",
    "field-error": "error",
    "field-separator": "separator",
    "field-separator-content": "separator-label",
  },
  "toggle-group": { "toggle-group": "group", "toggle-group-item": "item" },
  slider: { slider: "root", "slider-track": "track", "slider-range": "range", "slider-thumb": "thumb" },
};

export type SlotTarget = { component: string; part: string };

// Longest names first, so "button-group-text" is the button group's before it's tried as a button's.
const BY_LENGTH = Object.keys(DEFAULT_ANATOMIES).sort((a, b) => b.length - a.length);

export function partForSlot(slot: string): SlotTarget | undefined {
  for (const [component, slots] of Object.entries(SLOT_PARTS)) {
    const part = slots[slot];
    if (part !== undefined) return { component, part };
  }
  // Past the table, the templates' own convention: "<component>" is the component (its root, or
  // its first part when it has none, as the date picker's trigger), "<component>-<part>" a part.
  // So anything a template marks can be pointed at, inspected and asked about.
  for (const component of BY_LENGTH) {
    const parts = DEFAULT_ANATOMIES[component]!.parts;
    if (slot === component) return { component, part: parts.includes("root") ? "root" : parts[0]! };
    if (slot.startsWith(`${component}-`) && parts.includes(slot.slice(component.length + 1))) return { component, part: slot.slice(component.length + 1) };
  }
  return undefined;
}
