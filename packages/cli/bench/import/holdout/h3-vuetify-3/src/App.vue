<template>
  <v-app>
    <v-app-bar flat border="b" color="surface">
      <v-app-bar-title class="font-weight-bold">Harbor</v-app-bar-title>
      <template #append>
        <v-btn
          :icon="theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          variant="text"
          @click="toggle"
        />
      </template>
    </v-app-bar>
    <v-main>
      <v-container>
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'

const theme = useTheme()

function toggle() {
  theme.global.name.value = theme.global.current.value.dark ? 'harborLight' : 'harborDark'
}
</script>
