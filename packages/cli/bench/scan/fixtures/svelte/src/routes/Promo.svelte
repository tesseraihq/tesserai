<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  let open = $state(false);
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-sm rounded-none">
    <Button variant="ghost" onclick={() => (open = false)}>Close</Button>
  </Dialog.Content>
</Dialog.Root>
<Button class="text-lg font-black">Buy</Button>
