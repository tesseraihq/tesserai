import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const card = style({
  background: vars.color.raised,
  border: `1px solid ${vars.color.hairline}`,
  borderRadius: vars.radius.lg,
  padding: vars.space["6"],
  display: "grid",
  gap: vars.space["3"],
});

export const meta = style({
  color: vars.color.inkSubtle,
  fontSize: vars.fontSize.sm,
});

export const synced = style({ color: vars.color.positive });
export const conflict = style({ color: vars.color.caution });
