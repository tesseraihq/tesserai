/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App
 */

import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'

import 'unfonts.css'

createApp(App).use(vuetify).use(router).mount('#app')
