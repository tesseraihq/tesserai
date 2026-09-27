import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../styles/theme.css";

export const button = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: vars.space["2"],
    padding: `${vars.space["2"]} ${vars.space["4"]}`,
    borderRadius: vars.radius.md,
    border: "1px solid transparent",
    fontFamily: vars.font.body,
    fontSize: vars.fontSize.sm,
    fontWeight: 600,
    cursor: "pointer",
  },
  variants: {
    tone: {
      accent: {
        background: vars.color.accent,
        color: vars.color.onAccent,
        ":hover": { background: vars.color.accentHover },
      },
      quiet: {
        background: "transparent",
        borderColor: vars.color.hairline,
        color: vars.color.ink,
      },
      critical: {
        background: vars.color.critical,
        color: vars.color.onAccent,
      },
    },
  },
  defaultVariants: { tone: "accent" },
});
