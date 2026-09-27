// Mantine 6 theme, kept until the reporting embed moves to v7 (TIDE-412).
import type { MantineThemeOverride } from '@mantine/core';

export const legacyTheme: MantineThemeOverride = {
  colorScheme: 'light',
  primaryColor: 'brand',
  colors: {
    brand: ['#f3f0ff', '#e5dbff', '#d0bfff', '#b197fc', '#9775fa', '#845ef7', '#7048e8', '#6741d9', '#5f3dc4', '#5235ab'],
  },
  fontFamily: 'Roboto, sans-serif',
  defaultRadius: 'sm',
  globalStyles: (theme) => ({
    body: {
      backgroundColor: theme.colorScheme === 'dark' ? '#1a1b1e' : '#fffcf5',
      color: theme.colorScheme === 'dark' ? '#c1c2c5' : '#212529',
    },
  }),
};
