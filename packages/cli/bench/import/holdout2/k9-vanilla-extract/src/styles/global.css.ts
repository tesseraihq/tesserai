import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./theme.css";

globalStyle("*, *::before, *::after", { boxSizing: "border-box" });

globalStyle("body", {
  margin: 0,
  background: vars.color.canvas,
  color: vars.color.ink,
  fontFamily: vars.font.body,
  fontSize: vars.fontSize.md,
  lineHeight: 1.6,
});

globalStyle("h1, h2, h3", {
  fontFamily: vars.font.display,
  fontWeight: 400,
  lineHeight: 1.2,
});

globalStyle("code, pre, kbd", {
  fontFamily: vars.font.code,
  fontSize: "0.9em",
});
