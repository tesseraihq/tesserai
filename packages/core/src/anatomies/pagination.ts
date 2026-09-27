import { Anatomy } from "../components";

// Page links are the system's buttons (ghost, and outline for the current page, as in shadcn);
// Pagination itself only spaces them and draws the ellipsis.
export const pagination = Anatomy.parse({
  name: "pagination",
  parts: ["content", "ellipsis"],
  states: [],
  axes: {},
  tokens: {
    gap: { $type: "dimension", $value: "{space.2}" },
  },
  base: {
    content: { base: { gap: "{pagination.gap}" } },
    ellipsis: { base: { foreground: "{intent.neutral.text}", size: "{button.height.md}" } },
  },
  sizes: {},
  variants: {},
});
