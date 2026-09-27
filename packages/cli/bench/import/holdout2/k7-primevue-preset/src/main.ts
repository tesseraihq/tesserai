import { createApp } from "vue";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";

import "@fontsource/outfit/400.css";
import "@fontsource/outfit/600.css";
import "primeicons/primeicons.css";
import "./assets/main.css";

import App from "./App.vue";
import router from "./router";
import { LagoonPreset } from "./theme/preset";

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: LagoonPreset,
    options: {
      prefix: "p",
      darkModeSelector: ".app-dark",
      cssLayer: false,
    },
  },
});
app.use(ToastService);
app.use(router);

app.mount("#app");
