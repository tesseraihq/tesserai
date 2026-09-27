<script setup lang="ts" generic="T extends { id: string; name: string }">
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const props = defineProps<{ items: T[]; selected?: T["id"]; max?: number }>();
const emit = defineEmits<{ (e: "pick", item: T): void }>();
const limit = props.max ?? 5;
</script>

<template>
  <ul class="space-y-1">
    <li v-for="(item, i) in items" :key="item.id">
      <Button
        v-if="i < limit"
        variant="ghost"
        :intent="item.id === selected ? 'primary' : 'neutral'"
        class="w-full"
        @click="emit('pick', item)"
      >
        {{ item.name }}
        <Badge v-if="item.id === selected" variant="solid" intent="primary" class="ml-auto">✓</Badge>
      </Button>
    </li>
  </ul>
  <p v-if="items.length > limit" class="text-xs">+{{ items.length - limit }} more</p>
</template>
