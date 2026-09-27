// Mantine v5 theme from the 2022 build. Superseded by src/theme.ts; left here
// until the embedded kiosk view (still on v5) is retired.
export const legacyTheme = {
  colorScheme: 'light',
  primaryColor: 'orange',
  fontFamily: 'Nunito, sans-serif',
  colors: {
    orange: ['#fff4e6', '#ffe8cc', '#ffd8a8', '#ffc078', '#ffa94d', '#ff922b', '#fd7e14', '#f76707', '#e8590c', '#d9480f'],
  },
  primaryShade: 7,
  globalStyles: () => ({
    body: { backgroundColor: '#fff9f2' },
  }),
};
