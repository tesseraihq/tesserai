<script lang="ts" generics="T extends { id: string; name: string; role: string }">
  import type { Snippet } from "svelte";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";

  let { items, actions }: { items: T[]; actions?: Snippet<[T]> } = $props();
  const roleIntent = (role: string) => (role === "owner" ? "primary" : "neutral");
</script>

<ul class="divide-y">
  {#each items as member (member.id)}
    <li class="flex items-center gap-3 py-3">
      <Avatar.Root size="sm" class="size-7">
        <Avatar.Fallback>{member.name.slice(0, 1)}</Avatar.Fallback>
      </Avatar.Root>
      <span class="flex-1 truncate">{member.name}</span>
      <Badge intent={roleIntent(member.role)} variant="outline" class="uppercase tracking-wider text-[10px]">{member.role}</Badge>
      {@render actions?.(member)}
    </li>
  {:else}
    <li class="py-6 text-center text-sm text-muted-foreground">No members yet.</li>
  {/each}
</ul>
