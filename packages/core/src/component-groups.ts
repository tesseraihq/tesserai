import type { Base } from "./system";

// How components are grouped wherever there are many of them (the builder's list, the gallery,
// the AI outline): the way shadcn's docs and designers think about them. Components not listed
// fall into "Other" so a new one is never lost.
export const COMPONENT_GROUPS = [
  { id: "buttons", label: "Buttons", components: ["button", "button-group", "toggle", "toggle-group"] },
  {
    id: "forms",
    label: "Forms",
    components: ["input", "textarea", "select", "native-select", "combobox", "checkbox", "radio-group", "switch", "slider", "input-otp", "input-group", "field", "label", "calendar", "date-picker"],
  },
  { id: "overlays", label: "Overlays", components: ["dialog", "alert-dialog", "sheet", "drawer", "popover", "hover-card", "tooltip", "dropdown-menu", "context-menu", "command"] },
  { id: "navigation", label: "Navigation", components: ["tabs", "accordion", "collapsible", "breadcrumb", "pagination", "navigation-menu", "menubar", "sidebar"] },
  {
    id: "display",
    label: "Display",
    components: ["card", "badge", "avatar", "table", "data-table", "chart", "carousel", "aspect-ratio", "kbd", "item", "empty", "separator", "skeleton", "typography"],
  },
  { id: "feedback", label: "Feedback", components: ["alert", "toast", "sonner", "progress", "spinner"] },
  { id: "layout", label: "Layout", components: ["resizable", "scroll-area", "direction"] },
  { id: "chat", label: "Chat", components: ["message", "bubble", "attachment", "marker", "message-scroller", "questionnaire"] },
] as const;

// Display names exactly as shadcn's docs write them, for every component tesserai ships or will.
const NAMES: Record<string, string> = {
  "input-otp": "Input OTP",
  kbd: "Kbd",
  "data-table": "Data Table",
  "date-picker": "Date Picker",
};

export function componentName(name: string): string {
  return NAMES[name] ?? name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// Components a library has no version of, and why. shadcn has none either; the builder says so
// and the generated files leave it out.
export const UNAVAILABLE: Readonly<Record<string, Readonly<Partial<Record<Base, string>>>>> = {
  "navigation-menu": { "react-aria": "React Aria has no navigation menu, and neither does shadcn's React Aria registry." },
};

// Components a framework has no version of, and why: not coming, like the React Aria gap above.
export const NOT_IN_FRAMEWORK: Readonly<Record<string, Readonly<Partial<Record<"vue" | "svelte", string>>>>> = {
  direction: { svelte: "Bits UI has no direction provider, and neither does shadcn-svelte: set dir on each component instead." },
};

export function isAvailable(component: string, base: Base): boolean {
  return UNAVAILABLE[component]?.[base] === undefined;
}

// Components whose generated code imports another component: a toggle group's items are toggles,
// a field's label is a label. Including one includes what it needs; what is needed cannot be left out.
export const COMPONENT_REQUIRES: Readonly<Record<string, readonly string[]>> = {
  "toggle-group": ["toggle"],
  field: ["label"],
  "alert-dialog": ["button"],
  command: ["dialog"],
  pagination: ["button"],
  carousel: ["button"],
  // React Aria's month and year dropdowns are Selects.
  calendar: ["button", "select"],
  "date-picker": ["button", "popover", "calendar"],
  "data-table": ["table", "button", "input", "checkbox"],
  attachment: ["button"],
  "message-scroller": ["button"],
  questionnaire: ["button"],
  sidebar: ["button", "input", "separator", "sheet", "skeleton", "tooltip"],
};

// Everything a component needs, including what those need (a date picker needs a calendar, which
// needs a select).
export function requirementsOf(component: string): readonly string[] {
  const out: string[] = [];
  const visit = (name: string) => {
    for (const need of COMPONENT_REQUIRES[name] ?? []) {
      if (out.includes(need) || need === component) continue;
      out.push(need);
      visit(need);
    }
  };
  visit(component);
  return out;
}

// The included components that need this one.
export function dependentsOf(component: string, included: readonly string[]): string[] {
  return included.filter((name) => requirementsOf(name).includes(component));
}

export type ComponentGroup = { id: string; label: string; components: string[] };

// The given component names arranged into groups, in group order, empty groups dropped.
export function groupComponents(names: readonly string[]): ComponentGroup[] {
  const placed = new Set<string>();
  const out: ComponentGroup[] = [];
  for (const group of COMPONENT_GROUPS) {
    const components = group.components.filter((c) => names.includes(c));
    components.forEach((c) => placed.add(c));
    if (components.length > 0) out.push({ id: group.id, label: group.label, components });
  }
  const rest = names.filter((n) => !placed.has(n));
  if (rest.length > 0) out.push({ id: "other", label: "Other", components: rest });
  return out;
}

// What each component is for, in a sentence: when to reach for it, and when to use something else.
// Shown under each component in the builder's list and editor, and in the generated docs.
export const COMPONENT_ABOUT: Record<string, string> = {
  button: "Starts an action. One primary button per view; the others outline or ghost, and danger only for what can't be undone.",
  "button-group": "Buttons that belong together, joined into one control, like Save with a menu of other ways to save.",
  toggle: "A button that stays pressed, for one setting that's on or off where a switch would be too heavy (bold, mute).",
  "toggle-group": "A row of toggles where one or several can be on: text alignment, view modes, filters.",
  input: "One line of text. Put it in a Field so it has a label, a description and an error.",
  textarea: "Several lines of text: messages, notes, descriptions.",
  select: "Picks one of a short, known list. Past about fifteen options, use a combobox so people can type.",
  "native-select": "The browser's own select: best on phones and in forms that must work without JavaScript.",
  combobox: "A select you can type in, for long lists: countries, people, tags.",
  checkbox: "Turns one thing on or off that takes effect when a form is sent, or picks several from a list.",
  "radio-group": "Picks exactly one of a few options, all visible at once.",
  switch: "Turns a setting on or off right away, without a save button.",
  slider: "Picks a number in a range where the exact value matters less than roughly where it is: volume, size.",
  "input-otp": "A one-time code, a box per character, pasted or typed.",
  "input-group": "An input with things attached: an icon, a unit, a button, a prefix like https://.",
  field: "A label, a control, a description and an error, laid out and linked for screen readers. Wrap every form control in one.",
  label: "Names a control. A Field adds one for you; use this alone only outside forms.",
  calendar: "A month grid to pick a day or a range, shown in place.",
  "date-picker": "A button that opens a calendar in a popover, for picking a date without leaving the form.",
  dialog: "Asks for focused input without leaving the page: a short form, a confirmation with details. Keep it small.",
  "alert-dialog": "Interrupts to confirm something that can't be undone. It needs an answer; clicking outside doesn't close it.",
  sheet: "A panel from the edge of the screen for a task beside the page: filters, details, settings.",
  drawer: "A panel from the bottom that can be dragged, made for phones.",
  popover: "Rich content next to what opened it: a small form, a color picker, details.",
  "hover-card": "A preview of what a link points to, on hover, for people with a pointer. Never the only way to see something.",
  tooltip: "A short label for an icon-only button or a truncated value. Plain text only, nothing to click.",
  "dropdown-menu": "A list of actions behind a button: more options, a user menu.",
  "context-menu": "Actions on right-click or long press. Always offer the same actions another way too.",
  command: "A searchable list of commands or places, usually on ⌘K.",
  tabs: "Switches between views of the same thing, one at a time, without leaving the page.",
  accordion: "Sections that open one at a time or several, for long content people scan: FAQs, settings.",
  collapsible: "One section that shows and hides, like advanced options.",
  breadcrumb: "Where the page sits in a hierarchy, with a way back up.",
  pagination: "Moves between pages of a long list.",
  "navigation-menu": "A site's top navigation, with panels of links.",
  menubar: "An app's menus in a row, like a desktop app's File, Edit and View.",
  sidebar: "An app's main navigation down the side, collapsible to icons.",
  card: "Groups related content and actions on one surface.",
  badge: "A short status or count next to something: New, Beta, 3.",
  avatar: "A person or team, as a photo or their initials.",
  table: "Rows and columns of data to read and compare.",
  "data-table": "A table with sorting, filtering, selection and pages, for data people work with.",
  chart: "Numbers over time or across categories, in the system's colors.",
  carousel: "A row of slides seen one or a few at a time. Only for content people are happy to skip.",
  "aspect-ratio": "Keeps an image or video at a fixed shape (16:9, square) as the layout resizes, so it never stretches or jumps while it loads.",
  kbd: "A keyboard key or shortcut, like ⌘K.",
  item: "A row with a title, a description, media and actions, for lists of things.",
  empty: "What a view shows when there's nothing in it yet, with the action that fills it.",
  separator: "A line between groups of content.",
  skeleton: "A placeholder in the shape of content that's still loading.",
  typography: "Headings, paragraphs, lists and quotes styled for long-form text.",
  alert: "A message in the page about something that needs attention. It stays until the situation changes.",
  toast: "A brief message after an action, that goes away by itself.",
  sonner: "Toasts from the sonner library: they stack, carry actions, and can show loading then done. Use this or Toast, not both.",
  progress: "How far along something is, when it's known.",
  spinner: "Something is happening, for how long isn't known.",
  resizable: "Side-by-side panels people resize by dragging the line between them, like an editor with a file list.",
  "scroll-area": "A scrolling region inside the page (a panel, a long list) with scrollbars styled like the rest of the system. The page itself keeps the browser's own.",
  direction: "Only for apps in right-to-left languages (Arabic, Hebrew, Persian): it tells the other components to mirror, so menus, sliders and carousels open the other way. Leave it out otherwise.",
  message: "One message in a conversation, with who sent it and when.",
  bubble: "The bubble a chat message sits in, yours or theirs.",
  attachment: "A file in a message or a form: its name, size, type and progress.",
  marker: "A marker in a conversation: a date, where unread messages start, an event.",
  "message-scroller": "A conversation that stays scrolled to the newest message, unless you scroll up.",
  questionnaire: "A few questions in a conversation, answered by picking.",
};

// What each part of a component is, in a few words, for the part pickers ("Track: the full bar the
// thumb slides along"): by name, with the components where a name means something of its own.
const PART_ABOUT: Record<string, string> = {
  title: "Its heading",
  description: "The smaller text under the title",
  popup: "The panel that opens",
  content: "The main area inside it",
  separator: "A thin dividing line",
  label: "The text naming it",
  item: "One entry in the list",
  icon: "Its icon",
  header: "The top area, above the content",
  group: "A set of items kept together",
  footer: "The bottom area, below the content",
  indicator: "The mark that shows it's on or chosen",
  placeholder: "The hint shown while it's empty",
  action: "Its button",
  trigger: "What you click or tap to open it",
  "item-indicator": "The check or dot beside the chosen item",
  shortcut: "The keyboard shortcut shown beside an item",
  backdrop: "The dimmed layer behind it",
  list: "The row or column that holds the items",
  media: "The picture or icon beside the text",
  close: "The button that closes it",
  destructive: "An item that deletes or can't be undone",
  "sub-trigger": "An item that opens a menu beside it",
  thumb: "The handle you drag",
  error: "The message shown when something's wrong",
  input: "The field you type in",
  empty: "What shows when there's nothing to list",
  value: "The chosen value, as shown",
  caption: "The line of text describing it",
  track: "The full bar",
  range: "The filled stretch",
  legend: "The heading of a set of fields",
  choice: "One option to pick",
  control: "The part you operate",
  button: "Its button",
  handle: "The grip you drag",
  link: "A link in it",
  ellipsis: "The … standing for items not shown",
  badge: "The small count or status beside it",
  actions: "Its buttons, together",
  "scroll-button": "The arrow that scrolls a long list",
  tab: "One tab you click",
  panel: "What a tab shows",
  row: "One row",
  "head-cell": "A column's heading",
  cell: "One cell",
  arrow: "The small pointer toward what it's about",
  select: "The native dropdown",
  set: "A group of related fields",
  "separator-label": "The text on a dividing line",
  addon: "The text or icon joined to the field",
  slot: "One box for one character",
  caret: "The blinking cursor",
  bar: "The bar that holds the menus",
  "group-heading": "The heading over a group",
  field: "The field you type in",
  chip: "A chosen value, shown as a small tag",
  "chip-remove": "The × that removes a tag",
  toast: "One notification",
  cancel: "Its dismiss button",
  page: "The current page, not a link",
  viewport: "The area that scrolls",
  scrollbar: "The scrollbar",
  frame: "The circle or square it sits in",
  image: "The picture",
  fallback: "The initials shown when there's no picture",
  "group-count": "The +N for the ones not shown",
  text: "Plain text joined to the buttons",
  h1: "The largest heading",
  h2: "A section heading",
  h3: "A smaller heading",
  h4: "The smallest heading",
  p: "A paragraph",
  lead: "The larger opening paragraph",
  large: "Larger text",
  small: "Smaller text",
  muted: "Quieter, secondary text",
  blockquote: "A quotation",
  code: "Inline code",
  grip: "The dots you drag",
  axis: "An axis's labels",
  grid: "The grid lines behind the data",
  cursor: "The line or band following the pointer",
  tooltip: "The box that shows the values",
  "tooltip-label": "The tooltip's heading",
  "tooltip-value": "A value in the tooltip",
  weekday: "The day names over the columns",
  day: "One day you can pick",
  selected: "The chosen day",
  today: "Today",
  outside: "Days from the months either side",
  dropdown: "The month and year pickers",
  toolbar: "The row of controls above the table",
  avatar: "The picture of who sent it",
  reactions: "The reactions under it",
  rule: "The line through it",
  progress: "How far along it is",
  choices: "The options to pick from",
  surface: "The sidebar's background",
  section: "A group of links",
  sub: "Links nested under another",
  inset: "The main area beside the sidebar",
  rail: "The thin edge you drag or click to fold it",
};
const PART_ABOUT_IN: Record<string, string> = {
  "slider.track": "The full bar the thumb slides along",
  "slider.range": "The filled stretch of the bar, up to the thumb",
  "slider.thumb": "The handle you drag",
  "progress.track": "The full bar, all the way to done",
  "progress.indicator": "The filled stretch showing how far along it is",
  "switch.thumb": "The knob that slides from off to on",
  "scroll-area.thumb": "The part of the scrollbar you drag",
  "checkbox.indicator": "The check that shows when it's ticked",
  "radio-group.indicator": "The dot that shows which one's chosen",
  "tabs.indicator": "The underline or pill under the chosen tab",
  "calendar.range": "The days between a range's first and last",
  "resizable.handle": "The line between the panes you drag",
  "drawer.handle": "The bar at the top you drag it by",
  "input-otp.group": "The boxes that go together",
  "button.label": "The button's text",
};

export function partAbout(component: string, part: string): string | null {
  if (part === "root") return `The whole ${componentName(component).toLowerCase()}, its outer box: most of its look is set here`;
  return PART_ABOUT_IN[`${component}.${part}`] ?? PART_ABOUT[part] ?? null;
}
