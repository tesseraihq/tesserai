import { palette as p } from "./palette";

const base = {
  radii: { sm: 4, md: 8, lg: 16 },
  fonts: { body: "'Work Sans', sans-serif", mono: "'Fira Code', monospace" },
  fontSizes: { body: "15px", small: "13px" },
  space: [0, 4, 8, 16, 24, 32],
};

export const lightTheme = {
  ...base,
  colors: { primary: p.blue600, onPrimary: p.white, background: p.white, text: p.gray900, border: p.gray200, danger: p.red600 },
};

export const darkTheme = {
  ...base,
  colors: { primary: p.blue300, onPrimary: p.gray950, background: p.gray950, text: p.gray50, border: p.gray700, danger: p.red400 },
};
