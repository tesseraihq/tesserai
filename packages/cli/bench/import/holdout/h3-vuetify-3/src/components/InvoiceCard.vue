<template>
  <v-card border flat>
    <v-card-item>
      <v-card-title>{{ invoice.customer }}</v-card-title>
      <v-card-subtitle>{{ invoice.id }}</v-card-subtitle>
      <template #append>
        <v-chip :color="statusColor" size="small" label>{{ invoice.status }}</v-chip>
      </template>
    </v-card-item>
    <v-divider />
    <v-card-text class="d-flex justify-space-between align-center">
      <span class="text-h6">{{ amount }}</span>
      <span class="text-body-2 text-medium-emphasis">Net 30</span>
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" variant="flat">Send reminder</v-btn>
      <v-btn variant="text">View</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type Invoice = { id: string; customer: string; amount: number; status: 'paid' | 'open' | 'overdue' }

const props = defineProps<{ invoice: Invoice }>()

const statusColor = computed(() =>
  props.invoice.status === 'paid' ? 'success' : props.invoice.status === 'overdue' ? 'error' : 'warning',
)

const amount = computed(() =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(props.invoice.amount),
)
</script>
