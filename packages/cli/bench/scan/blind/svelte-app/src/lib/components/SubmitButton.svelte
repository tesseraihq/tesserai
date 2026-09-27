<script lang="ts">
  import { Button, type ButtonProps } from "$lib/components/ui/button/index.js";

  // Every form's submit: <Button type="submit" class="uppercase">.
  let { class: className = "", pending = false, children, ...restProps }: ButtonProps & { pending?: boolean } = $props();
</script>

<Button type="submit" disabled={pending} class="uppercase min-w-24 {className}" {...restProps}>
  {#if pending}Saving…{:else}{@render children?.()}{/if}
</Button>
