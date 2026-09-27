<template>
  <q-layout view="hHh lpR fFf">
    <q-header bordered class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawer = !drawer" />
        <q-toolbar-title>Pantry Ops</q-toolbar-title>
        <q-btn flat round :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'" @click="$q.dark.toggle()" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above bordered :width="240">
      <q-list padding>
        <q-item clickable v-ripple to="/">
          <q-item-section avatar><q-icon name="inventory_2" /></q-item-section>
          <q-item-section>Deliveries</q-item-section>
        </q-item>
        <q-separator spaced />
        <q-item clickable v-ripple to="/sites">
          <q-item-section avatar><q-icon name="storefront" /></q-item-section>
          <q-item-section>Sites</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
