// The guideline topics and their names, apart from the guidelines themselves: small enough for a
// "?" beside every concept to name its topic without loading the guidelines until it opens.

export const GUIDELINE_TOPICS = {
  color: "Palettes, color roles and scale steps, meaning colors, color alone",
  contrast: "Text and UI contrast ratios, in light and dark",
  type: "Type scale, sizes, line height, line length, weights",
  spacing: "The spacing grid and rhythm",
  radius: "Corner radius, nested corners, consistency",
  elevation: "Shadows and surfaces, layering",
  motion: "Durations, easing, reduced motion",
  states: "Hover, pressed, focus and disabled states",
  targets: "Touch and pointer target sizes",
  "dark-mode": "Dark surfaces, color in dark, checking both",
  tokens: "Naming and layering tokens",
  sizes: "Component size scales and adding a size",
  button: "Buttons: hierarchy, sizes, labels",
  input: "Text fields and selects: labels, errors, heights",
  choice: "Checkboxes, radios and switches",
  card: "Cards and panels",
  badge: "Badges and tags",
  dialog: "Dialogs and sheets",
  feedback: "Toasts and alerts",
  tabs: "Tabs and segmented controls",
  table: "Tables and data",
  navigation: "Navigation and the current page",
} as const;
export type GuidelineTopic = keyof typeof GUIDELINE_TOPICS;

// What each topic is called where people read the guides.
export const GUIDELINE_TOPIC_NAMES: Record<GuidelineTopic, string> = {
  color: "Color",
  contrast: "Contrast",
  type: "Type",
  spacing: "Spacing",
  radius: "Corners",
  elevation: "Elevation",
  motion: "Motion",
  states: "States and focus",
  targets: "Click and touch targets",
  "dark-mode": "Dark mode",
  tokens: "Tokens",
  sizes: "Component sizes",
  button: "Buttons",
  input: "Text fields",
  choice: "Checkboxes, radios and switches",
  card: "Cards",
  badge: "Badges",
  dialog: "Dialogs",
  feedback: "Toasts and alerts",
  tabs: "Tabs",
  table: "Tables",
  navigation: "Navigation",
};
