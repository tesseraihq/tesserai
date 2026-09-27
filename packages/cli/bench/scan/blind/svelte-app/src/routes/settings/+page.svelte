<script lang="ts">
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Root as CardRoot, Content as CardContent } from "$lib/components/ui/card/index.js";
  import SubmitButton from "$lib/components/SubmitButton.svelte";
  import MemberList from "$lib/components/MemberList.svelte";

  let { data }: { data: { cardClass: string; members: Array<{ id: string; name: string; role: string }> } } = $props();
  let name = $state("");
  let email = $state("");
  let confirmOpen = $state(false);
  let saved = $state<boolean | null>(null);
  let tab = $state("profile");
  let fieldSize = $state<"sm" | "md">("md");
  const accent = "#dc2626";
</script>

<Tabs.Root bind:value={tab} variant="segmented" class="space-y-6">
  <Tabs.List class="w-full md:w-auto">
    <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
    <Tabs.Trigger value="team" class="data-[state=active]:bg-white! data-[state=active]:shadow-sm">Team</Tabs.Trigger>
    <Tabs.Trigger value="danger">Danger</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="profile">
    {#if saved === true}
      <Alert.Root intent="success">
        <Alert.Title>Saved</Alert.Title>
      </Alert.Root>
    {:else if saved === false}
      <Alert.Root intent="danger" variant="soft" style="border-color: {accent}; margin-bottom: 1rem">
        <Alert.Title class="font-semibold">Could not save</Alert.Title>
        <Alert.Description>Check the highlighted fields.</Alert.Description>
      </Alert.Root>
    {/if}
    <CardRoot class="mt-4 {data.cardClass}">
      <CardContent class="grid gap-4 p-6">
        <label class="grid gap-1.5 text-sm">
          Name
          <Input bind:value={name} size={fieldSize} class="h-11" />
        </label>
        <label class="grid gap-1.5 text-sm">
          Email
          <Input type="email" bind:value={email} class={{ "border-destructive": email.length > 0 && !email.includes("@"), "w-full": true }} />
        </label>
        <SubmitButton pending={false}>Save</SubmitButton>
      </CardContent>
    </CardRoot>
  </Tabs.Content>

  <Tabs.Content value="team">
    <MemberList items={data.members}>
      {#snippet actions(member)}
        <Button variant="ghost" size="xs" onclick={() => console.log(member.id)} class="h-7 px-2">Manage</Button>
      {/snippet}
    </MemberList>
  </Tabs.Content>

  <Tabs.Content value="danger">
    <Dialog.Root bind:open={confirmOpen}>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button {...props} intent="danger" variant="outline">Delete workspace</Button>
        {/snippet}
      </Dialog.Trigger>
      <Dialog.Content class="sm:max-w-md rounded-[4px]">
        <Dialog.Header>
          <Dialog.Title>Delete workspace?</Dialog.Title>
        </Dialog.Header>
        <Dialog.Footer class="gap-2">
          <Button variant="ghost" onclick={() => (confirmOpen = false)}>Cancel</Button>
          <Button intent="danger" class="h-[42px] px-[18px]" onclick={() => (confirmOpen = false)}>Delete</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </Tabs.Content>
</Tabs.Root>
