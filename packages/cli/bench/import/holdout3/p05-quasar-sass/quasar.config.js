/* eslint-env node */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-js

const { configure } = require('quasar/wrappers');

module.exports = configure(function (/* ctx */) {
  return {
    boot: ['axios'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#css
    css: ['app.scss'],

    extras: ['material-icons', 'material-symbols-outlined'],

    build: {
      target: {
        browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'],
        node: 'node20',
      },
      vueRouterMode: 'history',
    },

    devServer: {
      open: true,
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-js#framework
    framework: {
      config: {
        dark: 'auto',
        notify: { position: 'top-right', timeout: 2500 },
      },
      iconSet: 'material-symbols-outlined',
      plugins: ['Dark', 'Notify', 'Dialog', 'LocalStorage'],
    },

    animations: [],
  };
});
