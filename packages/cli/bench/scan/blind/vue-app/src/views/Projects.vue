<script setup lang="ts">
import { computed, ref } from "vue";
import Card from "@/components/ui/card/Card.vue";
import CardHeader from "@/components/ui/card/CardHeader.vue";
import CardTitle from "@/components/ui/card/CardTitle.vue";
import CardContent from "@/components/ui/card/CardContent.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ButtonGroup from "@/components/ButtonGroup.vue";
import AppButton from "@/components/AppButton.vue";

type Project = { id: string; name: string; status: "active" | "paused" | "archived"; tags: string[]; seats: number };

const MAX_SEATS = 10;
const query = ref("");
const view = ref<"grid" | "list">("grid");
const projects = ref<Project[]>([]);
const compact = ref(false);
const tone = (p: Project) => (p.status === "active" ? "success" : p.status === "paused" ? "warning" : "neutral");
const shown = computed<Array<Project>>(() => projects.value.filter((p) => p.name.includes(query.value)));
const hint = "Use <Badge> for status, never <Button>.";
</script>

<template>
  <section class="space-y-6">
    <!-- <Button variant="link" class="rounded-none">Import</Button> -->
    <div class="flex items-center gap-3">
      <Input v-model="query" placeholder="Filter projects" class="max-w-xs" />
      <ButtonGroup>
        <Button
          :variant="view === 'grid' ? 'soft' : 'ghost'"
          size="sm"
          @click="view = 'grid'"
        >
          Grid
        </Button>
        <Button v-bind:variant="'ghost'" size="sm" :class="{ 'bg-accent': view === 'list' }" @click="view = 'list'">List</Button>
      </ButtonGroup>
      <AppButton class="ml-auto" :loading="false">New</AppButton>
    </div>
    <p class="text-sm text-muted-foreground">{{ shown.length }} of {{ projects.length }} · {{ hint }}</p>
    <div :class="view === 'grid' ? 'grid gap-4 md:grid-cols-2' : 'space-y-2'">
      <Card
        v-for="p in shown"
        :key="p.id"
        :size="compact ? 'sm' : 'md'"
        :class="[
          'transition-shadow hover:shadow-md',
          { 'opacity-60': p.status === 'archived' },
        ]"
      >
        <CardHeader class="gap-2 pb-2">
          <CardTitle class="text-base">{{ p.name }}</CardTitle>
          <Badge :variant="p.status === 'archived' ? 'outline' : 'soft'" :intent="tone(p)" size="sm">
            {{ p.status }}
          </Badge>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex flex-wrap gap-1">
            <Badge v-for="tag in p.tags" :key="tag" variant="outline" class="font-normal">#{{ tag }}</Badge>
          </div>
          <p class="text-xs">{{ p.seats<MAX_SEATS ? `${MAX_SEATS - p.seats} seats left` : "Full" }}</p>
          <Button v-if="p.status === 'paused'" variant="outline" intent="warning" size="sm" class="w-full">Resume</Button>
          <Button v-else-if="p.status === 'archived'" variant="link" :class="$style.restore">Restore</Button>
          <Button v-else variant="soft" size="sm" style="border-radius: 0; margin-left: auto">Open</Button>
        </CardContent>
      </Card>
    </div>
  </section>
</template>

<style module>
.restore {
  color: var(--primary);
  text-decoration: underline;
}
</style>
