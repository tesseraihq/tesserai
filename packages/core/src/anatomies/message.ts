import { Anatomy } from "../components";
import { rem } from "./shared";

// One message in a conversation: an avatar, then a header, the content (bubbles, attachments) and a footer.
export const message = Anatomy.parse({
  name: "message",
  parts: ["root", "avatar", "content", "header", "footer"],
  states: [],
  axes: {},
  tokens: { "avatar-size": { $type: "dimension", $value: rem(32) } },
  base: {
    root: { base: { gap: "{space.3}", fontSize: "{font.size.2}" } },
    avatar: { base: { background: "{intent.neutral.subtle}", radius: "{radius.full}", minWidth: "{message.avatar-size}" } },
    content: { base: { gap: "{space.3}" } },
    header: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", fontWeight: "{font.weight.medium}", paddingX: "{space.4}" } },
    footer: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", fontWeight: "{font.weight.medium}", paddingX: "{space.4}" } },
  },
  sizes: {},
  variants: {},
});
