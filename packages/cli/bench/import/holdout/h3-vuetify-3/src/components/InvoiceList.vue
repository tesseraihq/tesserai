<template>
  <div>
    <h1 class="text-h4 mb-1">Invoices</h1>
    <p class="text-medium-emphasis mb-6">{{ open.length }} open · {{ overdue.length }} overdue</p>

    <v-row>
      <v-col v-for="inv in invoices" :key="inv.id" cols="12" md="6" lg="4">
        <InvoiceCard :invoice="inv" />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import InvoiceCard, { type Invoice } from './InvoiceCard.vue'

const invoices: Invoice[] = [
  { id: 'INV-1042', customer: 'Northwind Traders', amount: 1840, status: 'paid' },
  { id: 'INV-1043', customer: 'Contoso Ltd', amount: 920.5, status: 'open' },
  { id: 'INV-1039', customer: 'Fabrikam', amount: 4310, status: 'overdue' },
]

const open = computed(() => invoices.filter((i) => i.status === 'open'))
const overdue = computed(() => invoices.filter((i) => i.status === 'overdue'))
</script>
