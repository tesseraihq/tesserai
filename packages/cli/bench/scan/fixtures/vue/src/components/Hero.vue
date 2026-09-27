<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
const loading = false;
</script>

<template>
  <section class="py-12">
    <Button variant="outline" class="rounded-full" @click="() => (loading ? null : 1)">Start</Button>
    <Button :variant="loading ? 'ghost' : 'solid'" size="lg">Go</Button>
    <Badge class="mt-1">Beta</Badge>
    <Button>Plain</Button>
  </section>
</template>
