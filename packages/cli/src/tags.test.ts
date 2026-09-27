import { describe, expect, it } from "vitest";
import { readElements } from "./tags";

const names = (els: { name: string }[]) => els.map((e) => e.name);

describe("reading elements", () => {
  it("doesn't end a tag at the > of an arrow, and keeps the props after it", () => {
    const [button] = readElements(`const a = <Button onClick={() => go(">")} variant="outline" size={"sm"}>Go</Button>;`, "code");
    expect(button!.attrs.map((a) => [a.name, a.value, a.quoted])).toEqual([
      ["onClick", `() => go(">")`, false],
      ["variant", "outline", true],
      ["size", `"sm"`, false],
    ]);
  });

  it("finds no elements in comments, strings, template literals or generics", () => {
    const source = [
      `// <Button variant="link">`,
      `/** <Button> in a JSDoc */`,
      "const doc = `Use <Button variant=\"link\"> inline ${x < y ? 1 : 2}`;",
      `const s = "<Button>";`,
      `const [items] = useState<Item[]>([]);`,
      `const list: Array<Foo> = [];`,
      `if (a < B) {}`,
      `const el = <Card />;`,
    ].join("\n");
    expect(names(readElements(source, "code"))).toEqual(["Card"]);
  });

  it("reads children as text, so an apostrophe doesn't open a string", () => {
    const els = readElements(`const x = (<p>Don't <Badge>new</Badge> {items.map((i) => <Button key={i}>{i}</Button>)}</p>);`, "code");
    expect(names(els)).toEqual(["p", "Badge", "Button"]);
  });

  it("gives each element the line its tag starts on", () => {
    const els = readElements(["return (", "  <>", "    <Button", "      variant=\"ghost\"", "    >", "      Hi", "    </Button>", "  </>", ");"].join("\n"), "code");
    expect(els.map((e) => [e.name, e.line])).toEqual([["Button", 3]]);
  });

  it("reads a Vue template: bound props, events with arrows, mustaches", () => {
    const vue = [`<script setup>import { Button } from "@/components/ui/button"; const a = 1 < 2;</script>`, `<template>`, `  <Button :variant="x ? 'a' : 'b'" @click="() => (y = 1)" class="p-2">{{ a > 0 ? "<Badge>" : "" }}</Button>`, `</template>`].join("\n");
    const els = readElements(vue, "markup");
    expect(names(els)).toEqual(["script", "template", "Button"]);
    expect(els[2]!.attrs.map((a) => a.name)).toEqual([":variant", "@click", "class"]);
  });

  it("reads a Svelte file: blocks, directives, namespaces", () => {
    const svelte = [`<script>let open = $state(false);</script>`, `{#each items as item (item.id)}`, `  <Dialog.Root bind:open><Button onclick={() => (open = !open)} class:active={open}>{item}</Button></Dialog.Root>`, `{/each}`].join("\n");
    const els = readElements(svelte, "markup");
    expect(names(els)).toEqual(["script", "Dialog.Root", "Button"]);
    expect(els[2]!.attrs.map((a) => a.name)).toEqual(["onclick", "class:active"]);
  });
});
