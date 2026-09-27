import { createRouter, createWebHistory } from "vue-router";
import VesselList from "./components/VesselList.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [{ path: "/", component: VesselList }],
});
