import { Anatomy } from "../components";
import { rem } from "./shared";

// What a view shows when it has nothing yet: an icon, a title, a line of explanation, an action.
export const empty = Anatomy.parse({
  name: "empty",
  parts: ["root", "header", "media", "title", "description", "content"],
  states: [],
  axes: {},
  tokens: {
    padding: { $type: "dimension", $value: "{space.8}" },
    "media-size": { $type: "dimension", $value: rem(40) },
  },
  base: {
    root: { base: { gap: "{space.5}", radius: "{radius.lg}", padding: "{empty.padding}" } },
    header: { base: { gap: "{space.3}" } },
    // EmptyMedia variant="icon": the icon on a tile.
    media: { base: { background: "{intent.neutral.subtle}", foreground: "{intent.neutral.text-strong}", size: "{empty.media-size}", radius: "{radius.lg}" } },
    title: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.4}", fontWeight: "{font.weight.medium}", letterSpacing: "{font.tracking.tight}" } },
    description: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
    content: { base: { gap: "{space.5}", fontSize: "{font.size.2}" } },
  },
  sizes: {},
  variants: {},
});
