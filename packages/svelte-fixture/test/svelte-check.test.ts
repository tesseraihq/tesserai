import type { DesignSystem } from "@tesserai/core";
import { prefixFiles, renderAll, type GeneratedFile } from "@tesserai/templates";
import { describe, expect, it } from "vitest";
import { svelteCheck } from "../harness";
import { domCases } from "./cases";
import { customSystem, DEFAULT_SYSTEM } from "./systems";

// Uses every generated component the way docs and apps do (shadcn-svelte's import styles, the
// design API and the shadcn names, bindings, snippets, class values), so their exports and prop
// types are checked as well as their own code.
const USAGE = {
  path: "usage.svelte",
  source: `<script lang="ts">
  import { Button, buttonVariants, type ButtonProps } from "$UI$/button/index.js";
  import * as ButtonParts from "$UI$/button/index.js";
  import * as Dialog from "$UI$/dialog/index.js";
  import { DialogContent, DialogTitle } from "$UI$/dialog/index.js";

  let open = $state(false);
  let button: HTMLElement | null = $state(null);
  const props: ButtonProps = { variant: "outline", intent: "danger", size: "icon-sm" };
  const linkClasses = $derived(buttonVariants({ variant: "link", class: ["px-0", { underline: open }] }));
</script>

<Button>Save</Button>
<Button variant="destructive" size="lg" onclick={() => (open = true)}>Delete</Button>
<Button variant="soft" intent="neutral" size="default" class="w-full" bind:ref={button}>Soft</Button>
<Button href="/docs" variant="ghost" disabled>Docs</Button>
<Button {...props}>X</Button>
<ButtonParts.Root size="icon">+</ButtonParts.Root>
<a href="/" class={linkClasses}>Home</a>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="outline">Open</Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-md" showCloseButton={false} portalProps={{ disabled: true }}>
    <Dialog.Header>
      <Dialog.Title>Edit profile</Dialog.Title>
      <Dialog.Description>Changes are saved when you're done.</Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer showCloseButton>
      <Dialog.Close class={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Dialog>
  <DialogContent><DialogTitle>Also by the full names</DialogTitle></DialogContent>
</Dialog.Dialog>
`,
};

// The calendars and date pickers bound to @internationalized/date values, with the dropdown caption,
// a day snippet-free range, and the date pickers' two-way value.
const CALENDAR_USAGE = {
  path: "usage-calendar.svelte",
  source: `<script lang="ts">
  import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
  import type { DateRange } from "bits-ui";
  import { Calendar, RangeCalendar } from "$UI$/calendar/index.js";
  import * as CalendarParts from "$UI$/calendar/index.js";
  import { DatePicker, DateRangePicker } from "$UI$/date-picker/index.js";

  let day = $state<DateValue | undefined>(today(getLocalTimeZone()));
  let days = $state<DateValue[] | undefined>([]);
  let span = $state<DateRange | undefined>({ start: today(getLocalTimeZone()), end: today(getLocalTimeZone()).add({ days: 6 }) });
  let picked = $state<DateValue | undefined>();
</script>

<Calendar type="single" bind:value={day} captionLayout="dropdown" numberOfMonths={2} class="rounded-lg border" />
<Calendar type="multiple" bind:value={days} buttonVariant="outline" />
<CalendarParts.Range bind:value={span} captionLayout="dropdown-months" />
<RangeCalendar value={span} years={[2025, 2026]} />
<DatePicker bind:value={picked} placeholder="When?" class="w-60" />
<DateRangePicker bind:value={span} />
`,
};

// Menus, overlays, pickers and toasts, used the way apps and the shadcn-svelte docs use them:
// bindings, snippets (a child snippet for a trigger), and what the parity cases can't render on the
// server (a drawer, a combobox's list and chips, toasts and Sonner).
const MENUS_AND_OVERLAYS = {
  path: "usage-menus-and-overlays.svelte",
  source: `<script lang="ts">
  import { toast as sonner } from "svelte-sonner";
  import { Button } from "$UI$/button/index.js";
  import * as Combobox from "$UI$/combobox/index.js";
  import * as Command from "$UI$/command/index.js";
  import * as ContextMenu from "$UI$/context-menu/index.js";
  import * as Drawer from "$UI$/drawer/index.js";
  import * as HoverCard from "$UI$/hover-card/index.js";
  import * as Menubar from "$UI$/menubar/index.js";
  import * as NavigationMenu from "$UI$/navigation-menu/index.js";
  import { navigationMenuTriggerStyle } from "$UI$/navigation-menu/index.js";
  import { Toaster as Sonner } from "$UI$/sonner/index.js";
  import { Toaster, toast, toastVariants, useToastManager } from "$UI$/toast/index.js";

  let drawer = $state(false);
  let palette = $state(false);
  let framework = $state("");
  let frameworks = $state<string[]>(["Nuxt"]);
  let bookmarks = $state(true);
  let person = $state("ada");
  let menu = $state("");
  const manager = useToastManager();
  const toastClasses = toastVariants({ intent: "danger" });
</script>

<Combobox.Root type="single" bind:value={framework}>
  <Combobox.Input placeholder="Select a framework" aria-label="Framework" showClear />
  <Combobox.Content>
    <Combobox.Empty>No match.</Combobox.Empty>
    <Combobox.List>
      <Combobox.Group>
        <Combobox.Label>Frameworks</Combobox.Label>
        {#each ["Next.js", "Nuxt"] as item (item)}
          <Combobox.Item value={item} label={item}>{item}</Combobox.Item>
        {/each}
      </Combobox.Group>
      <Combobox.Separator />
      <Combobox.Item value="Astro" disabled>Astro</Combobox.Item>
    </Combobox.List>
  </Combobox.Content>
  <Combobox.Value />
</Combobox.Root>
<Combobox.Root type="multiple" bind:value={frameworks}>
  <Combobox.Chips>
    {#each frameworks as item (item)}
      <Combobox.Chip value={item}>{item}</Combobox.Chip>
    {/each}
    <Combobox.ChipsInput placeholder="Add" />
  </Combobox.Chips>
  <Combobox.Content><Combobox.List><Combobox.Item value="Remix">Remix</Combobox.Item></Combobox.List></Combobox.Content>
</Combobox.Root>

<Command.Root class="rounded-lg border">
  <Command.Input placeholder="Type a command or search…" />
  <Command.List aria-label="Commands">
    <Command.Empty>No results found.</Command.Empty>
    <Command.Group heading="Suggestions">
      <Command.Item onSelect={() => {}}>Calendar <Command.Shortcut>⌘C</Command.Shortcut></Command.Item>
      <Command.Item disabled>Search</Command.Item>
    </Command.Group>
    <Command.Separator alwaysRender />
  </Command.List>
</Command.Root>
<Command.Dialog bind:open={palette} title="Commands">
  <Command.Root><Command.Input /><Command.List><Command.Item>Profile</Command.Item></Command.List></Command.Root>
</Command.Dialog>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {#snippet child({ props })}
      <div {...props} class="h-32">Right-click</div>
    {/snippet}
  </ContextMenu.Trigger>
  <ContextMenu.Content class="w-56">
    <ContextMenu.Label inset>Page</ContextMenu.Label>
    <ContextMenu.Group><ContextMenu.Item onSelect={() => {}}>Back <ContextMenu.Shortcut>⌘[</ContextMenu.Shortcut></ContextMenu.Item></ContextMenu.Group>
    <ContextMenu.Item variant="destructive" disabled>Delete</ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.CheckboxItem bind:checked={bookmarks}>Bookmarks</ContextMenu.CheckboxItem>
    <ContextMenu.RadioGroup bind:value={person}><ContextMenu.RadioItem value="ada">Ada</ContextMenu.RadioItem></ContextMenu.RadioGroup>
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger inset>More</ContextMenu.SubTrigger>
      <ContextMenu.SubContent><ContextMenu.Item>Save as…</ContextMenu.Item></ContextMenu.SubContent>
    </ContextMenu.Sub>
  </ContextMenu.Content>
</ContextMenu.Root>
<ContextMenu.Root><ContextMenu.Trigger class="h-32">Right-click</ContextMenu.Trigger></ContextMenu.Root>

<Drawer.Root bind:open={drawer} direction="right">
  <Drawer.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="outline">Open drawer</Button>
    {/snippet}
  </Drawer.Trigger>
  <Drawer.Content class="max-w-md">
    <Drawer.Header><Drawer.Title>Move goal</Drawer.Title><Drawer.Description>Set your daily goal.</Drawer.Description></Drawer.Header>
    <Drawer.Footer><Button>Submit</Button><Drawer.Close>Cancel</Drawer.Close></Drawer.Footer>
  </Drawer.Content>
</Drawer.Root>

<HoverCard.Root openDelay={200}>
  <HoverCard.Trigger href="/ada">@ada</HoverCard.Trigger>
  <HoverCard.Content side="top" class="w-80">Ada Lovelace</HoverCard.Content>
</HoverCard.Root>

<Menubar.Root bind:value={menu} aria-label="Application">
  <Menubar.Menu value="file">
    <Menubar.Trigger>File</Menubar.Trigger>
    <Menubar.Content sideOffset={4}>
      <Menubar.Item>New tab <Menubar.Shortcut>⌘T</Menubar.Shortcut></Menubar.Item>
      <Menubar.Separator />
      <Menubar.CheckboxItem bind:checked={bookmarks}>Bookmarks</Menubar.CheckboxItem>
      <Menubar.RadioGroup bind:value={person}><Menubar.RadioItem value="ada">Ada</Menubar.RadioItem></Menubar.RadioGroup>
      <Menubar.Sub><Menubar.SubTrigger>Share</Menubar.SubTrigger><Menubar.SubContent><Menubar.Item>Email</Menubar.Item></Menubar.SubContent></Menubar.Sub>
    </Menubar.Content>
  </Menubar.Menu>
</Menubar.Root>

<NavigationMenu.Root viewport={false}>
  <NavigationMenu.List>
    <NavigationMenu.Item value="start">
      <NavigationMenu.Trigger>Getting started</NavigationMenu.Trigger>
      <NavigationMenu.Content><NavigationMenu.Link href="/docs" active>Introduction</NavigationMenu.Link></NavigationMenu.Content>
    </NavigationMenu.Item>
    <NavigationMenu.Item><NavigationMenu.Link href="/docs" class={navigationMenuTriggerStyle()}>Docs</NavigationMenu.Link></NavigationMenu.Item>
    <NavigationMenu.Indicator />
  </NavigationMenu.List>
</NavigationMenu.Root>

<Sonner position="top-center" richColors />
<Button onclick={() => sonner.success("Event created", { description: "Sunday at 9:00" })}>Sonner</Button>
<Toaster class="end-8">
  <Button onclick={() => toast.add({ title: "Saved", type: "success", actionProps: { children: "Undo", onClick: () => {} } })}>Toast</Button>
</Toaster>
<p class={toastClasses}>{manager.toasts.length}</p>
`,
};

// The long tail, used as shadcn-svelte's docs use it: a LayerChart chart whose tooltip and legend
// snippets take the system's parts, a conversation that follows its newest message (and a part that
// reads where it is), and a questionnaire bound to the question shown, a choice and a typed answer.
const LONG_TAIL = {
  path: "usage-long-tail.svelte",
  source: `<script lang="ts">
  import { BarChart, AreaChart } from "layerchart";
  import * as Chart from "$UI$/chart/index.js";
  import { ChartContainer, ChartTooltipContent, ChartLegend, type ChartConfig, type TooltipPayload } from "$UI$/chart/index.js";
  import * as MessageScroller from "$UI$/message-scroller/index.js";
  import { useMessageScroller, useMessageScrollerScrollable, useMessageScrollerVisibility, type MessageScrollerScrollable } from "$UI$/message-scroller/index.js";
  import * as Questionnaire from "$UI$/questionnaire/index.js";
  import type { QuestionnaireItemStatus } from "$UI$/questionnaire/index.js";

  const data = [
    { month: "January", desktop: 186, mobile: 80 },
    { month: "February", desktop: 305, mobile: 200 },
  ];
  const config = {
    desktop: { label: "Desktop", color: "var(--chart-1)" },
    mobile: { label: "Mobile", theme: { light: "var(--chart-2)", dark: "var(--chart-3)" } },
  } satisfies ChartConfig;
  const payload: TooltipPayload[] = [];

  let messages = $state([{ id: "a", text: "Hi" }]);
  let item = $state("tone");
  let agreed = $state(false);
  let name = $state("");
  let status = $state<QuestionnaireItemStatus>("unanswered");
  const scrollable: MessageScrollerScrollable | undefined = undefined;
  void [useMessageScroller, useMessageScrollerScrollable, useMessageScrollerVisibility, scrollable];
</script>

<Chart.Container config={config} class="min-h-[200px] w-full">
  <BarChart {data} x="month" axis="x" seriesLayout="group" series={[{ key: "desktop", label: "Desktop", color: config.desktop.color }, { key: "mobile", label: "Mobile", color: "var(--color-mobile)" }]}>
    {#snippet tooltip()}
      <Chart.Tooltip indicator="dashed" labelFormatter={(v) => String(v).slice(0, 3)} />
    {/snippet}
    {#snippet legend()}
      <Chart.LegendContent verticalAlign="top" />
    {/snippet}
  </BarChart>
</Chart.Container>
<ChartContainer {config} id="sales">
  <AreaChart {data} x="month" series={[{ key: "desktop", color: "var(--color-desktop)" }]} legend>
    {#snippet tooltip()}
      <Chart.Tooltip hideLabel hideIndicator nameKey="desktop" labelKey="month" color="red" />
    {/snippet}
  </AreaChart>
</ChartContainer>
<ChartTooltipContent {payload} label="January" indicator="line" labelClassName="font-bold" />
<ChartLegend />

<MessageScroller.Provider autoScroll defaultScrollPosition="last-anchor" scrollEdgeThreshold={4}>
  <MessageScroller.Root class="h-64">
    <MessageScroller.Viewport preserveScrollOnPrepend={false} aria-label="Chat">
      <MessageScroller.Content class="gap-4 p-4" spacerClass="bg-transparent">
        {#each messages as m (m.id)}
          <MessageScroller.Item messageId={m.id} scrollAnchor>{m.text}</MessageScroller.Item>
        {/each}
      </MessageScroller.Content>
    </MessageScroller.Viewport>
    <MessageScroller.Button />
    <MessageScroller.Button direction="start" variant="secondary" behavior="auto" onclick={(e) => e.preventDefault()}>Top</MessageScroller.Button>
  </MessageScroller.Root>
</MessageScroller.Provider>
<button onclick={() => (messages = [...messages, { id: "b", text: "More" }])}>Add</button>
<p>{status} {agreed} {name} {item}</p>

<Questionnaire.Root bind:item items={[{ name: "tone", required: true, choices: [{ value: "warm" }, { value: "plain" }] }, { name: "name" }]} shortcuts="letters" noValidate={false} onsubmit={(e) => e.preventDefault()} onItemChange={(next) => console.log(next)}>
  <Questionnaire.Progress />
  <Questionnaire.Item name="tone" required onStatusChange={(s) => (status = s)}>
    <Questionnaire.Title>How should it sound?</Questionnaire.Title>
    <Questionnaire.Description>Pick one.</Questionnaire.Description>
    <Questionnaire.Choices>
      <Questionnaire.Choice value="warm" defaultChecked>Warm<Questionnaire.ChoiceDescription>Friendly</Questionnaire.ChoiceDescription></Questionnaire.Choice>
      <Questionnaire.Choice bind:checked={agreed} value="plain" onchange={() => {}}>Plain</Questionnaire.Choice>
    </Questionnaire.Choices>
    <Questionnaire.Error />
  </Questionnaire.Item>
  <Questionnaire.Item name="name" multiple invalid>
    <Questionnaire.Title>Your name</Questionnaire.Title>
    <Questionnaire.Input bind:value={name} type="email" placeholder="ada@example.com" />
    <Questionnaire.Error id="name-error">Tell us who you are.</Questionnaire.Error>
  </Questionnaire.Item>
  <Questionnaire.Actions>
    <Questionnaire.Previous variant="ghost" />
    <Questionnaire.Skip onclick={(e) => e.preventDefault()} />
    <Questionnaire.Next size="sm">Continue</Questionnaire.Next>
    <Questionnaire.Submit />
  </Questionnaire.Actions>
</Questionnaire.Root>
`,
};

// A check that finds nothing proves little unless it can find something.
it("svelte-check reports a wrong prop in a generated folder", async () => {
  const files = await renderAll("bits-ui", DEFAULT_SYSTEM, { format: false });
  const broken = { path: "usage.svelte", source: `<script lang="ts">\n  import { Button } from "$UI$/button/index.js";\n</script>\n\n<Button variant="huge">No</Button>\n` };
  const diagnostics = await svelteCheck("check-broken", [...files, broken]);
  expect(diagnostics).toEqual([expect.objectContaining({ file: "usage.svelte", line: 5, severity: "error" })]);
}, 120_000);

// Every component used as the parity cases use it (tests/cases.ts): its parts by shadcn-svelte's
// names, the design API, the Bits props (type, value, open) and snippets, each a page of its own.
const usages = (system: DesignSystem): GeneratedFile[] =>
  domCases(system).map((c) => ({ path: `usage-${c.name}.svelte`, source: `<script lang="ts">\n  ${c.svelte.imports}\n</script>\n\n${c.svelte.markup}\n` }));

describe.each([
  ["default", DEFAULT_SYSTEM],
  ["custom", customSystem()],
  // A class prefix reaches .svelte files (prefixFiles); what it writes must still compile.
  ["prefixed", { ...customSystem(), tailwindPrefix: "tw" }],
] as [string, DesignSystem][])("the generated Svelte components for the %s system", (label, system) => {
  it("pass svelte-check, strict, with warnings failing", async () => {
    const files = await prefixFiles([...(await renderAll("bits-ui", system)), USAGE, CALENDAR_USAGE, MENUS_AND_OVERLAYS, LONG_TAIL, ...usages(system)], system.tailwindPrefix);
    expect(files.map((f) => f.path)).toContain("components/ui/dialog/dialog-content.svelte");
    if (system.tailwindPrefix !== undefined) expect(files.find((f) => f.path.endsWith("dialog-content.svelte"))!.source).toContain(`"tw:`);
    const diagnostics = await svelteCheck(`check-${label}`, files);
    expect(diagnostics.map((d) => `${d.file}:${d.line} ${d.severity}: ${d.message}`)).toEqual([]);
  }, 120_000);
});
