import { createRouter, createWebHistory } from 'vue-router'
import InvoiceList from './components/InvoiceList.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: InvoiceList }],
})
