<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Wraps <Button> so every page gets the same pill shape.
const props = defineProps<{ class?: HTMLAttributes["class"]; loading?: boolean }>();
</script>

<template>
  <Button size="lg" :class="cn('rounded-full', props.class)" :disabled="props.loading">
    <slot />
  </Button>
</template>
