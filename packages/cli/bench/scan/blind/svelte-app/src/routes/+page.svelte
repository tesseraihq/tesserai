<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import SubmitButton from "$lib/components/SubmitButton.svelte";

  type Plan = { id: string; name: string; price: number; popular?: boolean; perks: string[] };
  type Variant = "solid" | "soft" | "outline" | "ghost" | "link";

  let { data }: { data: { plans: Plan[]; current: string } } = $props();
  let selected = $state<string | null>(null);
  let billing = $state<"monthly" | "yearly">("monthly");
  const variant: Variant = "outline";
  const discount = (p: Plan) => (billing === "yearly" ? Math.round(p.price * 0.8) : p.price);
  const cheapest = $derived(data.plans.reduce((a, b) => (a.price < b.price ? a : b)));
  const snippet = '<Button variant="link">Compare plans</Button>';
</script>

<section class="space-y-8">
  <div class="flex items-center gap-2">
    <Button variant={billing === "monthly" ? "solid" : "ghost"} onclick={() => (billing = "monthly")}>Monthly</Button>
    <Button variant={"ghost"} class={billing === "yearly" ? "bg-accent text-accent-foreground font-semibold" : "font-semibold"} onclick={() => (billing = "yearly")}>
      Yearly
    </Button>
  </div>

  <!-- <Card.Root class="rounded-none">Legacy pricing</Card.Root> -->
  <div class="grid gap-6 md:grid-cols-3">
    {#each data.plans as plan, i (plan.id)}
      <Card.Root
        size={plan.popular ? "md" : "sm"}
        class={["transition-transform", plan.popular && "scale-105 border-primary", selected === plan.id && "ring-2"]}
        onclick={() => (selected = plan.id)}
      >
        <Card.Header class="pb-2">
          <Card.Title class="text-lg">
            {plan.name}
            {#if plan.popular}<Badge intent="primary" size="sm">Popular</Badge>{/if}
          </Card.Title>
          <Card.Description>${discount(plan)}/mo{#if i < 1} · cheapest{/if}</Card.Description>
        </Card.Header>
        <Card.Content>
          <ul class="space-y-1 text-sm">
            {#each plan.perks as perk}
              <li>{perk}</li>
            {/each}
          </ul>
        </Card.Content>
        <Card.Footer>
          {#if data.current === plan.id}
            <Button {variant} disabled class="w-full">Current plan</Button>
          {:else if plan.price < cheapest.price * 2}
            <Button intent="neutral" class="w-full border-dashed font-semibold">Choose {plan.name}</Button>
          {:else}
            <Button class="w-full" style="border-radius: 9999px">Choose {plan.name}</Button>
          {/if}
        </Card.Footer>
      </Card.Root>
    {/each}
  </div>

  <p class="text-muted-foreground text-sm">Need something else? {"<Button>"} us.</p>

  <form method="POST" action="?/trial" class="flex gap-2">
    <SubmitButton class="w-40">Start trial</SubmitButton>
  </form>
</section>
