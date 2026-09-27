import { describe, expect, it } from "vitest";
import { prefixFiles, prefixSource, prefixSvelteSource, prefixVue } from "./prefix";

describe("a Tailwind class prefix on generated code", () => {
  it("prefixes every class where code gives classes, and nothing else", async () => {
    const source = `import { cva } from "class-variance-authority";
const SUB = "flex h-7 -translate-x-px data-[size=sm]:text-xs";
const SIZES = { sm: "h-8 px-3", lg: "h-10 px-5" };
const buttonVariants = cva("inline-flex items-center", {
  variants: { variant: { solid: "bg-primary hover:bg-primary-hover", ghost: "" }, size: { sm: "h-8" } },
  compoundVariants: [{ variant: "solid", size: "sm", class: "px-2" }],
  defaultVariants: { variant: "solid", size: "sm" },
});
export function Thing({ className, active, n }: { className?: string; active: boolean; n: number }) {
  return (
    <div data-slot="thing" role="group" aria-label="flex grid" className={cn("group relative", active && "bg-subtle", SIZES.sm, className)}>
      <span className={\`size-\${n} gap-1 \${active ? "font-medium" : ""}\`} />
      <i className={SUB} />
      <Toaster toastOptions={{ classNames: { toast: "bg-(--surface-raised)! shadow-lg!" } }} />
      <b className={clsx({ "text-strong": active })} />
    </div>
  );
}`;
    const out = await prefixSource(source, "acme");
    expect(out).toContain('const SUB = "acme:flex acme:h-7 acme:-translate-x-px acme:data-[size=sm]:text-xs"');
    expect(out).toContain('{ sm: "acme:h-8 acme:px-3", lg: "acme:h-10 acme:px-5" }');
    expect(out).toContain('cva("acme:inline-flex acme:items-center"');
    expect(out).toContain('solid: "acme:bg-primary acme:hover:bg-primary-hover", ghost: ""');
    expect(out).toContain('class: "acme:px-2"');
    // Variant names and other strings are left alone.
    expect(out).toContain('defaultVariants: { variant: "solid", size: "sm" }');
    expect(out).toContain('compoundVariants: [{ variant: "solid", size: "sm"');
    expect(out).toContain('data-slot="thing" role="group" aria-label="flex grid"');
    expect(out).toContain('cn("acme:group acme:relative", active && "acme:bg-subtle", SIZES.sm, className)');
    // Template literals: a class running into ${…} is one; the value inside a class isn't.
    expect(out).toContain('`acme:size-${n} acme:gap-1 ${active ? "acme:font-medium" : ""}`');
    expect(out).toContain('toast: "acme:bg-(--surface-raised)! acme:shadow-lg!"');
    expect(out).toContain('clsx({ "acme:text-strong": active })');
    // Again changes nothing: each class is prefixed once.
    expect(await prefixSource(out, "acme")).toBe(out);
  });

  it("prefixes a Vue component: its scripts, static classes and class bindings, and nothing else", async () => {
    const source = `<script lang="ts">
const Wrapped = defineComponent({ setup: () => () => h("svg", { class: ["dark:hidden", "size-4"] }) });
</script>

<script setup lang="ts">
import { cn } from "@/lib/utils";
import { badgeVariants } from ".";
const props = defineProps<{ class?: string; active?: boolean }>();
const extra = cn("ring-2", props.active && "bg-subtle");
</script>

<template>
  <div data-slot="thing" aria-label="flex grid" class="relative w-fit" :data-state="active ? 'on' : 'off'">
    <span
      :class="
        cn(
          'inline-flex h-(--x) data-[state=on]:bg-primary content-[\\u0022a\\u0022]',
          active && 'font-medium',
          props.class,
        )
      "
    >flex grid</span>
    <i :class="badgeVariants({ variant: 'soft' })" />
    <b v-bind:class="{ 'text-strong': active, 'italic': !active }" />
    <u :class="['underline', active ? 'decoration-2' : '']" />
  </div>
</template>
`;
    const out = await prefixVue(source, "acme");
    expect(out).toContain('h("svg", { class: ["acme:dark:hidden", "acme:size-4"] })');
    expect(out).toContain('cn("acme:ring-2", props.active && "acme:bg-subtle")');
    expect(out).toContain('class="acme:relative acme:w-fit"');
    expect(out).toContain("'acme:inline-flex acme:h-(--x) acme:data-[state=on]:bg-primary acme:content-[\\u0022a\\u0022]'");
    expect(out).toContain("active && 'acme:font-medium'");
    expect(out).toContain(`:class="{ 'acme:text-strong': active, 'acme:italic': !active }"`.replace(":class", "v-bind:class"));
    expect(out).toContain(`:class="['acme:underline', active ? 'acme:decoration-2' : '']"`);
    // Names, variants, data-slots, state values and text are left alone.
    expect(out).toContain(`:class="badgeVariants({ variant: 'soft' })"`);
    expect(out).toContain('data-slot="thing" aria-label="flex grid"');
    expect(out).toContain(`:data-state="active ? 'on' : 'off'"`);
    expect(out).toContain(">flex grid</span>");
    expect(await prefixVue(out, "acme")).toBe(out);
  });

  it("prefixes .vue files among generated files, and leaves the rest as they are", async () => {
    const files = await prefixFiles(
      [
        { path: "components/ui/kbd/Kbd.vue", source: `<template>\n  <kbd class="px-1" />\n</template>\n` },
        { path: "components/ui/kbd/index.ts", source: `export const kbdVariants = cva("inline-flex");\n` },
        { path: "README.md", source: `class="px-1"` },
      ],
      "acme",
    );
    expect(files.map((f) => f.source)).toEqual([`<template>\n  <kbd class="acme:px-1" />\n</template>\n`, `export const kbdVariants = cva("acme:inline-flex");\n`, `class="px-1"`]);
  });

  it("prefixes a Svelte file's classes, in its scripts and its markup, and nothing else", async () => {
    const source = `<script lang="ts" module>
  import { cva } from "class-variance-authority";
  export const thingVariants = cva("inline-flex items-center", {
    variants: { size: { sm: "h-8 px-3", lg: "h-10" } },
    defaultVariants: { size: "sm" },
  });
</script>

<script lang="ts">
  import { cn } from "$UTILS$.js";
  import XIcon from "@lucide/svelte/icons/x";

  const classes = "flex gap-2 data-[state=open]:bg-subtle";
  const closeClasses = "absolute top-4";
  const labelClasses = "sr-only";
  const title = "flex grid";
  let { class: className, size = "sm", open = false, n = 1, children } = $props();
</script>

<!-- class="not-a-class" -->
<div data-slot="thing" aria-label="flex grid" title={title} class={cn(classes, thingVariants({ size }), className)}>
  {#if open}
    <button type="button" class={closeClasses} onclick={() => (open = !open)}>
      <XIcon class="size-4 shrink-0" aria-hidden="true" />
      <span class={labelClasses}>Close</span>
    </button>
  {/if}
  <Dialog.Content class="sm:max-w-md" data-size="lg">{@render children?.()}</Dialog.Content>
  <i class="size-{n} gap-1 {open ? 'font-medium' : ''} rounded-{n}"></i>
  <b class={["border", open && "bg-muted", { "text-strong": open }]}>{"flex"}</b>
</div>

<style>
  .x { color: red; }
</style>
`;
    const out = await prefixSvelteSource(source, "acme");
    expect(out).toContain('cva("acme:inline-flex acme:items-center"');
    expect(out).toContain('size: { sm: "acme:h-8 acme:px-3", lg: "acme:h-10" }');
    expect(out).toContain('defaultVariants: { size: "sm" }');
    // Constants the markup uses as classes.
    expect(out).toContain('const classes = "acme:flex acme:gap-2 acme:data-[state=open]:bg-subtle";');
    expect(out).toContain('const closeClasses = "acme:absolute acme:top-4";');
    expect(out).toContain('const labelClasses = "acme:sr-only";');
    // Strings that aren't classes are left alone.
    expect(out).toContain('const title = "flex grid";');
    expect(out).toContain('let { class: className, size = "sm"');
    expect(out).toContain('import XIcon from "@lucide/svelte/icons/x";');
    expect(out).toContain('<!-- class="not-a-class" -->');
    expect(out).toContain('<div data-slot="thing" aria-label="flex grid" title={title} class={cn(classes, thingVariants({ size }), className)}>');
    expect(out).toContain('data-size="lg"');
    expect(out).toContain('{"flex"}');
    expect(out).toContain(".x { color: red; }");
    // Class literals in markup, a component's class prop, and class expressions.
    expect(out).toContain('<XIcon class="acme:size-4 acme:shrink-0" aria-hidden="true" />');
    expect(out).toContain('<Dialog.Content class="acme:sm:max-w-md"');
    expect(out).toContain(`<i class="acme:size-{n} acme:gap-1 {open ? 'font-medium' : ''} acme:rounded-{n}"></i>`);
    expect(out).toContain('<b class={["acme:border", open && "acme:bg-muted", { "acme:text-strong": open }]}>');
    // Only class text changes: the file is otherwise byte for byte the same.
    expect(out.replaceAll("acme:", "")).toBe(source);
    expect(await prefixSvelteSource(out, "acme")).toBe(out);
  });

  it("prefixes .svelte files in a set, and leaves TSX output as it was", async () => {
    const tsx = `export const A = () => <div className="flex" data-slot="a" />;\n`;
    const [react, svelte, css] = await prefixFiles(
      [
        { path: "components/ui/a.tsx", source: tsx },
        { path: "components/ui/a/a.svelte", source: `<div class="flex" data-slot="a"></div>\n` },
        { path: "styles.css", source: ".flex {}" },
      ],
      "acme",
    );
    expect(react!.source).toBe(`export const A = () => <div className="acme:flex" data-slot="a" />;\n`);
    expect(svelte!.source).toBe(`<div class="acme:flex" data-slot="a"></div>\n`);
    expect(css!.source).toBe(".flex {}");
  });

  it("tells tailwind-merge the prefix, so cn() still merges acme:p-2 and acme:p-4", async () => {
    const out = await prefixSource(`const twMerge = extendTailwindMerge({ extend: { theme: { text: ["1", "2"] } } });`, "acme");
    expect(out).toBe(`const twMerge = extendTailwindMerge({ prefix: "acme", extend: { theme: { text: ["1", "2"] } } });`);
  });
});
