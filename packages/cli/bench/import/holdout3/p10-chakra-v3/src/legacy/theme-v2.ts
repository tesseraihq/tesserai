// Chakra v2 theme from before the v3 migration (PR #412). Not imported anywhere;
// delete once the admin app is migrated too.
import { extendTheme } from "@chakra-ui/react";

export const legacyTheme = extendTheme({
  colors: {
    brand: {
      50: "#ebf8ff",
      500: "#3182ce",
      600: "#2b6cb0",
      700: "#2c5282",
    },
  },
  fonts: {
    heading: "'Work Sans', sans-serif",
    body: "'Work Sans', sans-serif",
  },
  styles: {
    global: {
      body: { bg: "#f7fafc", color: "#1a202c" },
    },
  },
});
