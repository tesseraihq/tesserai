// Builds src/styles/generated/tokens.css (core + light) and tokens.dark.css (dark overrides only).
// Run with `npm run tokens`. The generated files are committed so designers can diff them in PRs.
const StyleDictionary = require('style-dictionary');

const MODES = ['light', 'dark'];

for (const mode of MODES) {
  const isDark = mode === 'dark';

  StyleDictionary.extend({
    include: ['tokens/core/**/*.json'],
    source: [`tokens/semantic/${mode}.json`],
    platforms: {
      css: {
        transformGroup: 'css',
        prefix: 'sd',
        buildPath: 'src/styles/generated/',
        files: [
          {
            destination: isDark ? 'tokens.dark.css' : 'tokens.css',
            format: 'css/variables',
            // dark only re-declares the semantic layer; the palette/size/font come from tokens.css
            ...(isDark ? { filter: (token) => token.isSource } : {}),
            options: {
              selector: isDark ? '[data-theme="dark"]' : ':root',
            },
          },
        ],
      },
    },
  }).buildAllPlatforms();
}
