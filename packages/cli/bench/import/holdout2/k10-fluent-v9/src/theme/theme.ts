import { createDarkTheme, createLightTheme, type Theme } from "@fluentui/react-components";
import { kilnBrand } from "./brand";

const typography = {
  fontFamilyBase: '"IBM Plex Sans", -apple-system, "Segoe UI", system-ui, sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", Consolas, "Courier New", monospace',
};

const shape = {
  borderRadiusMedium: "6px",
  borderRadiusLarge: "10px",
};

export const kilnLightTheme: Theme = {
  ...createLightTheme(kilnBrand),
  ...typography,
  ...shape,
  // warm neutrals instead of Fluent's cool greys
  colorNeutralBackground1: "#fffdfa",
  colorNeutralBackground2: "#f7f4ef",
  colorNeutralForeground1: "#23201c",
  colorNeutralForeground3: "#6e675e",
  colorNeutralStroke2: "#e6e0d6",
};

export const kilnDarkTheme: Theme = {
  ...createDarkTheme(kilnBrand),
  ...typography,
  ...shape,
  colorBrandForeground1: kilnBrand[110],
  colorBrandForeground2: kilnBrand[120],
  colorNeutralBackground1: "#26231f",
  colorNeutralBackground2: "#1c1a17",
  colorNeutralForeground1: "#f3efe9",
  colorNeutralForeground3: "#b3aba0",
  colorNeutralStroke2: "#3b3731",
};
