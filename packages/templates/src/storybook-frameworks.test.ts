import { PRESETS } from "@tesserai/core";
import { describe, expect, it } from "vitest";
import { renderAll } from "./render";
import { storybookFilesFor } from "./storybook-frameworks";

// The Vue and Svelte Storybooks (checked by hand with real Storybook builds, svelte-check and the
// stories working in a browser): the files they're made of, and the shapes their types need.
const system = PRESETS[0]!.build();
const options = { storiesDir: "src/stories/tesserai", stylesheet: "../src/style.css" };

describe("a Vue project's Storybook", async () => {
  const { files, covered, uncovered } = storybookFilesFor(system, await renderAll("reka-ui", system), { ...options, framework: "vue3-vite" });
  const at = (path: string) => files.find((f) => f.path === path)?.source ?? "";
  it("uses Vue's Storybook, with a story per component the Vue templates cover", () => {
    expect(at(".storybook/main.ts")).toContain('framework: "@storybook/vue3-vite"');
    expect(at(".storybook/preview.ts")).toContain("beforeEach");
    expect(covered).toContain("button");
    // Every component the system has is in Vue now, the chart and the chat components too.
    expect(covered).toEqual(expect.arrayContaining(["chart", "message-scroller", "questionnaire"]));
    expect(uncovered).toEqual([]);
  });
  it("renders examples printed in Vue, and gives Button live controls", () => {
    expect(files.map((f) => f.path)).toContain("src/stories/tesserai/examples/button.vue");
    const stories = at("src/stories/tesserai/button.stories.ts");
    expect(stories).toContain('import { Button } from "@/components/ui/button";');
    expect(stories).toContain('template: "<Button v-bind=\\"args\\">Button</Button>"');
    expect(stories).toContain("export const AllVariants: Story");
  });
});

describe("a Svelte project's Storybook", async () => {
  const { files } = storybookFilesFor(system, await renderAll("bits-ui", system), { ...options, framework: "sveltekit" });
  const at = (path: string) => files.find((f) => f.path === path)?.source ?? "";
  it("types each story by the component it renders, so svelte-check passes", () => {
    const stories = at("src/stories/tesserai/button.stories.ts");
    expect(stories).toContain('import type { Meta, StoryObj } from "@storybook/sveltekit";');
    expect(stories).toContain("export const Playground: StoryObj<typeof ButtonPlayground>");
    expect(stories).toContain("export const Example: StoryObj<typeof Frame>");
    expect(stories).not.toContain("type Story =");
  });
  it("has a playground that takes the label, importing through the placeholders", () => {
    const playground = at("src/stories/tesserai/examples/button-playground.svelte");
    expect(playground).toContain('from "$UI$/button/index.js"');
    expect(playground).toContain("{label}");
    expect(files.map((f) => f.path)).toContain("src/stories/tesserai/examples/frame.svelte");
  });
});
