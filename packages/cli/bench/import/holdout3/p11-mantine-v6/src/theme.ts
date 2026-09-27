import type { MantineThemeOverride, Tuple, DefaultMantineColor } from '@mantine/core';

type ExtendedCustomColors = 'pine' | DefaultMantineColor;

declare module '@mantine/core' {
  export interface MantineThemeColorsOverride {
    colors: Record<ExtendedCustomColors, Tuple<string, 10>>;
  }
}

export const theme: MantineThemeOverride = {
  fontFamily: 'Lexend, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  fontFamilyMonospace: 'Roboto Mono, Monaco, Courier, monospace',
  headings: {
    fontFamily: 'Lexend, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    fontWeight: 600,
  },

  white: '#fdfdfc',
  black: '#17191c',

  colors: {
    pine: ['#e9f7f1', '#cdeee0', '#a0dfc7', '#6ccbaa', '#40b48d', '#27997a', '#1b7c63', '#166651', '#135244', '#0f4237'],
    // Replaces Mantine's own dark ramp: slightly blue-shifted
    dark: ['#dfe2e6', '#b5bac2', '#8c93a0', '#646c7a', '#3f4652', '#2e333c', '#23272e', '#1b1e24', '#15171c', '#0f1114'],
  },
  primaryColor: 'pine',
  primaryShade: { light: 7, dark: 4 },

  defaultRadius: 'md',
  radius: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.75rem',
    xl: '1.5rem',
  },

  components: {
    Card: {
      defaultProps: { withBorder: true, padding: 'lg' },
    },
    Button: {
      defaultProps: { fw: 500 },
    },
  },
};
