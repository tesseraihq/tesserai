import { Anatomy } from "../components";

// shadcn's typography recipes as components, drawn from the type scale.
export const typography = Anatomy.parse({
  name: "typography",
  parts: ["h1", "h2", "h3", "h4", "p", "lead", "large", "small", "muted", "blockquote", "list", "code"],
  states: [],
  axes: {},
  tokens: {},
  base: {
    h1: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.8}", fontWeight: "{font.weight.bold}", letterSpacing: "{font.tracking.tight}", lineHeight: "{font.leading.8}" } },
    h2: {
      base: {
        fontFamily: "{font.family.heading}",
        fontSize: "{font.size.6}",
        fontWeight: "{font.weight.semibold}",
        letterSpacing: "{font.tracking.tight}",
        lineHeight: "{font.leading.6}",
        border: "{intent.neutral.border}",
        borderWidth: "{border.width}",
        paddingY: "{space.3}",
      },
    },
    h3: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.5}", fontWeight: "{font.weight.semibold}", letterSpacing: "{font.tracking.tight}", lineHeight: "{font.leading.5}" } },
    h4: { base: { fontFamily: "{font.family.heading}", fontSize: "{font.size.4}", fontWeight: "{font.weight.semibold}", letterSpacing: "{font.tracking.tight}", lineHeight: "{font.leading.4}" } },
    p: { base: { fontSize: "{font.size.3}", lineHeight: "{font.leading.3}" } },
    lead: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.4}", lineHeight: "{font.leading.4}" } },
    large: { base: { fontSize: "{font.size.4}", fontWeight: "{font.weight.semibold}" } },
    small: { base: { fontSize: "{font.size.2}", fontWeight: "{font.weight.medium}" } },
    muted: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}" } },
    blockquote: { base: { border: "{intent.neutral.border-strong}", borderWidth: "{border.width}", paddingX: "{space.6}", fontStyle: "italic" } },
    list: { base: { gap: "{space.3}" } },
    code: { base: { background: "{intent.neutral.subtle}", radius: "{radius.sm}", paddingX: "{space.2}", fontFamily: "{font.family.mono}", fontSize: "{font.size.2}", fontWeight: "{font.weight.semibold}" } },
  },
  sizes: {},
  variants: {},
});
