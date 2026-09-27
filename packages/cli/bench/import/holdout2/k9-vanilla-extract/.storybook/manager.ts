import { addons } from "@storybook/manager-api";
import { create } from "@storybook/theming";

addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "Quill UI",
    colorPrimary: "#ff4785",
    colorSecondary: "#1ea7fd",
    appBg: "#f6f9fc",
    appContentBg: "#ffffff",
    appBorderColor: "#e6e9ec",
    textColor: "#2e3438",
    barSelectedColor: "#1ea7fd",
  }),
});
