// Kept apart, with no imports: the operations use it while they load, and the review imports them.
// The conventions a team can keep its own way, in words ("Kept as is: …"). Standards (targets under
// 24px, contrast, meanings that stop reading as good or bad news) can't be.
export const KEEPABLE: Record<string, string> = {
  text: "text under 12px",
  touch: "targets under 44px on touch screens",
  zoom: "input text under 16px on touch screens",
  grid: "spacing off the 4px grid",
  focus: "a focus ring under 2px",
  motion: "motion over 500ms",
  order: "sizes out of order",
  lineup: "buttons and inputs that don't line up",
  "type-scale": "a type scale that doesn't grow at every step",
  stock: "tesserai's stock status colors beside the brand",
};
