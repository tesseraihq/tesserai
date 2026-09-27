<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, RouterView } from "vue-router";
import NavButton from "@/components/ui/button/Button.vue";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AppButton from "@/components/AppButton.vue";

const collapsed = ref(false);
const user = ref<{ name: string; avatar?: string } | null>(null);
const links: Array<{ to: string; label: string }> = [
  { to: "/", label: "Projects" },
  { to: "/billing", label: "Billing" },
  { to: "/settings", label: "Settings" },
];
</script>

<template>
  <div class="flex min-h-screen">
    <aside :class="['border-r p-4', collapsed ? 'w-16' : 'w-60']">
      <nav class="flex flex-col gap-1">
        <NavButton
          v-for="link in links"
          :key="link.to"
          as-child
          variant="ghost"
          class="h-8 px-2 text-left"
        >
          <RouterLink :to="link.to">{{ link.label }}</RouterLink>
        </NavButton>
        <NavButton variant="ghost" size="sm" :aria-expanded="!collapsed" @click="collapsed = !collapsed">
          {{ collapsed ? "»" : "« Collapse" }}
        </NavButton>
      </nav>
    </aside>
    <main class="flex-1 p-8">
      <header class="mb-6 flex items-center justify-end gap-3">
        <AppButton class="mr-2">New project</AppButton>
        <Avatar v-if="user" size="sm" class="ring-2">
          <AvatarImage :src="user.avatar ?? ''" :alt="user.name" />
          <AvatarFallback :style="{ fontSize: '11px' }">{{ user.name.slice(0, 2) }}</AvatarFallback>
        </Avatar>
        <Avatar v-else :size="'sm'">
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
      </header>
      <RouterView />
      <footer class="mt-12 text-xs text-muted-foreground">Built with {{ "<Button>" }} and friends.</footer>
    </main>
  </div>
</template>
