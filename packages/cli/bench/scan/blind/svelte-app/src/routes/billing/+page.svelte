<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import * as Alert from "$lib/components/ui/alert";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import type { PageData } from "./$types";

  export let data: PageData;

  let coupon = "";
  let applying = false;
  $: overdue = data.invoices.filter((i) => i.status === "overdue");
  $: total = data.invoices.reduce((sum, i) => sum + i.amount, 0);
  const statusIntent = { paid: "success", open: "info", overdue: "danger" } as const;

  async function apply() {
    applying = true;
    await fetch("?/coupon", { method: "POST", body: JSON.stringify({ coupon }) });
    applying = false;
  }
</script>

{#if overdue.length > 0}
  <Alert.Root intent="warning" class="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950">
    <Alert.Title>{overdue.length} overdue {overdue.length === 1 ? "invoice" : "invoices"}</Alert.Title>
  </Alert.Root>
{/if}

<Card.Root class="overflow-hidden">
  <Card.Header class="border-b bg-muted/40">
    <Card.Title>Invoices</Card.Title>
  </Card.Header>
  <Card.Content class="p-0">
    <table class="w-full text-sm">
      <tbody>
        {#each data.invoices as inv (inv.id)}
          <tr class="border-b last:border-0" class:opacity-50={inv.status === "paid"}>
            <td class="px-4 py-2">{inv.number}</td>
            <td class="px-4 py-2">
              <Badge intent={statusIntent[inv.status]} variant="soft" class="font-mono">{inv.status}</Badge>
            </td>
            <td class="px-4 py-2 text-right">{(inv.amount / 100).toFixed(2)}</td>
            <td class="px-4 py-2">
              <Button variant="link" size="xs" href="/billing/{inv.id}.pdf" class="h-auto p-0">PDF</Button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Card.Content>
  <Card.Footer class="gap-3 border-t pt-4">
    <Input bind:value={coupon} placeholder="Coupon code" size="sm" class="w-40 uppercase" />
    <Button size="sm" variant="outline" on:click={apply} disabled={applying || coupon.length < 4} class="h-8 px-3 font-semibold">Apply</Button>
    <span class="ml-auto font-medium">Total {(total / 100).toFixed(2)}</span>
  </Card.Footer>
</Card.Root>

<Button variant="ghost" intent="neutral" style="width: 100%; margin-top: 1.5rem" on:click={() => history.back()}>Back</Button>
