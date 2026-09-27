import type { ThemeConfig } from "antd";

export const brand = {
  primary: "#0f766e",
  danger: "#be123c",
  success: "#15803d",
  warning: "#b45309",
};

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: brand.primary,
    colorError: brand.danger,
    colorSuccess: brand.success,
    colorWarning: brand.warning,
    colorBgBase: "#ffffff",
    colorTextBase: "#111827",
    colorBorder: "#d1d5db",
    borderRadius: 4,
    fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
  },
  components: {
    Button: { controlHeight: 36 },
    Layout: { headerBg: "#0b1f1e" },
  },
};
