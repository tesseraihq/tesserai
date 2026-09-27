<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button as UiButton } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AlertVariants } from "@/components/ui/alert";

const form = reactive({ name: "", email: "", website: "" });
const saving = ref(false);
const variant = ref<"line" | "segmented">("line");
const status = ref<{ kind: "ok" | "error"; message: string; tone?: AlertVariants["intent"] } | null>(null);
const accent = "#7c3aed";
const buttonAttrs = { type: "submit", form: "profile" } as const;
const fieldClass = computed(() => (status.value?.kind === "error" ? "border-destructive" : ""));

async function save(): Promise<void> {
  saving.value = true;
  await new Promise<void>((r) => setTimeout(r, 300));
  saving.value = false;
  status.value = { kind: "ok", message: "Saved" };
}
</script>

<template>
  <Tabs default-value="profile" :variant class="w-full max-w-2xl">
    <TabsList :class="[variant === 'line' && 'bg-transparent', 'w-full']">
      <TabsTrigger value="profile">Profile</TabsTrigger>
      <TabsTrigger value="danger" class="data-[state=active]:text-destructive">Danger zone</TabsTrigger>
    </TabsList>
    <TabsContent value="profile" class="space-y-4 pt-4">
      <Alert v-if="status" :intent="status.kind === 'ok' ? 'success' : 'danger'" v-bind:variant="'soft'">
        <AlertTitle>{{ status.message }}</AlertTitle>
      </Alert>
      <form id="profile" class="space-y-3" @submit.prevent="save">
        <Input v-model="form.name" placeholder="Name" />
        <Input v-model="form.email" type="email" :class="fieldClass" size="lg" />
        <Input
          v-model="form.website"
          :size="'sm'"
          :style="{ borderColor: accent, width: '100%' }"
        />
        <UiButton v-bind="buttonAttrs" :disabled="saving" class="min-w-[120px] h-[38px]">
          {{ saving ? "Saving…" : "Save" }}
        </UiButton>
      </form>
    </TabsContent>
    <TabsContent value="danger">
      <Alert intent="danger" class="rounded-[6px] border-2 p-[13px]">
        <AlertTitle class="!font-bold">Delete workspace</AlertTitle>
        <AlertDescription>This removes every project and invoice.</AlertDescription>
      </Alert>
      <Dialog>
        <DialogTrigger as-child>
          <UiButton intent="danger" variant="outline" class="mt-4">Delete…</UiButton>
        </DialogTrigger>
        <DialogContent class="sm:max-w-[425px]" style="padding: 32px">
          <DialogHeader>
            <DialogTitle class="text-destructive">Are you sure?</DialogTitle>
          </DialogHeader>
          <DialogFooter class="gap-2 sm:gap-0">
            <UiButton variant="ghost">Cancel</UiButton>
            <UiButton intent="danger" class="bg-red-700 hover:bg-red-800">Delete</UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  </Tabs>
</template>
