<script setup lang="ts">
import { computed, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle } from "@/components/ui/alert";

type Invoice = { id: string; total: number; status: "paid" | "due" | "failed" };

const invoices = ref<Invoice[]>([]);
const failed = computed(() => invoices.value.filter((i) => i.status === "failed"));
const intentFor: Record<Invoice["status"], "success" | "warning" | "danger"> = { paid: "success", due: "warning", failed: "danger" };
const upgrading = ref(false);
</script>

<template>
  <div class="space-y-6">
    <Alert v-if="failed.length > 0" intent="danger" variant="soft">
      <AlertTitle>{{ failed.length }} payment{{ failed.length > 1 ? "s" : "" }} failed</AlertTitle>
      <Button intent="danger" size="sm" class="tracking-wide hover:bg-red-800">Retry all</Button>
    </Alert>
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <table class="w-full text-sm">
          <tr v-for="inv in invoices" :key="inv.id" class="border-b last:border-0">
            <td class="p-3">{{ inv.id }}</td>
            <td class="p-3">
              <Badge :intent="intentFor[inv.status]" variant="soft">{{ inv.status }}</Badge>
            </td>
            <td class="p-3 text-right">
              <Button variant="ghost" size="xs" :class="['tracking-wide', inv.status === 'failed' ? 'text-destructive' : '']">
                Download
              </Button>
            </td>
          </tr>
        </table>
      </CardContent>
      <CardFooter class="border-t pt-4">
        <Button
          :variant="upgrading ? 'solid' : 'outline'"
          :class="{ 'tracking-wide': true, 'bg-red-800': upgrading }"
          @click="() => { upgrading = !upgrading }"
        >
          {{ upgrading ? "Confirm upgrade" : "Upgrade plan" }}
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
