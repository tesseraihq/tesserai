<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import * as Btn from "$lib/components/ui/button/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";

  let { children } = $props();
  const nav = [
    { href: "/", label: "Overview" },
    { href: "/billing", label: "Billing" },
    { href: "/settings", label: "Settings" },
  ];
  let unread = $state(3);
</script>

<svelte:head>
  <title>Acme · Console</title>
</svelte:head>

<div class="flex min-h-screen">
  <nav class="w-56 border-r p-3">
    {#each nav as item (item.href)}
      <a href={item.href} class="block rounded px-2 py-1.5" class:bg-muted={page.url.pathname === item.href}>{item.label}</a>
    {/each}
  </nav>
  <div class="flex-1">
    <header class="flex items-center justify-end gap-2 border-b px-6 py-3">
      <Btn.Root variant="ghost" size="sm" href="/inbox" class="relative">
        Inbox
        {#if unread > 0}
          <Badge variant="solid" intent="danger" class="absolute -top-1 -right-1 h-4 min-w-4 px-1">{unread}</Badge>
        {/if}
      </Btn.Root>
      <Avatar.Root size="sm">
        <Avatar.Image src="/me.png" alt="Me" />
        <Avatar.Fallback class="text-[10px]">ME</Avatar.Fallback>
      </Avatar.Root>
    </header>
    <main class="p-6">{@render children()}</main>
  </div>
</div>
