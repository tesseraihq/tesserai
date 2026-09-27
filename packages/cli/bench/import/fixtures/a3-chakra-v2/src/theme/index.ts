import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = { initialColorMode: "system", useSystemColorMode: true };

export const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af", 400: "#fb7185",
      500: "#f43f5e", 600: "#e11d48", 700: "#be123c", 800: "#9f1239", 900: "#881337",
    },
  },
  fonts: { heading: "'Poppins', sans-serif", body: "'Inter', sans-serif" },
  radii: { md: "10px" },
  semanticTokens: {
    colors: {
      "bg.canvas": { default: "white", _dark: "gray.900" },
      "fg.default": { default: "gray.800", _dark: "whiteAlpha.900" },
    },
  },
  components: {
    Button: { defaultProps: { colorScheme: "brand" } },
  },
});
