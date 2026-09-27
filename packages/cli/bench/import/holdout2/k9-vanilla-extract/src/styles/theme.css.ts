import { createGlobalTheme, createGlobalThemeContract } from "@vanilla-extract/css";
import { palette } from "./palette";

export const vars = createGlobalThemeContract(
  {
    color: {
      canvas: null,
      raised: null,
      ink: null,
      inkSubtle: null,
      hairline: null,
      accent: null,
      accentHover: null,
      onAccent: null,
      critical: null,
      positive: null,
      caution: null,
    },
    font: {
      body: null,
      display: null,
      code: null,
    },
    fontSize: {
      sm: null,
      md: null,
      lg: null,
      xl: null,
    },
    space: {
      "1": null,
      "2": null,
      "3": null,
      "4": null,
      "6": null,
      "8": null,
    },
    radius: {
      sm: null,
      md: null,
      lg: null,
      pill: null,
    },
  },
  (_value, path) => `quill-${path.join("-")}`,
);

createGlobalTheme(":root", vars, {
  color: {
    canvas: palette.sand50,
    raised: palette.white,
    ink: palette.sand900,
    inkSubtle: palette.sand600,
    hairline: palette.sand200,
    accent: palette.plum700,
    accentHover: palette.plum900,
    onAccent: palette.white,
    critical: palette.red600,
    positive: palette.green600,
    caution: palette.amber500,
  },
  font: {
    body: '"Work Sans Variable", system-ui, sans-serif',
    display: '"Young Serif", Georgia, serif',
    code: '"Martian Mono", ui-monospace, monospace',
  },
  fontSize: {
    sm: "13px",
    md: "15px",
    lg: "18px",
    xl: "26px",
  },
  space: {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "6": "24px",
    "8": "32px",
  },
  radius: {
    sm: "4px",
    md: "8px",
    lg: "14px",
    pill: "999px",
  },
});

createGlobalTheme(':root[data-theme="dark"]', vars.color, {
  canvas: palette.night900,
  raised: palette.night800,
  ink: palette.night100,
  inkSubtle: palette.night300,
  hairline: palette.night700,
  accent: palette.plum300,
  accentHover: palette.plum100,
  onAccent: palette.plum900,
  critical: palette.red300,
  positive: palette.green300,
  caution: palette.amber300,
});
