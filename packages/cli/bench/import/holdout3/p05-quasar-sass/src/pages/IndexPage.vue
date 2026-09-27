<template>
  <q-page padding>
    <h1 class="text-h5 page-title q-mt-none">Today's deliveries</h1>
    <div class="row q-col-gutter-md">
      <div v-for="d in deliveries" :key="d.id" class="col-12 col-md-4">
        <DeliveryCard :delivery="d" @deliver="markDelivered" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import DeliveryCard from 'components/DeliveryCard.vue'
import { useDeliveries } from 'stores/deliveries'

const store = useDeliveries()
const { deliveries } = storeToRefs(store)
const markDelivered = (id) => store.markDelivered(id)
</script>
