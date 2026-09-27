<template>
  <q-card flat bordered class="delivery-card">
    <q-card-section>
      <div class="text-caption text-muted">{{ delivery.site }}</div>
      <div class="text-h6">{{ delivery.items }} crates</div>
      <q-badge :color="badgeColor" :label="delivery.status" />
    </q-card-section>
    <q-separator />
    <q-card-actions align="right">
      <q-btn flat color="primary" label="Details" />
      <q-btn unelevated color="primary" label="Mark delivered" @click="$emit('deliver', delivery.id)" />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ delivery: { type: Object, required: true } })
defineEmits(['deliver'])

const badgeColor = computed(() => ({
  late: 'negative',
  pending: 'warning',
  delivered: 'positive',
}[props.delivery.status] ?? 'info'))
</script>
