import { Anatomy } from "../components";

// A conversation's scrolling area: it keeps to the newest message and offers a jump back to it.
export const messageScroller = Anatomy.parse({
  name: "message-scroller",
  parts: ["content"],
  states: [],
  axes: {},
  tokens: {},
  base: { content: { base: { gap: "{space.7}" } } },
  sizes: {},
  variants: {},
});
