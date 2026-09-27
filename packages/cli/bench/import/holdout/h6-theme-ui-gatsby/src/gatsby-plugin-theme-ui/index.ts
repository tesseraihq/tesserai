import type { Theme } from "theme-ui"
import { colors } from "./colors"

const theme: Theme = {
  config: {
    initialColorModeName: "light",
    useColorSchemeMediaQuery: "system",
  },
  colors,
  fonts: {
    body: '"Work Sans", system-ui, -apple-system, sans-serif',
    heading: '"Playfair Display", Georgia, serif',
    monospace: '"Fira Code", Menlo, monospace',
  },
  fontSizes: [12, 14, 17, 20, 24, 30, 38, 48],
  fontWeights: {
    body: 400,
    heading: 700,
    bold: 600,
  },
  lineHeights: {
    body: 1.6,
    heading: 1.15,
  },
  space: [0, 4, 8, 16, 24, 32, 48, 64, 96],
  radii: [0, 3, 6, 12, 9999],
  sizes: {
    container: 1080,
    measure: 680,
  },
  text: {
    heading: {
      fontFamily: "heading",
      fontWeight: "heading",
      lineHeight: "heading",
      color: "text",
    },
    muted: {
      color: "gray",
      fontSize: 1,
    },
  },
  buttons: {
    primary: {
      color: "background",
      bg: "primary",
      borderRadius: 2,
      fontWeight: "bold",
      cursor: "pointer",
      "&:hover": { bg: "secondary" },
    },
    ghost: {
      color: "text",
      bg: "transparent",
      border: "1px solid",
      borderColor: "border",
      borderRadius: 2,
    },
  },
  cards: {
    primary: {
      bg: "surface",
      border: "1px solid",
      borderColor: "border",
      borderRadius: 3,
      p: 4,
    },
  },
  styles: {
    root: {
      fontFamily: "body",
      fontSize: 2,
      lineHeight: "body",
      fontWeight: "body",
      color: "text",
      bg: "background",
    },
    h1: { variant: "text.heading", fontSize: 6 },
    h2: { variant: "text.heading", fontSize: 5 },
    a: { color: "primary" },
    code: { fontFamily: "monospace", bg: "muted", px: 1, borderRadius: 1 },
  },
}

export default theme
