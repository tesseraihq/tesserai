import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import Fonts from 'unplugin-fonts/vite'

export default defineConfig({
  plugins: [
    Vue({ template: { transformAssetUrls } }),
    Vuetify({
      autoImport: true,
      styles: { configFile: 'src/styles/settings.scss' },
    }),
    Fonts({
      google: {
        families: [
          { name: 'Nunito Sans', styles: 'wght@400;600;700' },
          { name: 'Lexend', styles: 'wght@500;600' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
