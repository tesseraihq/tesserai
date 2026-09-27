<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import Card from "primevue/card";
import Tag from "primevue/tag";
import InputText from "primevue/inputtext";

const query = ref("");
const vessels = [
  { name: "MV Kestrel", berth: "B4", eta: "14:20", status: "docked" },
  { name: "Sea Lantern", berth: "C1", eta: "16:05", status: "inbound" },
  { name: "Ostrava", berth: "—", eta: "—", status: "held" },
];
const severity = { docked: "success", inbound: "info", held: "danger" } as const;

function toggleDark() {
  document.documentElement.classList.toggle("app-dark");
}
</script>

<template>
  <main class="page">
    <header class="page-head">
      <div>
        <h1>Vessels</h1>
        <p class="page-subtitle">Port of Tacoma · Terminal 7</p>
      </div>
      <div class="page-actions">
        <InputText v-model="query" placeholder="Search vessels" />
        <Button icon="pi pi-moon" severity="secondary" text @click="toggleDark" />
        <Button label="Log arrival" icon="pi pi-plus" />
      </div>
    </header>

    <section class="vessel-grid">
      <Card v-for="v in vessels" :key="v.name">
        <template #title>{{ v.name }}</template>
        <template #subtitle>Berth {{ v.berth }} · ETA {{ v.eta }}</template>
        <template #content>
          <Tag :value="v.status" :severity="severity[v.status as keyof typeof severity]" />
        </template>
        <template #footer>
          <Button label="Details" outlined size="small" />
          <Button v-if="v.status === 'held'" label="Release hold" severity="danger" size="small" />
        </template>
      </Card>
    </section>
  </main>
</template>
