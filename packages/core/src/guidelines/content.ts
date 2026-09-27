// What the design-system world has settled on, in tesserai's own words, each with where it comes
// from. The AI reads these (by topic) to advise and teach; review.ts checks the measurable ones
// against a change; the docs and the CLI's MCP server can serve them too. Paraphrased, never
// copied: a source is named so a person can read the original.

export type GuidelineSource = { name: string; url?: string };
export type Guideline = {
  id: string;
  topic: GuidelineTopic;
  title: string;
  // The guidance itself, in a sentence or two.
  rule: string;
  // Why it matters, for someone who hasn't met it before.
  why: string;
  // "must": a standard (WCAG AA) or something that breaks for people; "should": settled practice.
  level: "must" | "should";
  sources: GuidelineSource[];
};

import { GUIDELINE_TOPICS, type GuidelineTopic } from "./topics";
export { GUIDELINE_TOPICS, GUIDELINE_TOPIC_NAMES, type GuidelineTopic } from "./topics";

const WCAG = (sc: string, slug: string): GuidelineSource => ({ name: `WCAG 2.2, ${sc}`, url: `https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html` });
const HIG = (page: string, path: string): GuidelineSource => ({ name: `Apple Human Interface Guidelines, ${page}`, url: `https://developer.apple.com/design/human-interface-guidelines/${path}` });
const MATERIAL = (page: string, path: string): GuidelineSource => ({ name: `Material Design 3, ${page}`, url: `https://m3.material.io/${path}` });
const APG = (pattern: string, slug: string): GuidelineSource => ({ name: `WAI-ARIA Authoring Practices, ${pattern}`, url: `https://www.w3.org/WAI/ARIA/apg/patterns/${slug}/` });
const RADIX_SCALE: GuidelineSource = { name: "Radix Colors, understanding the scale", url: "https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale" };

export const GUIDELINES: Guideline[] = [
  // ---------- color ----------
  {
    id: "color-scale-steps",
    topic: "color",
    title: "Each step of a scale has a job",
    rule: "In a 12-step scale, steps 1–2 are app and subtle backgrounds, 3–5 are component backgrounds (rest, hover, pressed), 6–8 are borders (subtle, default, strong), 9–10 are solid fills (rest, hover), and 11–12 are text (muted, strong). Use the step for the job rather than picking by eye.",
    why: "When every color comes from its job, hover and pressed states, borders and text line up across components and keep working in dark mode, where the steps are rebuilt for dark surfaces.",
    level: "should",
    sources: [RADIX_SCALE],
  },
  {
    id: "color-palettes-earn-place",
    topic: "color",
    title: "Keep only the palettes the look uses",
    rule: "Keep a brand palette, a neutral, and a palette per meaning that needs its own color: danger always, warning usually. Success and info can use the brand unless the product shows its own green or blue; never when the brand is close to danger's red, and success never when the brand is a grey, black or white (it would stop reading as good news).",
    why: "Stock green and blue next to a restrained brand look pasted in. Fewer palettes make a calmer, more recognisable product, and meaning stays clear as long as danger stays distinct.",
    level: "should",
    sources: [{ name: "Common practice in product design systems (for example Linear, Stripe, Vercel)" }],
  },
  {
    id: "color-not-alone",
    topic: "color",
    title: "Never use color as the only signal",
    rule: "Pair meaning colors with an icon, text or shape: an error field has a message, a required field says so, a selected tab has a marker, a link in body text is underlined or otherwise distinct.",
    why: "About 1 in 12 men and 1 in 200 women have a color vision deficiency, and colors wash out in sunlight and on cheap screens.",
    level: "must",
    sources: [WCAG("1.4.1 Use of Color", "use-of-color")],
  },
  {
    id: "color-meanings-semantic",
    topic: "color",
    title: "Name colors by meaning, not hue",
    rule: "Components use roles (primary, danger, success, neutral), and roles point at palettes. Never reach for a raw hue (red.9) inside a component.",
    why: "A rebrand or a new dark mode then changes one mapping instead of every component, and people reading the code know why a color is there.",
    level: "should",
    sources: [{ name: "Design Tokens Community Group format", url: "https://www.designtokens.org/" }],
  },

  // ---------- contrast ----------
  {
    id: "contrast-text",
    topic: "contrast",
    title: "Text contrast: 4.5:1, or 3:1 for large text",
    rule: "Body and UI text needs at least 4.5:1 against its background. Large text (24px and up, or about 19px bold) needs 3:1. Check every state (hover, disabled is exempt) and both light and dark.",
    why: "Below these ratios, text becomes hard or impossible to read for people with low vision, and for everyone in glare.",
    level: "must",
    sources: [WCAG("1.4.3 Contrast (Minimum)", "contrast-minimum")],
  },
  {
    id: "contrast-ui",
    topic: "contrast",
    title: "Controls and focus rings: 3:1",
    rule: "The parts that show a control is there (an input's border, a checkbox's box, a switch's track, a focus ring) need 3:1 against what's next to them.",
    why: "A field whose edge disappears into the page, or a focus ring nobody can see, can't be used by people who can't find it.",
    level: "must",
    sources: [WCAG("1.4.11 Non-text Contrast", "non-text-contrast")],
  },

  // ---------- type ----------
  {
    id: "type-scale-ratio",
    topic: "type",
    title: "A type scale grows by a steady ratio",
    rule: "Each step is the one below times a ratio: about 1.125–1.2 for dense product UI, 1.25 for most apps, 1.333 or more for marketing and editorial. Every step must be larger than the one before.",
    why: "A steady ratio makes hierarchy readable at a glance; a step that's the same size as, or smaller than, the one below reads as a mistake.",
    level: "should",
    sources: [{ name: "Tim Brown, More Meaningful Typography (A List Apart)", url: "https://alistapart.com/article/more-meaningful-typography/" }],
  },
  {
    id: "type-min-size",
    topic: "type",
    title: "Keep text at 12px or more",
    rule: "Body text reads best at 14–16px on the web; supporting text and labels shouldn't go below 12px, and 11px is the floor Apple sets for anything a person must read.",
    why: "Small text is the most common readability complaint, and it gets worse on high-density phones held at arm's length.",
    level: "should",
    sources: [HIG("Typography", "typography")],
  },
  {
    id: "type-input-16",
    topic: "type",
    title: "Inputs at 16px stop iPhones zooming in",
    rule: "Safari on iPhone zooms the page when someone focuses a field whose text is under 16px. Use 16px for input text on touch, or accept the zoom.",
    why: "The zoom shifts the layout under the person's thumb and they have to pinch back out after every field.",
    level: "should",
    sources: [{ name: "WebKit behavior on iOS (long-standing)" }],
  },
  {
    id: "type-line-height",
    topic: "type",
    title: "Line height: about 1.5 for text, tighter for headings",
    rule: "Paragraphs read well at 1.4–1.6; headings at 1.1–1.3; single-line UI labels can be tighter. Lines of 45–75 characters are easiest to read.",
    why: "Too tight and lines blur together; too loose and the eye loses its place moving to the next line.",
    level: "should",
    sources: [WCAG("1.4.12 Text Spacing", "text-spacing"), { name: "Robert Bringhurst, The Elements of Typographic Style" }],
  },

  // ---------- spacing ----------
  {
    id: "spacing-grid",
    topic: "spacing",
    title: "Space on a 4px grid",
    rule: "Spacing, sizes and paddings are multiples of 4px (2px for the smallest nudges). Pick from the spacing scale rather than typing values.",
    why: "A shared grid makes things line up without effort, keeps rhythm consistent between screens, and makes a density change a single edit.",
    level: "should",
    sources: [MATERIAL("Spacing", "foundations/layout/understanding-layout/spacing"), { name: "Carbon Design System, Spacing", url: "https://carbondesignsystem.com/elements/spacing/overview/" }],
  },
  {
    id: "spacing-proximity",
    topic: "spacing",
    title: "Closer means related",
    rule: "Space inside a group is smaller than space between groups: a label sits closer to its field than to the next field, a card's padding is larger than the gaps inside it.",
    why: "People read grouping from spacing before they read any words; equal spacing everywhere makes a screen feel like a list of unrelated parts.",
    level: "should",
    sources: [{ name: "Gestalt principle of proximity (Nielsen Norman Group)", url: "https://www.nngroup.com/articles/gestalt-proximity/" }],
  },

  // ---------- radius ----------
  {
    id: "radius-nested",
    topic: "radius",
    title: "Nested corners: inner = outer − padding",
    rule: "When a rounded element sits inside another, give it the outer radius minus the padding between them (never more than the outer).",
    why: "Matching radii look uneven: the gap between the curves swells at the corners. Subtracting the padding keeps the gap even.",
    level: "should",
    sources: [{ name: "Common practice (concentric corners)" }],
  },
  {
    id: "radius-consistent",
    topic: "radius",
    title: "Few radii, used by size",
    rule: "Use a small set: smaller corners for small controls, larger for cards and dialogs, full for pills. Controls of the same height share a radius.",
    why: "Corners carry a lot of a brand's feel; many slightly different radii read as unfinished.",
    level: "should",
    sources: [MATERIAL("Shape", "styles/shape/overview-principles")],
  },

  // ---------- elevation ----------
  {
    id: "elevation-levels",
    topic: "elevation",
    title: "A few elevation levels, one light source",
    rule: "Use three or so levels (resting, raised like menus, overlay like dialogs), with shadows from one direction. In dark mode, show height with lighter surfaces rather than stronger shadows.",
    why: "Height tells people what's on top and what they can act on; shadows are nearly invisible on dark backgrounds.",
    level: "should",
    sources: [MATERIAL("Elevation", "styles/elevation/overview")],
  },

  // ---------- motion ----------
  {
    id: "motion-duration",
    topic: "motion",
    title: "UI motion: 100–300ms, exits faster",
    rule: "Small changes (hover, a toggle) take 100–150ms; panels and dialogs 200–300ms; nothing a person waits on should take more than about 400ms. Leaving is faster than arriving.",
    why: "Motion should explain a change, not delay it; long transitions make an app feel slow even when it isn't.",
    level: "should",
    sources: [MATERIAL("Easing and duration", "styles/motion/easing-and-duration/tokens-specs")],
  },
  {
    id: "motion-reduced",
    topic: "motion",
    title: "Respect reduced motion",
    rule: "When the system asks for reduced motion, replace movement with a quick fade or nothing, especially large slides, parallax and zooms.",
    why: "Movement across the screen can cause nausea and dizziness for people with vestibular disorders.",
    level: "must",
    sources: [WCAG("2.3.3 Animation from Interactions", "animation-from-interactions")],
  },

  // ---------- states ----------
  {
    id: "states-focus-visible",
    topic: "states",
    title: "A focus ring everyone can see",
    rule: "Keyboard focus shows a ring at least 2px thick with 3:1 contrast against its surroundings, and never disappears (removing outlines without a replacement fails).",
    why: "Keyboard and switch users navigate by the ring; without it they don't know where they are.",
    level: "must",
    sources: [WCAG("2.4.7 Focus Visible", "focus-visible"), WCAG("2.4.13 Focus Appearance", "focus-appearance")],
  },
  {
    id: "states-layers",
    topic: "states",
    title: "Hover and pressed are small steps",
    rule: "Hover and pressed shift the fill one step (or a light overlay of about 8% and 12%), not a new color. Disabled lowers emphasis (content around 38% opacity) and isn't the only way to explain why something can't be used.",
    why: "Consistent small shifts feel responsive without flashing, and work for every color the component takes.",
    level: "should",
    sources: [MATERIAL("States", "foundations/interaction/states/state-layers")],
  },

  // ---------- targets ----------
  {
    id: "targets-minimum",
    topic: "targets",
    title: "Targets at least 24×24px",
    rule: "Anything clickable is at least 24×24px, or has enough space around it that a 24px circle on it doesn't touch another target.",
    why: "Small targets are missed by people with tremors, on trackpads, and by everyone on a bumpy train.",
    level: "must",
    sources: [WCAG("2.5.8 Target Size (Minimum)", "target-size-minimum")],
  },
  {
    id: "targets-touch",
    topic: "targets",
    title: "On touch, 44–48px",
    rule: "On phones and tablets, targets are 44pt (Apple) to 48dp (Android) tall. Desktop UI can be denser; use the touch mode to raise sizes on touch screens only.",
    why: "A fingertip covers about 10mm; smaller targets cause mis-taps, which are especially costly on destructive actions.",
    level: "should",
    sources: [HIG("Accessibility", "accessibility"), MATERIAL("Accessible design: structure", "foundations/designing/structure"), WCAG("2.5.5 Target Size (Enhanced)", "target-size-enhanced")],
  },

  // ---------- dark mode ----------
  {
    id: "dark-surfaces",
    topic: "dark-mode",
    title: "Dark mode isn't inverted light mode",
    rule: "Use a very dark grey rather than pure black for large surfaces, lighter surfaces for raised layers, slightly less saturated brand colors, and check contrast again in dark: it fails in different places.",
    why: "Pure black with bright text causes halation for many readers; saturated colors vibrate on dark backgrounds.",
    level: "should",
    sources: [MATERIAL("Color roles", "styles/color/roles")],
  },

  // ---------- tokens ----------
  {
    id: "tokens-tiers",
    topic: "tokens",
    title: "Three tiers: primitives, roles, components",
    rule: "Primitives hold raw values (color.blue.9, space.4); roles give them meaning (intent.primary.solid, surface.card); components use roles (button.radius → radius.md). Components never use primitives directly.",
    why: "Each tier changes for a different reason, so a rebrand, a dark mode or a component tweak each stays one edit.",
    level: "should",
    sources: [{ name: "Design Tokens Community Group format", url: "https://www.designtokens.org/" }],
  },

  // ---------- sizes ----------
  {
    id: "sizes-scale",
    topic: "sizes",
    title: "A size scale moves together",
    rule: "Each size (xs, sm, md, lg) sets height, horizontal padding, text size, icon size and gap together, stepping on the 4px grid (heights like 24, 32, 36/40, 44/48). Buttons, inputs and selects of the same name share a height so they line up in a row.",
    why: "When only the height changes, text and icons look cramped or lost; mismatched heights make forms and toolbars look broken.",
    level: "should",
    sources: [MATERIAL("Buttons", "components/buttons/specs"), { name: "Common practice across shadcn/ui, Radix Themes and Carbon" }],
  },
  {
    id: "sizes-adding",
    topic: "sizes",
    title: "Adding a size: extend the pattern, don't invent one",
    rule: "Before adding a size, check whether an existing one can be adjusted. A new size sits on the grid between or beyond its neighbours, takes padding, text and icon sizes that follow their progression, gets a name in the same series, and is added to every component that shares the size axis where it makes sense.",
    why: "Each size is a promise to every screen that uses the system; too many sizes with irregular steps is the most common way scales decay.",
    level: "should",
    sources: [{ name: "Common practice in design-system maintenance" }],
  },

  // ---------- components ----------
  {
    id: "button-hierarchy",
    topic: "button",
    title: "One primary action per view",
    rule: "Each screen or group has at most one primary (solid, brand) button; other actions are secondary (outline or soft) or tertiary (ghost, link). Destructive actions use the danger meaning and say what they do (\"Delete project\").",
    why: "When everything is loud, nothing is; people should find the main path without reading every button.",
    level: "should",
    sources: [MATERIAL("Buttons", "components/buttons/guidelines"), { name: "Nielsen Norman Group, button states and hierarchy", url: "https://www.nngroup.com/articles/button-states-communicate-interaction/" }],
  },
  {
    id: "button-labels",
    topic: "button",
    title: "Buttons say what happens",
    rule: "Label with a verb and its object (\"Save changes\", \"Invite teammate\") rather than \"OK\" or \"Submit\"; icon-only buttons need an accessible name.",
    why: "Specific labels let people act without reading the surrounding text, and screen readers announce nothing useful for an unnamed icon.",
    level: "should",
    sources: [HIG("Buttons", "buttons")],
  },
  {
    id: "input-labels",
    topic: "input",
    title: "Visible labels, errors in words",
    rule: "Every field has a visible label (a placeholder isn't one); errors appear next to the field, say how to fix it, and use more than red.",
    why: "Placeholders disappear as soon as someone types, and a red border alone is invisible to many people.",
    level: "must",
    sources: [WCAG("3.3.2 Labels or Instructions", "labels-or-instructions"), WCAG("3.3.1 Error Identification", "error-identification")],
  },
  {
    id: "choice-switch-vs-checkbox",
    topic: "choice",
    title: "Switch for now, checkbox for later",
    rule: "A switch takes effect immediately (like a light switch); a checkbox is a choice submitted with a form. Radios pick one of a few visible options. The label is part of the target.",
    why: "People expect a switch to act at once; a switch that waits for Save, or a checkbox that acts instantly, surprises them.",
    level: "should",
    sources: [{ name: "Nielsen Norman Group, toggle switch guidelines", url: "https://www.nngroup.com/articles/toggle-switch-guidelines/" }],
  },
  {
    id: "card-usage",
    topic: "card",
    title: "Cards group one thing",
    rule: "A card holds one subject with its actions; avoid cards inside cards. Use one padding and radius for ordinary cards, with a border or a shadow (rarely both).",
    why: "Nested and inconsistent cards add visual noise without adding grouping.",
    level: "should",
    sources: [MATERIAL("Cards", "components/cards/guidelines")],
  },
  {
    id: "badge-usage",
    topic: "badge",
    title: "Badges label, they don't act",
    rule: "Badges are short (one or two words), not clickable, and pair color with text. Use the neutral style by default and meaning colors only when the status matters.",
    why: "Clickable-looking badges get clicked; a page full of colored badges loses the ones that matter.",
    level: "should",
    sources: [{ name: "Common practice (Primer, Polaris, Carbon)" }],
  },
  {
    id: "dialog-behaviour",
    topic: "dialog",
    title: "Dialogs trap focus and give it back",
    rule: "A modal dialog moves focus into itself, keeps Tab inside, closes on Escape, and returns focus to what opened it. It has a title, one primary action, and a way out.",
    why: "Without this, keyboard and screen-reader users end up behind the dialog or lost at the top of the page.",
    level: "must",
    sources: [APG("Dialog (Modal)", "dialog-modal")],
  },
  {
    id: "feedback-toasts",
    topic: "feedback",
    title: "Toasts for passing news, alerts for problems",
    rule: "Toasts confirm what just happened and fade on their own; anything with an action (Undo) stays long enough to use or until dismissed. Errors that need attention stay on the page as an alert.",
    why: "People miss timed messages, and an action that vanishes before it can be used fails people who read or move slowly.",
    level: "must",
    sources: [WCAG("2.2.1 Timing Adjustable", "timing-adjustable")],
  },
  {
    id: "tabs-behaviour",
    topic: "tabs",
    title: "Tabs switch views in place",
    rule: "Tabs show sibling views of the same thing; the selected tab is marked by more than color; arrow keys move between tabs. Use a segmented control for filtering one view, and navigation for going to another page.",
    why: "Tabs that navigate away or look like buttons confuse where the person is.",
    level: "should",
    sources: [APG("Tabs", "tabs")],
  },
  {
    id: "table-numbers",
    topic: "table",
    title: "Tables: align for comparison",
    rule: "Right-align numbers and use tabular figures so digits line up; left-align text; keep headers aligned with their columns; offer a denser row height for data-heavy screens.",
    why: "People scan tables to compare values; misaligned digits make that slow and error-prone.",
    level: "should",
    sources: [{ name: "Nielsen Norman Group, data tables", url: "https://www.nngroup.com/articles/data-tables/" }],
  },
  {
    id: "navigation-current",
    topic: "navigation",
    title: "Show where people are",
    rule: "The current page in navigation is marked by more than color (weight, a marker, a background) and announced as current.",
    why: "People lose their place when every link looks the same, and screen readers need to be told.",
    level: "should",
    sources: [WCAG("1.4.1 Use of Color", "use-of-color")],
  },
];

const BY_ID = new Map(GUIDELINES.map((g) => [g.id, g]));
export function guideline(id: string): Guideline | undefined {
  return BY_ID.get(id);
}

export function guidelinesFor(topic: GuidelineTopic): Guideline[] {
  return GUIDELINES.filter((g) => g.topic === topic);
}

// One line per topic, for the AI's standing instructions.
export function guidelineIndex(): string {
  return Object.entries(GUIDELINE_TOPICS)
    .map(([id, about]) => `${id}: ${about}`)
    .join("; ");
}
