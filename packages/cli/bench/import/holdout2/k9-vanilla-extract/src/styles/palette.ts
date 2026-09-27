// Raw palette. Components should never import this directly — go through `vars`.
export const palette = {
  white: "#ffffff",

  plum900: "#2a1633",
  plum700: "#51306a",
  plum500: "#7a4fa0",
  plum300: "#c3a6de",
  plum100: "#efe7f6",

  sand50: "#fbf9f6",
  sand100: "#f3efe8",
  sand200: "#e4ddd1",
  sand600: "#6f6557",
  sand900: "#27231d",

  night900: "#141218",
  night800: "#1d1a22",
  night700: "#2d2934",
  night300: "#a7a1b2",
  night100: "#ece9f1",

  red600: "#c2352b",
  red300: "#f08a80",
  green600: "#2f7d4f",
  green300: "#7fcf9c",
  amber500: "#b7790b",
  amber300: "#f2c265",
} as const;
