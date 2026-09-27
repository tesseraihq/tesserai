import { SHADCN_VARIANT_ALIASES, type DesignSystem } from "@tesserai/core";

// Server-rendered DOM parity cases: the same component used the same way in React (on Radix) and
// in Svelte (on Bits UI), each framework in its own idiom. React imports from "@/components/ui/…";
// Svelte from "$UI$/…/index.js" (resolved to the fixture's folder). Popups and modals are rendered
// open, in place: the React side's portals render their children where they stand (see
// parity.test.ts), the Svelte side is given portalProps={{ disabled: true }}.
export type DomCase = { name: string; react: { imports: string; jsx: string }; svelte: { imports: string; markup: string } };

const selections = (axes: Record<string, (string | undefined)[]>): Record<string, string>[] => {
  let out: Record<string, string>[] = [{}];
  for (const [axis, values] of Object.entries(axes)) out = out.flatMap((o) => values.map((v) => (v === undefined ? o : { ...o, [axis]: v })));
  return out;
};

export function domCases(system: DesignSystem): DomCase[] {
  const c = system.components;
  const enabled = (name: string, axis: "variant" | "intent" | "size") => c[name]?.axes[axis]?.enabled ?? [];

  const badges = JSON.stringify(
    selections({ variant: [undefined, ...enabled("badge", "variant"), ...Object.keys(SHADCN_VARIANT_ALIASES).filter((a) => ["default", "secondary", "destructive"].includes(a))], intent: [undefined, ...enabled("badge", "intent")], size: [undefined, ...enabled("badge", "size")] }),
  );
  const alerts = JSON.stringify(selections({ variant: [undefined, ...enabled("alert", "variant"), "default", "destructive"], intent: [undefined, ...enabled("alert", "intent")] }));
  const toggles = JSON.stringify(selections({ variant: [undefined, "default", ...enabled("toggle", "variant")], size: [undefined, ...enabled("toggle", "size")] }));

  return [
    {
      name: "badge",
      react: {
        imports: `import { Badge } from "@/components/ui/badge";`,
        jsx: `<>{${badges}.map((p: Record<string, string>, i: number) => <Badge key={i} {...(p as object)}>New</Badge>)}<Badge asChild variant="outline"><a href="#x">Link</a></Badge><Badge className="px-4 text-5">Own</Badge></>`,
      },
      svelte: {
        imports: `import { Badge } from "$UI$/badge/index.js";\n  const cases: Record<string, string>[] = ${badges};`,
        markup: `{#each cases as p}<Badge {...p}>New</Badge>{/each}<Badge href="#x" variant="outline">Link</Badge><Badge class="px-4 text-5">Own</Badge>`,
      },
    },
    {
      name: "input",
      react: {
        imports: `import { Input } from "@/components/ui/input";`,
        jsx: `<><Input /><Input size="sm" placeholder="Name" /><Input size="lg" aria-invalid disabled /><Input type="file" /><Input className="h-12 px-8" readOnly /></>`,
      },
      svelte: {
        imports: `import { Input } from "$UI$/input/index.js";`,
        markup: `<Input /><Input size="sm" placeholder="Name" /><Input size="lg" aria-invalid="true" disabled /><Input type="file" /><Input class="h-12 px-8" readonly />`,
      },
    },
    {
      name: "textarea",
      react: { imports: `import { Textarea } from "@/components/ui/textarea";`, jsx: `<><Textarea placeholder="Say" /><Textarea disabled className="min-h-40" /></>` },
      svelte: { imports: `import { Textarea } from "$UI$/textarea/index.js";`, markup: `<Textarea placeholder="Say" /><Textarea disabled class="min-h-40" />` },
    },
    {
      name: "label",
      react: { imports: `import { Label } from "@/components/ui/label";`, jsx: `<><Label htmlFor="x">Name</Label><Label className="gap-4">Other</Label></>` },
      svelte: { imports: `import { Label } from "$UI$/label/index.js";`, markup: `<Label for="x">Name</Label><Label class="gap-4">Other</Label>` },
    },
    {
      name: "field",
      react: {
        imports: `import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "@/components/ui/field";`,
        jsx: `<FieldSet>
  <FieldLegend>Profile</FieldLegend>
  <FieldLegend variant="label">Small</FieldLegend>
  <FieldGroup>
    <Field><FieldLabel htmlFor="n">Name</FieldLabel><FieldDescription>Yours.</FieldDescription><FieldError>Required.</FieldError></Field>
    <Field orientation="horizontal" data-invalid="true"><FieldContent><FieldTitle>Title</FieldTitle><FieldDescription>More.</FieldDescription></FieldContent></Field>
    <Field orientation="responsive"><FieldLabel>Choice<Field orientation="horizontal"><FieldTitle>Inner</FieldTitle></Field></FieldLabel></Field>
    <FieldSeparator />
    <FieldSeparator>Or</FieldSeparator>
    <FieldError errors={[{ message: "One" }]} />
    <FieldError errors={[{ message: "One" }, { message: "Two" }, { message: "One" }]} className="text-5" />
    <FieldError errors={[]} />
  </FieldGroup>
</FieldSet>`,
      },
      svelte: {
        imports: `import * as Field from "$UI$/field/index.js";`,
        markup: `<Field.Set>
  <Field.Legend>Profile</Field.Legend>
  <Field.Legend variant="label">Small</Field.Legend>
  <Field.Group>
    <Field.Field><Field.Label for="n">Name</Field.Label><Field.Description>Yours.</Field.Description><Field.Error>Required.</Field.Error></Field.Field>
    <Field.Field orientation="horizontal" data-invalid="true"><Field.Content><Field.Title>Title</Field.Title><Field.Description>More.</Field.Description></Field.Content></Field.Field>
    <Field.Field orientation="responsive"><Field.Label>Choice<Field.Field orientation="horizontal"><Field.Title>Inner</Field.Title></Field.Field></Field.Label></Field.Field>
    <Field.Separator />
    <Field.Separator>Or</Field.Separator>
    <Field.Error errors={[{ message: "One" }]} />
    <Field.Error errors={[{ message: "One" }, { message: "Two" }, { message: "One" }]} class="text-5" />
    <Field.Error errors={[]} />
  </Field.Group>
</Field.Set>`,
      },
    },
    {
      name: "checkbox",
      react: {
        imports: `import { Checkbox } from "@/components/ui/checkbox";`,
        jsx: `<><Checkbox /><Checkbox checked /><Checkbox checked="indeterminate" /><Checkbox checked disabled size="sm" /><Checkbox aria-invalid className="rounded-full" /></>`,
      },
      svelte: {
        imports: `import { Checkbox } from "$UI$/checkbox/index.js";`,
        markup: `<Checkbox /><Checkbox checked /><Checkbox indeterminate /><Checkbox checked disabled size="sm" /><Checkbox aria-invalid="true" class="rounded-full" />`,
      },
    },
    {
      name: "switch",
      react: { imports: `import { Switch } from "@/components/ui/switch";`, jsx: `<><Switch /><Switch checked /><Switch checked disabled size="sm" /><Switch className="w-20" /></>` },
      svelte: { imports: `import { Switch } from "$UI$/switch/index.js";`, markup: `<Switch /><Switch checked /><Switch checked disabled size="sm" /><Switch class="w-20" />` },
    },
    {
      name: "radio-group",
      react: {
        imports: `import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";`,
        jsx: `<RadioGroup defaultValue="b" className="gap-6"><RadioGroupItem value="a" /><RadioGroupItem value="b" size="sm" /><RadioGroupItem value="c" disabled /></RadioGroup>`,
      },
      svelte: {
        imports: `import * as RadioGroup from "$UI$/radio-group/index.js";`,
        markup: `<RadioGroup.Root value="b" class="gap-6"><RadioGroup.Item value="a" /><RadioGroup.Item value="b" size="sm" /><RadioGroup.Item value="c" disabled /></RadioGroup.Root>`,
      },
    },
    {
      name: "select",
      react: {
        imports: `import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";`,
        jsx: `<>
  <Select open value="b"><SelectTrigger size="sm" className="w-40"><SelectValue placeholder="Pick" /></SelectTrigger><SelectContent position="popper"><SelectGroup><SelectLabel>Fruit</SelectLabel><SelectItem value="a">Apple</SelectItem><SelectItem value="b">Banana</SelectItem><SelectItem value="c" disabled>Cherry</SelectItem></SelectGroup><SelectSeparator /><SelectItem value="d" className="h-12">Date</SelectItem></SelectContent></Select>
  <Select><SelectTrigger><SelectValue placeholder="Pick" /></SelectTrigger></Select>
  <Select disabled><SelectTrigger size="lg" aria-invalid><SelectValue placeholder="Pick" /></SelectTrigger></Select>
</>`,
      },
      svelte: {
        imports: `import * as Select from "$UI$/select/index.js";`,
        markup: `<Select.Root type="single" open value="b"><Select.Trigger size="sm" class="w-40"><Select.Value placeholder="Pick" /></Select.Trigger><Select.Content portalProps={{ disabled: true }}><Select.Group><Select.Label>Fruit</Select.Label><Select.Item value="a">Apple</Select.Item><Select.Item value="b">Banana</Select.Item><Select.Item value="c" disabled>Cherry</Select.Item></Select.Group><Select.Separator /><Select.Item value="d" class="h-12">Date</Select.Item></Select.Content></Select.Root>
<Select.Root type="single"><Select.Trigger><Select.Value placeholder="Pick" /></Select.Trigger></Select.Root>
<Select.Root type="single" disabled><Select.Trigger size="lg" aria-invalid="true"><Select.Value placeholder="Pick" /></Select.Trigger></Select.Root>`,
      },
    },
    {
      name: "native-select",
      react: {
        imports: `import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";`,
        jsx: `<><NativeSelect className="w-60"><NativeSelectOption value="a">A</NativeSelectOption><NativeSelectOptGroup label="More"><NativeSelectOption value="b">B</NativeSelectOption></NativeSelectOptGroup></NativeSelect><NativeSelect size="sm" disabled aria-invalid /></>`,
      },
      svelte: {
        imports: `import * as NativeSelect from "$UI$/native-select/index.js";`,
        markup: `<NativeSelect.Root class="w-60"><NativeSelect.Option value="a">A</NativeSelect.Option><NativeSelect.OptGroup label="More"><NativeSelect.Option value="b">B</NativeSelect.Option></NativeSelect.OptGroup></NativeSelect.Root><NativeSelect.Root size="sm" disabled aria-invalid="true" />`,
      },
    },
    {
      name: "card",
      react: {
        imports: `import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";`,
        jsx: `<><Card><CardHeader><CardTitle>T</CardTitle><CardDescription>D</CardDescription><CardAction>A</CardAction></CardHeader><CardContent>C</CardContent><CardFooter>F</CardFooter></Card>${enabled("card", "size").map((s) => `<Card size="${s}" className="p-2" />`).join("")}</>`,
      },
      svelte: {
        imports: `import * as Card from "$UI$/card/index.js";`,
        markup: `<Card.Root><Card.Header><Card.Title>T</Card.Title><Card.Description>D</Card.Description><Card.Action>A</Card.Action></Card.Header><Card.Content>C</Card.Content><Card.Footer>F</Card.Footer></Card.Root>${enabled("card", "size").map((s) => `<Card.Root size="${s}" class="p-2" />`).join("")}`,
      },
    },
    {
      name: "separator",
      react: { imports: `import { Separator } from "@/components/ui/separator";`, jsx: `<><Separator /><Separator orientation="vertical" decorative={false} className="mx-2" /></>` },
      svelte: { imports: `import { Separator } from "$UI$/separator/index.js";`, markup: `<Separator /><Separator orientation="vertical" decorative={false} class="mx-2" />` },
    },
    {
      name: "skeleton",
      react: { imports: `import { Skeleton } from "@/components/ui/skeleton";`, jsx: `<><Skeleton /><Skeleton className="h-4 w-40 rounded-full" /></>` },
      svelte: { imports: `import { Skeleton } from "$UI$/skeleton/index.js";`, markup: `<Skeleton /><Skeleton class="h-4 w-40 rounded-full" />` },
    },
    {
      name: "spinner",
      react: { imports: `import { Spinner } from "@/components/ui/spinner";`, jsx: `<><Spinner /><Spinner className="size-8" /></>` },
      svelte: { imports: `import { Spinner } from "$UI$/spinner/index.js";`, markup: `<Spinner /><Spinner class="size-8" />` },
    },
    {
      name: "kbd",
      react: { imports: `import { Kbd, KbdGroup } from "@/components/ui/kbd";`, jsx: `<KbdGroup><Kbd>⌘</Kbd><Kbd className="px-4">K</Kbd></KbdGroup>` },
      svelte: { imports: `import * as Kbd from "$UI$/kbd/index.js";`, markup: `<Kbd.Group><Kbd.Root>⌘</Kbd.Root><Kbd.Root class="px-4">K</Kbd.Root></Kbd.Group>` },
    },
    {
      name: "alert",
      react: {
        imports: `import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";`,
        jsx: `<>{${alerts}.map((p: Record<string, string>, i: number) => <Alert key={i} {...(p as object)}><AlertTitle>T</AlertTitle><AlertDescription>D</AlertDescription><AlertAction>A</AlertAction></Alert>)}<Alert className="p-8" /></>`,
      },
      svelte: {
        imports: `import * as Alert from "$UI$/alert/index.js";\n  const cases: Record<string, string>[] = ${alerts};`,
        markup: `{#each cases as p}<Alert.Root {...p}><Alert.Title>T</Alert.Title><Alert.Description>D</Alert.Description><Alert.Action>A</Alert.Action></Alert.Root>{/each}<Alert.Root class="p-8" />`,
      },
    },
    {
      name: "avatar",
      react: {
        imports: `import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar";`,
        jsx: `<><Avatar><AvatarImage src="/a.png" alt="A" /><AvatarFallback>AK</AvatarFallback><AvatarBadge /></Avatar>${enabled("avatar", "size").map((s) => `<Avatar size="${s}" className="rounded-none"><AvatarFallback>S</AvatarFallback></Avatar>`).join("")}<AvatarGroup><Avatar><AvatarFallback>B</AvatarFallback></Avatar><AvatarGroupCount>+3</AvatarGroupCount></AvatarGroup></>`,
      },
      svelte: {
        imports: `import * as Avatar from "$UI$/avatar/index.js";`,
        markup: `<Avatar.Root><Avatar.Image src="/a.png" alt="A" /><Avatar.Fallback>AK</Avatar.Fallback><Avatar.Badge /></Avatar.Root>${enabled("avatar", "size").map((s) => `<Avatar.Root size="${s}" class="rounded-none"><Avatar.Fallback>S</Avatar.Fallback></Avatar.Root>`).join("")}<Avatar.Group><Avatar.Root><Avatar.Fallback>B</Avatar.Fallback></Avatar.Root><Avatar.GroupCount>+3</Avatar.GroupCount></Avatar.Group>`,
      },
    },
    {
      name: "typography",
      react: {
        imports: `import * as T from "@/components/ui/typography";`,
        jsx: `<><T.TypographyH1>x</T.TypographyH1><T.TypographyH2>x</T.TypographyH2><T.TypographyH3>x</T.TypographyH3><T.TypographyH4>x</T.TypographyH4><T.TypographyP className="mt-0">x</T.TypographyP><T.TypographyLead>x</T.TypographyLead><T.TypographyLarge>x</T.TypographyLarge><T.TypographySmall>x</T.TypographySmall><T.TypographyMuted>x</T.TypographyMuted><T.TypographyBlockquote>x</T.TypographyBlockquote><T.TypographyList>x</T.TypographyList><T.TypographyInlineCode>x</T.TypographyInlineCode></>`,
      },
      svelte: {
        imports: `import * as T from "$UI$/typography/index.js";`,
        markup: `<T.H1>x</T.H1><T.H2>x</T.H2><T.H3>x</T.H3><T.H4>x</T.H4><T.P class="mt-0">x</T.P><T.Lead>x</T.Lead><T.Large>x</T.Large><T.Small>x</T.Small><T.Muted>x</T.Muted><T.Blockquote>x</T.Blockquote><T.List>x</T.List><T.InlineCode>x</T.InlineCode>`,
      },
    },
    {
      name: "table",
      react: {
        imports: `import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";`,
        jsx: `<Table className="text-5"><TableCaption>C</TableCaption><TableHeader><TableRow><TableHead>H</TableHead></TableRow></TableHeader><TableBody><TableRow selected><TableCell>1</TableCell></TableRow><TableRow><TableCell className="px-8">2</TableCell></TableRow></TableBody><TableFooter><TableRow><TableCell>F</TableCell></TableRow></TableFooter></Table>`,
      },
      svelte: {
        imports: `import * as Table from "$UI$/table/index.js";`,
        markup: `<Table.Root class="text-5"><Table.Caption>C</Table.Caption><Table.Header><Table.Row><Table.Head>H</Table.Head></Table.Row></Table.Header><Table.Body><Table.Row selected><Table.Cell>1</Table.Cell></Table.Row><Table.Row><Table.Cell class="px-8">2</Table.Cell></Table.Row></Table.Body><Table.Footer><Table.Row><Table.Cell>F</Table.Cell></Table.Row></Table.Footer></Table.Root>`,
      },
    },
    {
      name: "tabs",
      react: {
        imports: `import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";`,
        jsx: `<>
  <Tabs defaultValue="a"><TabsList><TabsTrigger value="a">A</TabsTrigger><TabsTrigger value="b" disabled>B</TabsTrigger></TabsList><TabsContent value="a">One</TabsContent></Tabs>
  <Tabs defaultValue="b" orientation="vertical" className="gap-8">${[...enabled("tabs", "variant"), "default"].map((v) => `<TabsList variant="${v}"><TabsTrigger value="a" className="px-8">A</TabsTrigger><TabsTrigger value="b">B</TabsTrigger></TabsList>`).join("")}<TabsContent value="b" className="p-0">Two</TabsContent></Tabs>
</>`,
      },
      svelte: {
        imports: `import * as Tabs from "$UI$/tabs/index.js";`,
        markup: `<Tabs.Root value="a"><Tabs.List><Tabs.Trigger value="a">A</Tabs.Trigger><Tabs.Trigger value="b" disabled>B</Tabs.Trigger></Tabs.List><Tabs.Content value="a">One</Tabs.Content></Tabs.Root>
<Tabs.Root value="b" orientation="vertical" class="gap-8">${[...enabled("tabs", "variant"), "default"].map((v) => `<Tabs.List variant="${v}"><Tabs.Trigger value="a" class="px-8">A</Tabs.Trigger><Tabs.Trigger value="b">B</Tabs.Trigger></Tabs.List>`).join("")}<Tabs.Content value="b" class="p-0">Two</Tabs.Content></Tabs.Root>`,
      },
    },
    {
      name: "accordion",
      react: {
        imports: `import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";`,
        jsx: `<Accordion type="single" collapsible defaultValue="a" className="gap-2"><AccordionItem value="a"><AccordionTrigger>A</AccordionTrigger><AccordionContent className="pb-8">One</AccordionContent></AccordionItem><AccordionItem value="b" disabled className="border-0"><AccordionTrigger className="py-8">B</AccordionTrigger><AccordionContent>Two</AccordionContent></AccordionItem></Accordion>`,
      },
      svelte: {
        imports: `import * as Accordion from "$UI$/accordion/index.js";`,
        markup: `<Accordion.Root type="single" value="a" class="gap-2"><Accordion.Item value="a"><Accordion.Trigger>A</Accordion.Trigger><Accordion.Content class="pb-8">One</Accordion.Content></Accordion.Item><Accordion.Item value="b" disabled class="border-0"><Accordion.Trigger class="py-8">B</Accordion.Trigger><Accordion.Content>Two</Accordion.Content></Accordion.Item></Accordion.Root>`,
      },
    },
    {
      name: "collapsible",
      react: {
        imports: `import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";`,
        jsx: `<><Collapsible open><CollapsibleTrigger>Open</CollapsibleTrigger><CollapsibleContent className="p-4">Body</CollapsibleContent></Collapsible><Collapsible><CollapsibleTrigger>Closed</CollapsibleTrigger></Collapsible></>`,
      },
      svelte: {
        imports: `import * as Collapsible from "$UI$/collapsible/index.js";`,
        markup: `<Collapsible.Root open><Collapsible.Trigger>Open</Collapsible.Trigger><Collapsible.Content class="p-4">Body</Collapsible.Content></Collapsible.Root><Collapsible.Root><Collapsible.Trigger>Closed</Collapsible.Trigger></Collapsible.Root>`,
      },
    },
    {
      name: "toggle",
      react: {
        imports: `import { Toggle } from "@/components/ui/toggle";`,
        jsx: `<>{${toggles}.map((p: Record<string, string>, i: number) => <Toggle key={i} {...(p as object)}>B</Toggle>)}<Toggle pressed disabled className="px-8">P</Toggle></>`,
      },
      svelte: {
        imports: `import { Toggle } from "$UI$/toggle/index.js";\n  const cases: Record<string, string>[] = ${toggles};`,
        markup: `{#each cases as p}<Toggle {...p}>B</Toggle>{/each}<Toggle pressed disabled class="px-8">P</Toggle>`,
      },
    },
    {
      name: "toggle-group",
      react: {
        imports: `import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";`,
        jsx: `<>
  <ToggleGroup type="single" defaultValue="a"><ToggleGroupItem value="a">A</ToggleGroupItem><ToggleGroupItem value="b" variant="outline" size="sm">B</ToggleGroupItem></ToggleGroup>
  <ToggleGroup type="multiple" variant="outline" size="lg" spacing={0} orientation="vertical" className="w-40"><ToggleGroupItem value="a" className="px-8">A</ToggleGroupItem><ToggleGroupItem value="b" disabled>B</ToggleGroupItem></ToggleGroup>
  <ToggleGroup type="single" spacing={2}><ToggleGroupItem value="a">A</ToggleGroupItem></ToggleGroup>
</>`,
      },
      svelte: {
        imports: `import * as ToggleGroup from "$UI$/toggle-group/index.js";`,
        markup: `<ToggleGroup.Root type="single" value="a"><ToggleGroup.Item value="a">A</ToggleGroup.Item><ToggleGroup.Item value="b" variant="outline" size="sm">B</ToggleGroup.Item></ToggleGroup.Root>
<ToggleGroup.Root type="multiple" variant="outline" size="lg" spacing={0} orientation="vertical" class="w-40"><ToggleGroup.Item value="a" class="px-8">A</ToggleGroup.Item><ToggleGroup.Item value="b" disabled>B</ToggleGroup.Item></ToggleGroup.Root>
<ToggleGroup.Root type="single" spacing={2}><ToggleGroup.Item value="a">A</ToggleGroup.Item></ToggleGroup.Root>`,
      },
    },
    {
      name: "tooltip",
      react: {
        imports: `import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";`,
        jsx: `<><Tooltip open><TooltipTrigger>Hover</TooltipTrigger><TooltipContent className="max-w-40">Tip</TooltipContent></Tooltip><Tooltip><TooltipTrigger>Closed</TooltipTrigger><TooltipContent>No</TooltipContent></Tooltip></>`,
      },
      svelte: {
        imports: `import * as Tooltip from "$UI$/tooltip/index.js";`,
        markup: `<Tooltip.Root open><Tooltip.Trigger>Hover</Tooltip.Trigger><Tooltip.Content class="max-w-40" portalProps={{ disabled: true }}>Tip</Tooltip.Content></Tooltip.Root><Tooltip.Root><Tooltip.Trigger>Closed</Tooltip.Trigger><Tooltip.Content portalProps={{ disabled: true }}>No</Tooltip.Content></Tooltip.Root>`,
      },
    },
    {
      name: "popover",
      react: {
        imports: `import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";`,
        jsx: `<Popover open><PopoverTrigger>Open</PopoverTrigger><PopoverContent className="w-96"><PopoverHeader><PopoverTitle>T</PopoverTitle><PopoverDescription>D</PopoverDescription></PopoverHeader></PopoverContent></Popover>`,
      },
      svelte: {
        imports: `import * as Popover from "$UI$/popover/index.js";`,
        markup: `<Popover.Root open><Popover.Trigger>Open</Popover.Trigger><Popover.Content class="w-96" portalProps={{ disabled: true }}><Popover.Header><Popover.Title>T</Popover.Title><Popover.Description>D</Popover.Description></Popover.Header></Popover.Content></Popover.Root>`,
      },
    },
    {
      name: "dropdown-menu",
      react: {
        imports: `import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";`,
        jsx: `<DropdownMenu open><DropdownMenuTrigger>Menu</DropdownMenuTrigger><DropdownMenuContent className="w-56">
  <DropdownMenuLabel>Account</DropdownMenuLabel>
  <DropdownMenuGroup><DropdownMenuItem>Profile<DropdownMenuShortcut>⌘P</DropdownMenuShortcut></DropdownMenuItem><DropdownMenuItem inset disabled>Billing</DropdownMenuItem><DropdownMenuItem variant="destructive">Delete</DropdownMenuItem></DropdownMenuGroup>
  <DropdownMenuSeparator />
  <DropdownMenuCheckboxItem checked>Bar</DropdownMenuCheckboxItem><DropdownMenuCheckboxItem checked={false}>Panel</DropdownMenuCheckboxItem>
  <DropdownMenuRadioGroup value="top"><DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem><DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem></DropdownMenuRadioGroup>
  <DropdownMenuSub><DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger></DropdownMenuSub>
</DropdownMenuContent></DropdownMenu>`,
      },
      svelte: {
        imports: `import * as DropdownMenu from "$UI$/dropdown-menu/index.js";`,
        markup: `<DropdownMenu.Root open><DropdownMenu.Trigger>Menu</DropdownMenu.Trigger><DropdownMenu.Content class="w-56" portalProps={{ disabled: true }}>
  <DropdownMenu.Label>Account</DropdownMenu.Label>
  <DropdownMenu.Group><DropdownMenu.Item>Profile<DropdownMenu.Shortcut>⌘P</DropdownMenu.Shortcut></DropdownMenu.Item><DropdownMenu.Item inset disabled>Billing</DropdownMenu.Item><DropdownMenu.Item variant="destructive">Delete</DropdownMenu.Item></DropdownMenu.Group>
  <DropdownMenu.Separator />
  <DropdownMenu.CheckboxItem checked>Bar</DropdownMenu.CheckboxItem><DropdownMenu.CheckboxItem checked={false}>Panel</DropdownMenu.CheckboxItem>
  <DropdownMenu.RadioGroup value="top"><DropdownMenu.RadioItem value="top">Top</DropdownMenu.RadioItem><DropdownMenu.RadioItem value="bottom">Bottom</DropdownMenu.RadioItem></DropdownMenu.RadioGroup>
  <DropdownMenu.Sub><DropdownMenu.SubTrigger inset>More</DropdownMenu.SubTrigger></DropdownMenu.Sub>
</DropdownMenu.Content></DropdownMenu.Root>`,
      },
    },
    {
      name: "progress",
      react: { imports: `import { Progress } from "@/components/ui/progress";`, jsx: `<><Progress value={40} /><Progress value={100} className="h-4" /><Progress /></>` },
      svelte: { imports: `import { Progress } from "$UI$/progress/index.js";`, markup: `<Progress value={40} /><Progress value={100} class="h-4" /><Progress />` },
    },
    {
      name: "slider",
      react: {
        imports: `import { Slider } from "@/components/ui/slider";`,
        jsx: `<><Slider defaultValue={[40]} aria-label="Volume" /><Slider defaultValue={[20, 80]} orientation="vertical" disabled className="h-40" /></>`,
      },
      svelte: {
        imports: `import { Slider } from "$UI$/slider/index.js";`,
        markup: `<Slider type="single" value={40} aria-label="Volume" /><Slider type="multiple" value={[20, 80]} orientation="vertical" disabled class="h-40" />`,
      },
    },
    {
      name: "breadcrumb",
      react: {
        imports: `import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";`,
        jsx: `<Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem><BreadcrumbSeparator>/</BreadcrumbSeparator><BreadcrumbItem><BreadcrumbLink asChild><a href="/docs" className="underline">Docs</a></BreadcrumbLink></BreadcrumbItem><BreadcrumbItem><BreadcrumbPage className="font-bold">Page</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb>`,
      },
      svelte: {
        imports: `import * as Breadcrumb from "$UI$/breadcrumb/index.js";`,
        markup: `<Breadcrumb.Root><Breadcrumb.List><Breadcrumb.Item><Breadcrumb.Link href="/">Home</Breadcrumb.Link></Breadcrumb.Item><Breadcrumb.Separator /><Breadcrumb.Item><Breadcrumb.Ellipsis /></Breadcrumb.Item><Breadcrumb.Separator>/</Breadcrumb.Separator><Breadcrumb.Item><Breadcrumb.Link class="underline">{#snippet child({ props })}<a {...props} href="/docs">Docs</a>{/snippet}</Breadcrumb.Link></Breadcrumb.Item><Breadcrumb.Item><Breadcrumb.Page class="font-bold">Page</Breadcrumb.Page></Breadcrumb.Item></Breadcrumb.List></Breadcrumb.Root>`,
      },
    },
    {
      name: "pagination",
      react: {
        imports: `import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";`,
        jsx: `<Pagination><PaginationContent><PaginationItem><PaginationPrevious href="#" /></PaginationItem><PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem><PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem><PaginationItem><PaginationEllipsis /></PaginationItem><PaginationItem><PaginationNext href="#" text="Onward" className="px-8" /></PaginationItem></PaginationContent></Pagination>`,
      },
      svelte: {
        imports: `import * as Pagination from "$UI$/pagination/index.js";`,
        markup: `<Pagination.Root><Pagination.Content><Pagination.Item><Pagination.Previous href="#" /></Pagination.Item><Pagination.Item><Pagination.Link href="#">1</Pagination.Link></Pagination.Item><Pagination.Item><Pagination.Link href="#" isActive>2</Pagination.Link></Pagination.Item><Pagination.Item><Pagination.Ellipsis /></Pagination.Item><Pagination.Item><Pagination.Next href="#" text="Onward" class="px-8" /></Pagination.Item></Pagination.Content></Pagination.Root>`,
      },
    },
    {
      name: "alert-dialog",
      react: {
        imports: `import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";`,
        jsx: `<><AlertDialog open><AlertDialogContent size="sm" className="p-2"><AlertDialogHeader><AlertDialogMedia>!</AlertDialogMedia><AlertDialogTitle>Sure?</AlertDialogTitle><AlertDialogDescription>Gone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>No</AlertDialogCancel><AlertDialogAction variant="destructive" size="sm">Yes</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><AlertDialog><AlertDialogTrigger>Open</AlertDialogTrigger></AlertDialog></>`,
      },
      svelte: {
        imports: `import * as AlertDialog from "$UI$/alert-dialog/index.js";`,
        markup: `<AlertDialog.Root open><AlertDialog.Content size="sm" class="p-2" portalProps={{ disabled: true }}><AlertDialog.Header><AlertDialog.Media>!</AlertDialog.Media><AlertDialog.Title>Sure?</AlertDialog.Title><AlertDialog.Description>Gone.</AlertDialog.Description></AlertDialog.Header><AlertDialog.Footer><AlertDialog.Cancel>No</AlertDialog.Cancel><AlertDialog.Action variant="destructive" size="sm">Yes</AlertDialog.Action></AlertDialog.Footer></AlertDialog.Content></AlertDialog.Root><AlertDialog.Root><AlertDialog.Trigger>Open</AlertDialog.Trigger></AlertDialog.Root>`,
      },
    },
    {
      name: "sheet",
      react: {
        imports: `import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";`,
        jsx: `<><Sheet open><SheetContent side="left" className="w-96"><SheetHeader><SheetTitle>T</SheetTitle><SheetDescription>D</SheetDescription></SheetHeader><SheetFooter><SheetClose>Done</SheetClose></SheetFooter></SheetContent></Sheet><Sheet open><SheetContent showCloseButton={false}><SheetTitle>Plain</SheetTitle></SheetContent></Sheet><Sheet><SheetTrigger>Open</SheetTrigger></Sheet></>`,
      },
      svelte: {
        imports: `import * as Sheet from "$UI$/sheet/index.js";`,
        markup: `<Sheet.Root open><Sheet.Content side="left" class="w-96" portalProps={{ disabled: true }}><Sheet.Header><Sheet.Title>T</Sheet.Title><Sheet.Description>D</Sheet.Description></Sheet.Header><Sheet.Footer><Sheet.Close>Done</Sheet.Close></Sheet.Footer></Sheet.Content></Sheet.Root><Sheet.Root open><Sheet.Content showCloseButton={false} portalProps={{ disabled: true }}><Sheet.Title>Plain</Sheet.Title></Sheet.Content></Sheet.Root><Sheet.Root><Sheet.Trigger>Open</Sheet.Trigger></Sheet.Root>`,
      },
    },
    // Layout and composition, beyond the everyday set.
    {
      name: "aspect-ratio",
      react: { imports: `import { AspectRatio } from "@/components/ui/aspect-ratio";`, jsx: `<AspectRatio ratio={16 / 9} className="rounded-lg"><img src="/a.png" alt="" /></AspectRatio>` },
      svelte: { imports: `import { AspectRatio } from "$UI$/aspect-ratio/index.js";`, markup: `<AspectRatio ratio={16 / 9} class="rounded-lg"><img src="/a.png" alt="" /></AspectRatio>` },
    },
    {
      name: "button-group",
      react: {
        imports: `import { Button } from "@/components/ui/button";\nimport { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/components/ui/button-group";`,
        jsx: `<><ButtonGroup aria-label="Actions"><Button variant="outline">Reply</Button><ButtonGroupSeparator /><ButtonGroupText>Text</ButtonGroupText><ButtonGroupText asChild><label>Label</label></ButtonGroupText></ButtonGroup><ButtonGroup orientation="vertical" className="w-40"><Button>A</Button><ButtonGroupSeparator orientation="horizontal" /><Button>B</Button></ButtonGroup></>`,
      },
      svelte: {
        imports: `import { Button } from "$UI$/button/index.js";\n  import * as ButtonGroup from "$UI$/button-group/index.js";`,
        markup: `<ButtonGroup.Root aria-label="Actions"><Button variant="outline">Reply</Button><ButtonGroup.Separator /><ButtonGroup.Text>Text</ButtonGroup.Text><ButtonGroup.Text>{#snippet child({ props })}<label {...props}>Label</label>{/snippet}</ButtonGroup.Text></ButtonGroup.Root><ButtonGroup.Root orientation="vertical" class="w-40"><Button>A</Button><ButtonGroup.Separator orientation="horizontal" /><Button>B</Button></ButtonGroup.Root>`,
      },
    },
    {
      name: "empty",
      react: {
        imports: `import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";`,
        jsx: `<><Empty className="border"><EmptyHeader><EmptyMedia variant="icon">!</EmptyMedia><EmptyTitle>No projects</EmptyTitle><EmptyDescription>Create one.</EmptyDescription></EmptyHeader><EmptyContent>Act</EmptyContent></Empty><EmptyMedia className="size-3">!</EmptyMedia></>`,
      },
      svelte: {
        imports: `import * as Empty from "$UI$/empty/index.js";`,
        markup: `<Empty.Root class="border"><Empty.Header><Empty.Media variant="icon">!</Empty.Media><Empty.Title>No projects</Empty.Title><Empty.Description>Create one.</Empty.Description></Empty.Header><Empty.Content>Act</Empty.Content></Empty.Root><Empty.Media class="size-3">!</Empty.Media>`,
      },
    },
    {
      name: "item",
      react: {
        imports: `import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle } from "@/components/ui/item";`,
        jsx: `<ItemGroup><Item variant="outline" size="sm"><ItemMedia variant="icon">i</ItemMedia><ItemContent><ItemTitle>Title</ItemTitle><ItemDescription>Text</ItemDescription></ItemContent><ItemActions>Go</ItemActions></Item><ItemSeparator /><Item variant="default" asChild><a href="/">Link</a></Item><Item size="default" className="mt-2"><ItemMedia variant="image"><img src="/a.png" alt="" /></ItemMedia><ItemHeader>Header</ItemHeader><ItemFooter>Footer</ItemFooter></Item></ItemGroup>`,
      },
      svelte: {
        imports: `import * as Item from "$UI$/item/index.js";`,
        markup: `<Item.Group><Item.Root variant="outline" size="sm"><Item.Media variant="icon">i</Item.Media><Item.Content><Item.Title>Title</Item.Title><Item.Description>Text</Item.Description></Item.Content><Item.Actions>Go</Item.Actions></Item.Root><Item.Separator /><Item.Root variant="default">{#snippet child({ props })}<a {...props} href="/">Link</a>{/snippet}</Item.Root><Item.Root size="default" class="mt-2"><Item.Media variant="image"><img src="/a.png" alt="" /></Item.Media><Item.Header>Header</Item.Header><Item.Footer>Footer</Item.Footer></Item.Root></Item.Group>`,
      },
    },
    {
      name: "input-group",
      react: {
        imports: `import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group";`,
        jsx: `<><InputGroup className="w-80"><InputGroupInput placeholder="example" aria-invalid /><InputGroupAddon><InputGroupText>https://</InputGroupText></InputGroupAddon><InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs">x</InputGroupButton></InputGroupAddon><InputGroupAddon align="block-end"><InputGroupButton className="ms-2">Send</InputGroupButton></InputGroupAddon></InputGroup><InputGroup><InputGroupTextarea placeholder="Say" /><InputGroupAddon align="block-start">Title</InputGroupAddon></InputGroup></>`,
      },
      svelte: {
        imports: `import * as InputGroup from "$UI$/input-group/index.js";`,
        markup: `<InputGroup.Root class="w-80"><InputGroup.Input placeholder="example" aria-invalid="true" /><InputGroup.Addon><InputGroup.Text>https://</InputGroup.Text></InputGroup.Addon><InputGroup.Addon align="inline-end"><InputGroup.Button size="icon-xs">x</InputGroup.Button></InputGroup.Addon><InputGroup.Addon align="block-end"><InputGroup.Button class="ms-2">Send</InputGroup.Button></InputGroup.Addon></InputGroup.Root><InputGroup.Root><InputGroup.Textarea placeholder="Say" /><InputGroup.Addon align="block-start">Title</InputGroup.Addon></InputGroup.Root>`,
      },
    },
    {
      name: "input-otp",
      react: {
        imports: `import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";`,
        jsx: `<><InputOTP maxLength={6}><InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} className="rounded-none" /></InputOTPGroup><InputOTPSeparator /><InputOTPGroup><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup></InputOTP><InputOTP maxLength={4} disabled containerClassName="gap-4"><InputOTPGroup><InputOTPSlot index={0} /></InputOTPGroup></InputOTP></>`,
      },
      svelte: {
        imports: `import * as InputOTP from "$UI$/input-otp/index.js";`,
        markup: `<InputOTP.Root maxlength={6}>{#snippet children({ cells })}<InputOTP.Group>{#each cells.slice(0, 3) as cell, i (cell)}<InputOTP.Slot {cell} class={i === 2 ? "rounded-none" : undefined} />{/each}</InputOTP.Group><InputOTP.Separator /><InputOTP.Group>{#each cells.slice(3, 6) as cell (cell)}<InputOTP.Slot {cell} />{/each}</InputOTP.Group>{/snippet}</InputOTP.Root><InputOTP.Root maxlength={4} disabled class="gap-4">{#snippet children({ cells })}<InputOTP.Group><InputOTP.Slot cell={cells[0]!} /></InputOTP.Group>{/snippet}</InputOTP.Root>`,
      },
    },
    {
      name: "scroll-area",
      react: { imports: `import { ScrollArea } from "@/components/ui/scroll-area";`, jsx: `<ScrollArea className="h-40"><div>Long</div></ScrollArea>` },
      svelte: { imports: `import { ScrollArea } from "$UI$/scroll-area/index.js";`, markup: `<ScrollArea class="h-40"><div>Long</div></ScrollArea>` },
    },
    {
      name: "resizable",
      react: {
        imports: `import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";`,
        jsx: `<><ResizablePanelGroup orientation="horizontal" className="min-h-48"><ResizablePanel defaultSize="50">A</ResizablePanel><ResizableHandle withHandle /><ResizablePanel defaultSize="50">B</ResizablePanel></ResizablePanelGroup><ResizablePanelGroup orientation="vertical"><ResizablePanel defaultSize="30">A</ResizablePanel><ResizableHandle className="bg-transparent" /><ResizablePanel defaultSize="70">B</ResizablePanel></ResizablePanelGroup></>`,
      },
      svelte: {
        imports: `import * as Resizable from "$UI$/resizable/index.js";`,
        markup: `<Resizable.PaneGroup direction="horizontal" class="min-h-48"><Resizable.Pane defaultSize={50}>A</Resizable.Pane><Resizable.Handle withHandle /><Resizable.Pane defaultSize={50}>B</Resizable.Pane></Resizable.PaneGroup><Resizable.PaneGroup direction="vertical"><Resizable.Pane defaultSize={30}>A</Resizable.Pane><Resizable.Handle class="bg-transparent" /><Resizable.Pane defaultSize={70}>B</Resizable.Pane></Resizable.PaneGroup>`,
      },
    },
    {
      name: "sidebar",
      react: {
        imports: `import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger } from "@/components/ui/sidebar";`,
        jsx: `<>
  <SidebarProvider>
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader><SidebarInput placeholder="Search" /></SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupAction title="Add">+</SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive tooltip="Home"><span>Home</span></SidebarMenuButton>
                <SidebarMenuAction showOnHover>…</SidebarMenuAction>
                <SidebarMenuBadge>3</SidebarMenuBadge>
                <SidebarMenuSub>
                  <SidebarMenuSubItem><SidebarMenuSubButton href="/a" isActive>A</SidebarMenuSubButton></SidebarMenuSubItem>
                  <SidebarMenuSubItem><SidebarMenuSubButton href="/b" size="sm">B</SidebarMenuSubButton></SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton size="lg" variant="outline">Big</SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton asChild size="sm"><a href="/x">Link</a></SidebarMenuButton></SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
      </SidebarContent>
      <SidebarFooter>Footer</SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <SidebarInset><SidebarTrigger className="-ms-1" /></SidebarInset>
  </SidebarProvider>
  <SidebarProvider defaultOpen={false} className="min-h-0"><Sidebar variant="floating" side="right" className="w-60"><SidebarContent>Nav</SidebarContent></Sidebar><SidebarInset>Page</SidebarInset></SidebarProvider>
  <SidebarProvider><Sidebar collapsible="none"><SidebarMenu><SidebarMenuItem><SidebarMenuSkeleton /></SidebarMenuItem></SidebarMenu></Sidebar></SidebarProvider>
</>`,
      },
      svelte: {
        imports: `import * as Sidebar from "$UI$/sidebar/index.js";`,
        markup: `<Sidebar.Provider>
  <Sidebar.Root collapsible="icon" variant="inset">
    <Sidebar.Header><Sidebar.Input placeholder="Search" /></Sidebar.Header>
    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
        <Sidebar.GroupAction title="Add">+</Sidebar.GroupAction>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Sidebar.MenuItem>
              <Sidebar.MenuButton isActive tooltipContent="Home"><span>Home</span></Sidebar.MenuButton>
              <Sidebar.MenuAction showOnHover>…</Sidebar.MenuAction>
              <Sidebar.MenuBadge>3</Sidebar.MenuBadge>
              <Sidebar.MenuSub>
                <Sidebar.MenuSubItem><Sidebar.MenuSubButton href="/a" isActive>A</Sidebar.MenuSubButton></Sidebar.MenuSubItem>
                <Sidebar.MenuSubItem><Sidebar.MenuSubButton href="/b" size="sm">B</Sidebar.MenuSubButton></Sidebar.MenuSubItem>
              </Sidebar.MenuSub>
            </Sidebar.MenuItem>
            <Sidebar.MenuItem><Sidebar.MenuButton size="lg" variant="outline">Big</Sidebar.MenuButton></Sidebar.MenuItem>
            <Sidebar.MenuItem><Sidebar.MenuButton size="sm">{#snippet child({ props })}<a {...props} href="/x">Link</a>{/snippet}</Sidebar.MenuButton></Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
      <Sidebar.Separator />
    </Sidebar.Content>
    <Sidebar.Footer>Footer</Sidebar.Footer>
    <Sidebar.Rail />
  </Sidebar.Root>
  <Sidebar.Inset><Sidebar.Trigger class="-ms-1" /></Sidebar.Inset>
</Sidebar.Provider>
<Sidebar.Provider open={false} class="min-h-0"><Sidebar.Root variant="floating" side="right" class="w-60"><Sidebar.Content>Nav</Sidebar.Content></Sidebar.Root><Sidebar.Inset>Page</Sidebar.Inset></Sidebar.Provider>
<Sidebar.Provider><Sidebar.Root collapsible="none"><Sidebar.Menu><Sidebar.MenuItem><Sidebar.MenuSkeleton /></Sidebar.MenuItem></Sidebar.Menu></Sidebar.Root></Sidebar.Provider>`,
      },
    },
    {
      name: "carousel",
      react: {
        imports: `import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";`,
        jsx: `<><Carousel className="w-60" aria-label="Numbers"><CarouselContent className="h-40"><CarouselItem>1</CarouselItem><CarouselItem className="basis-1/2">2</CarouselItem></CarouselContent><CarouselPrevious /><CarouselNext variant="ghost" /></Carousel><Carousel orientation="vertical"><CarouselContent><CarouselItem>1</CarouselItem></CarouselContent><CarouselPrevious className="size-6" /><CarouselNext /></Carousel></>`,
      },
      svelte: {
        imports: `import * as Carousel from "$UI$/carousel/index.js";`,
        markup: `<Carousel.Root class="w-60" aria-label="Numbers"><Carousel.Content class="h-40"><Carousel.Item>1</Carousel.Item><Carousel.Item class="basis-1/2">2</Carousel.Item></Carousel.Content><Carousel.Previous /><Carousel.Next variant="ghost" /></Carousel.Root><Carousel.Root orientation="vertical"><Carousel.Content><Carousel.Item>1</Carousel.Item></Carousel.Content><Carousel.Previous class="size-6" /><Carousel.Next /></Carousel.Root>`,
      },
    },
    ...chatCases(system),
    ...dataTableCases(),
    ...longTailCases(),
    {
      name: "date-picker",
      react: {
        imports: `import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";`,
        jsx: `<><DatePicker className="w-80" /><DatePicker value={new Date(2026, 8, 15)} /><DateRangePicker value={{ from: new Date(2026, 8, 15), to: new Date(2026, 8, 18) }} /><DateRangePicker placeholder="When?" /></>`,
      },
      svelte: {
        imports: `import { parseDate } from "@internationalized/date";\n  import { DatePicker, DateRangePicker } from "$UI$/date-picker/index.js";`,
        markup: `<DatePicker class="w-80" /><DatePicker value={parseDate("2026-09-15")} /><DateRangePicker value={{ start: parseDate("2026-09-15"), end: parseDate("2026-09-18") }} /><DateRangePicker placeholder="When?" />`,
      },
    },
  ];
}

// A data table with a filter, selectable rows and two pages; and one with nothing in it.
function dataTableCases(): DomCase[] {
  const columns = JSON.stringify([
    { accessorKey: "email", header: "Email" },
    { accessorKey: "amount", header: "Amount" },
  ]);
  const data = JSON.stringify([
    { email: "ada@example.com", amount: 316 },
    { email: "ken@example.com", amount: 242 },
    { email: "abe@example.com", amount: 837 },
  ]);
  return [
    {
      name: "data-table",
      react: {
        imports: `import { DataTable } from "@/components/ui/data-table";`,
        jsx: `<><DataTable label="People" columns={${columns}} data={${data}} filterColumn="email" filterPlaceholder="Filter emails" selectable pageSize={2} className="w-80" /><DataTable label="Nothing" columns={[{ accessorKey: "name", header: "Name" }]} data={[]} empty="Nobody yet." /></>`,
      },
      svelte: {
        imports: `import { DataTable } from "$UI$/data-table/index.js";`,
        markup: `<DataTable label="People" columns={${columns}} data={${data}} filterColumn="email" filterPlaceholder="Filter emails" selectable pageSize={2} class="w-80" /><DataTable label="Nothing" columns={[{ accessorKey: "name", header: "Name" }]} data={[]} empty="Nobody yet." />`,
      },
    },
  ];
}

// The chat set: message, bubble (every variant and intent, and the shadcn names), attachment, marker.
function chatCases(system: DesignSystem): DomCase[] {
  const enabled = (name: string, axis: "variant" | "intent" | "size") => system.components[name]?.axes[axis]?.enabled ?? [];
  const bubbles = JSON.stringify(selections({ variant: [undefined, ...enabled("bubble", "variant"), "default", "secondary", "destructive"], intent: [undefined, ...enabled("bubble", "intent")] }));
  const sizes = JSON.stringify([undefined, "default", ...enabled("attachment", "size")].map((size) => (size === undefined ? {} : { size })));
  return [
    {
      name: "message",
      react: {
        imports: `import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "@/components/ui/message";`,
        jsx: `<MessageGroup className="gap-6"><Message><MessageAvatar>AL</MessageAvatar><MessageContent><MessageHeader>Ada</MessageHeader>Hi<MessageFooter>9:41</MessageFooter></MessageContent></Message><Message align="end" className="px-2"><MessageContent className="gap-2">Hello</MessageContent></Message></MessageGroup>`,
      },
      svelte: {
        imports: `import * as Message from "$UI$/message/index.js";`,
        markup: `<Message.Group class="gap-6"><Message.Root><Message.Avatar>AL</Message.Avatar><Message.Content><Message.Header>Ada</Message.Header>Hi<Message.Footer>9:41</Message.Footer></Message.Content></Message.Root><Message.Root align="end" class="px-2"><Message.Content class="gap-2">Hello</Message.Content></Message.Root></Message.Group>`,
      },
    },
    {
      name: "bubble",
      react: {
        imports: `import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "@/components/ui/bubble";`,
        jsx: `<BubbleGroup>{${bubbles}.map((p: Record<string, string>, i: number) => <Bubble key={i} {...(p as object)}><BubbleContent>Hi</BubbleContent></Bubble>)}<Bubble align="end" className="mt-2"><BubbleContent className="px-4">Yo</BubbleContent><BubbleReactions side="top" align="start">1</BubbleReactions><BubbleReactions>2</BubbleReactions></Bubble><Bubble variant="ghost"><BubbleContent asChild><a href="#x">Open</a></BubbleContent></Bubble></BubbleGroup>`,
      },
      svelte: {
        imports: `import * as Bubble from "$UI$/bubble/index.js";\n  const cases: Record<string, string>[] = ${bubbles};`,
        markup: `<Bubble.Group>{#each cases as p}<Bubble.Root {...p}><Bubble.Content>Hi</Bubble.Content></Bubble.Root>{/each}<Bubble.Root align="end" class="mt-2"><Bubble.Content class="px-4">Yo</Bubble.Content><Bubble.Reactions side="top" align="start">1</Bubble.Reactions><Bubble.Reactions>2</Bubble.Reactions></Bubble.Root><Bubble.Root variant="ghost"><Bubble.Content>{#snippet child({ props })}<a {...props} href="#x">Open</a>{/snippet}</Bubble.Content></Bubble.Root></Bubble.Group>`,
      },
    },
    {
      name: "attachment",
      react: {
        imports: `import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentGroup, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from "@/components/ui/attachment";`,
        jsx: `<AttachmentGroup>{${sizes}.map((p: Record<string, string>, i: number) => <Attachment key={i} {...(p as object)}><AttachmentMedia>F</AttachmentMedia><AttachmentContent><AttachmentTitle>brief.pdf</AttachmentTitle><AttachmentDescription>1.2 MB</AttachmentDescription></AttachmentContent><AttachmentActions><AttachmentAction aria-label="Remove">x</AttachmentAction></AttachmentActions><AttachmentTrigger /></Attachment>)}<Attachment state="error" orientation="vertical" className="w-40"><AttachmentMedia variant="image"><img alt="" /></AttachmentMedia></Attachment><Attachment state="uploading"><AttachmentTrigger asChild><a href="#x">Open</a></AttachmentTrigger></Attachment></AttachmentGroup>`,
      },
      svelte: {
        imports: `import * as Attachment from "$UI$/attachment/index.js";\n  const cases: Record<string, string>[] = ${sizes};`,
        markup: `<Attachment.Group>{#each cases as p}<Attachment.Root {...p}><Attachment.Media>F</Attachment.Media><Attachment.Content><Attachment.Title>brief.pdf</Attachment.Title><Attachment.Description>1.2 MB</Attachment.Description></Attachment.Content><Attachment.Actions><Attachment.Action aria-label="Remove">x</Attachment.Action></Attachment.Actions><Attachment.Trigger /></Attachment.Root>{/each}<Attachment.Root state="error" orientation="vertical" class="w-40"><Attachment.Media variant="image"><img alt="" /></Attachment.Media></Attachment.Root><Attachment.Root state="uploading"><Attachment.Trigger>{#snippet child({ props })}<a {...props} href="#x">Open</a>{/snippet}</Attachment.Trigger></Attachment.Root></Attachment.Group>`,
      },
    },
    {
      name: "marker",
      react: {
        imports: `import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";`,
        jsx: `<><Marker><MarkerIcon>*</MarkerIcon><MarkerContent>Today</MarkerContent></Marker><Marker variant="separator"><MarkerContent>Today</MarkerContent></Marker><Marker variant="border" className="mt-2"><MarkerContent className="text-2">Joined</MarkerContent></Marker><Marker asChild><a href="#x">Link</a></Marker></>`,
      },
      svelte: {
        imports: `import * as Marker from "$UI$/marker/index.js";`,
        markup: `<Marker.Root><Marker.Icon>*</Marker.Icon><Marker.Content>Today</Marker.Content></Marker.Root><Marker.Root variant="separator"><Marker.Content>Today</Marker.Content></Marker.Root><Marker.Root variant="border" class="mt-2"><Marker.Content class="text-2">Joined</Marker.Content></Marker.Root><Marker.Root>{#snippet child({ props })}<a {...props} href="#x">Link</a>{/snippet}</Marker.Root>`,
      },
    },
    // Menus, overlays, pickers. (A context menu opens only from a right-click, so its area is
    // compared closed; toasts open from toast.add, which the server doesn't render in React's.)
    {
      name: "context-menu",
      react: {
        imports: `import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";`,
        jsx: `<ContextMenu><ContextMenuTrigger className="h-32">Right-click</ContextMenuTrigger><ContextMenuContent><ContextMenuItem>Back</ContextMenuItem></ContextMenuContent></ContextMenu>`,
      },
      svelte: {
        imports: `import * as ContextMenu from "$UI$/context-menu/index.js";`,
        markup: `<ContextMenu.Root><ContextMenu.Trigger class="h-32">Right-click</ContextMenu.Trigger><ContextMenu.Content portalProps={{ disabled: true }}><ContextMenu.Item>Back</ContextMenu.Item></ContextMenu.Content></ContextMenu.Root>`,
      },
    },
    {
      name: "menubar",
      react: {
        imports: `import { Menubar, MenubarCheckboxItem, MenubarContent, MenubarGroup, MenubarItem, MenubarLabel, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubTrigger, MenubarTrigger } from "@/components/ui/menubar";`,
        jsx: `<Menubar value="file" className="w-80"><MenubarMenu value="file"><MenubarTrigger>File</MenubarTrigger><MenubarContent className="w-56">
  <MenubarLabel inset>Tabs</MenubarLabel>
  <MenubarGroup><MenubarItem>New tab<MenubarShortcut>⌘T</MenubarShortcut></MenubarItem><MenubarItem variant="destructive" disabled>Close</MenubarItem></MenubarGroup>
  <MenubarSeparator />
  <MenubarCheckboxItem checked>Bookmarks</MenubarCheckboxItem>
  <MenubarRadioGroup value="ada"><MenubarRadioItem value="ada">Ada</MenubarRadioItem><MenubarRadioItem value="bo">Bo</MenubarRadioItem></MenubarRadioGroup>
  <MenubarSub><MenubarSubTrigger inset>Share</MenubarSubTrigger></MenubarSub>
</MenubarContent></MenubarMenu><MenubarMenu value="edit"><MenubarTrigger className="px-4">Edit</MenubarTrigger></MenubarMenu></Menubar>`,
      },
      svelte: {
        imports: `import * as Menubar from "$UI$/menubar/index.js";`,
        markup: `<Menubar.Root value="file" class="w-80"><Menubar.Menu value="file"><Menubar.Trigger>File</Menubar.Trigger><Menubar.Content class="w-56" portalProps={{ disabled: true }}>
  <Menubar.Label inset>Tabs</Menubar.Label>
  <Menubar.Group><Menubar.Item>New tab<Menubar.Shortcut>⌘T</Menubar.Shortcut></Menubar.Item><Menubar.Item variant="destructive" disabled>Close</Menubar.Item></Menubar.Group>
  <Menubar.Separator />
  <Menubar.CheckboxItem checked>Bookmarks</Menubar.CheckboxItem>
  <Menubar.RadioGroup value="ada"><Menubar.RadioItem value="ada">Ada</Menubar.RadioItem><Menubar.RadioItem value="bo">Bo</Menubar.RadioItem></Menubar.RadioGroup>
  <Menubar.Sub><Menubar.SubTrigger inset>Share</Menubar.SubTrigger></Menubar.Sub>
</Menubar.Content></Menubar.Menu><Menubar.Menu value="edit"><Menubar.Trigger class="px-4">Edit</Menubar.Trigger></Menubar.Menu></Menubar.Root>`,
      },
    },
    {
      name: "hover-card",
      react: {
        imports: `import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";`,
        jsx: `<><HoverCard open><HoverCardTrigger href="#ada">@ada</HoverCardTrigger><HoverCardContent className="w-80">Ada Lovelace</HoverCardContent></HoverCard><HoverCard><HoverCardTrigger href="#bo">@bo</HoverCardTrigger></HoverCard></>`,
      },
      svelte: {
        imports: `import * as HoverCard from "$UI$/hover-card/index.js";`,
        markup: `<HoverCard.Root open><HoverCard.Trigger href="#ada">@ada</HoverCard.Trigger><HoverCard.Content class="w-80" portalProps={{ disabled: true }}>Ada Lovelace</HoverCard.Content></HoverCard.Root><HoverCard.Root><HoverCard.Trigger href="#bo">@bo</HoverCard.Trigger></HoverCard.Root>`,
      },
    },
    {
      name: "drawer",
      react: {
        imports: `import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";`,
        // Vaul (React) reads the document while an open drawer renders, so the server renders it
        // closed; its parts' classes are held by the static comparison.
        jsx: `<Drawer><DrawerTrigger>Open</DrawerTrigger></Drawer>`,
      },
      svelte: {
        imports: `import * as Drawer from "$UI$/drawer/index.js";`,
        markup: `<Drawer.Root><Drawer.Trigger>Open</Drawer.Trigger></Drawer.Root>`,
      },
    },
    {
      name: "command",
      react: {
        imports: `import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";`,
        jsx: `<Command className="rounded-lg border"><CommandInput placeholder="Search" /><CommandList aria-label="Commands"><CommandEmpty>No results.</CommandEmpty><CommandGroup heading="Suggestions"><CommandItem>Calendar<CommandShortcut>⌘C</CommandShortcut></CommandItem><CommandItem disabled className="font-bold">Search</CommandItem></CommandGroup><CommandSeparator /><CommandGroup heading="Settings" className="p-2"><CommandItem>Profile</CommandItem></CommandGroup></CommandList></Command>`,
      },
      svelte: {
        imports: `import * as Command from "$UI$/command/index.js";`,
        markup: `<Command.Root class="rounded-lg border"><Command.Input placeholder="Search" /><Command.List aria-label="Commands"><Command.Empty>No results.</Command.Empty><Command.Group heading="Suggestions"><Command.Item>Calendar<Command.Shortcut>⌘C</Command.Shortcut></Command.Item><Command.Item disabled class="font-bold">Search</Command.Item></Command.Group><Command.Separator /><Command.Group heading="Settings" class="p-2"><Command.Item>Profile</Command.Item></Command.Group></Command.List></Command.Root>`,
      },
    },
    {
      name: "combobox",
      react: {
        imports: `import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxLabel, ComboboxList, ComboboxSeparator } from "@/components/ui/combobox";`,
        // Base UI renders its list only in its portal, which the server doesn't: the field is
        // compared here, the list's parts by the static comparison.
        jsx: `<><Combobox defaultValue="Nuxt"><ComboboxInput aria-label="Framework" showClear /></Combobox><Combobox><ComboboxInput aria-label="Framework" showTrigger={false} className="w-60" /></Combobox></>`,
      },
      svelte: {
        imports: `import * as Combobox from "$UI$/combobox/index.js";`,
        markup: `<Combobox.Root type="single" value="Nuxt"><Combobox.Input aria-label="Framework" showClear /></Combobox.Root><Combobox.Root type="single"><Combobox.Input aria-label="Framework" showTrigger={false} class="w-60" /></Combobox.Root>`,
      },
    },
    {
      name: "navigation-menu",
      react: {
        imports: `import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";`,
        jsx: `<><NavigationMenu><NavigationMenuList><NavigationMenuItem value="start"><NavigationMenuTrigger>Getting started</NavigationMenuTrigger><NavigationMenuContent><NavigationMenuLink href="/docs">Introduction</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem><NavigationMenuItem value="docs" className="ms-2"><NavigationMenuLink href="/docs" active>Docs</NavigationMenuLink></NavigationMenuItem></NavigationMenuList></NavigationMenu><NavigationMenu viewport={false} className="w-80"><NavigationMenuList><NavigationMenuItem><NavigationMenuLink href="/">Home</NavigationMenuLink></NavigationMenuItem></NavigationMenuList></NavigationMenu></>`,
      },
      svelte: {
        imports: `import * as NavigationMenu from "$UI$/navigation-menu/index.js";`,
        markup: `<NavigationMenu.Root><NavigationMenu.List><NavigationMenu.Item value="start"><NavigationMenu.Trigger>Getting started</NavigationMenu.Trigger><NavigationMenu.Content><NavigationMenu.Link href="/docs">Introduction</NavigationMenu.Link></NavigationMenu.Content></NavigationMenu.Item><NavigationMenu.Item value="docs" class="ms-2"><NavigationMenu.Link href="/docs" active>Docs</NavigationMenu.Link></NavigationMenu.Item></NavigationMenu.List></NavigationMenu.Root><NavigationMenu.Root viewport={false} class="w-80"><NavigationMenu.List><NavigationMenu.Item><NavigationMenu.Link href="/">Home</NavigationMenu.Link></NavigationMenu.Item></NavigationMenu.List></NavigationMenu.Root>`,
      },
    },
  ];
}

// The long tail: a chart's container (an id, so both name it alike; its plot is its library's), a
// conversation's scrolling parts, and a questionnaire as a page first renders it.
function longTailCases(): DomCase[] {
  const config = `{ desktop: { label: "Desktop", color: "var(--chart-1)" } }`;
  const items = `[{ name: "tone", required: true, choices: [{ value: "warm" }, { value: "plain", disabled: true }] }, { name: "name" }]`;
  return [
    {
      name: "chart",
      react: {
        imports: `import { ChartContainer } from "@/components/ui/chart";`,
        jsx: `<ChartContainer id="sales" className="h-40" config={${config}}><div>plot</div></ChartContainer>`,
      },
      svelte: {
        imports: `import * as Chart from "$UI$/chart/index.js";`,
        markup: `<Chart.Container id="sales" class="h-40" config={${config}}><div>plot</div></Chart.Container>`,
      },
    },
    {
      name: "message-scroller",
      react: {
        imports: `import { MessageScroller, MessageScrollerButton, MessageScrollerContent, MessageScrollerItem, MessageScrollerProvider, MessageScrollerViewport } from "@/components/ui/message-scroller";`,
        jsx: `<><MessageScrollerProvider><MessageScroller className="h-40"><MessageScrollerViewport aria-label="Chat"><MessageScrollerContent className="p-4"><MessageScrollerItem>a</MessageScrollerItem><MessageScrollerItem messageId="b" scrollAnchor className="px-2">b</MessageScrollerItem></MessageScrollerContent></MessageScrollerViewport><MessageScrollerButton /><MessageScrollerButton direction="start" variant="ghost" className="size-6" /></MessageScroller></MessageScrollerProvider><MessageScrollerProvider defaultScrollPosition="start"><MessageScroller><MessageScrollerViewport><MessageScrollerContent /></MessageScrollerViewport></MessageScroller></MessageScrollerProvider></>`,
      },
      svelte: {
        imports: `import * as MessageScroller from "$UI$/message-scroller/index.js";`,
        markup: `<MessageScroller.Provider><MessageScroller.Root class="h-40"><MessageScroller.Viewport aria-label="Chat"><MessageScroller.Content class="p-4"><MessageScroller.Item>a</MessageScroller.Item><MessageScroller.Item messageId="b" scrollAnchor class="px-2">b</MessageScroller.Item></MessageScroller.Content></MessageScroller.Viewport><MessageScroller.Button /><MessageScroller.Button direction="start" variant="ghost" class="size-6" /></MessageScroller.Root></MessageScroller.Provider><MessageScroller.Provider defaultScrollPosition="start"><MessageScroller.Root><MessageScroller.Viewport><MessageScroller.Content /></MessageScroller.Viewport></MessageScroller.Root></MessageScroller.Provider>`,
      },
    },
    {
      name: "questionnaire",
      react: {
        imports: `import { Questionnaire, QuestionnaireActions, QuestionnaireChoice, QuestionnaireChoiceDescription, QuestionnaireChoices, QuestionnaireDescription, QuestionnaireError, QuestionnaireInput, QuestionnaireItem, QuestionnaireNext, QuestionnairePrevious, QuestionnaireProgress, QuestionnaireSkip, QuestionnaireSubmit, QuestionnaireTitle } from "@/components/ui/questionnaire";`,
        jsx: `<><Questionnaire items={${items}} defaultItem="tone" shortcuts="letters" className="w-80"><QuestionnaireProgress /><QuestionnaireItem name="tone" required><QuestionnaireTitle>How should it sound?</QuestionnaireTitle><QuestionnaireDescription>Pick one.</QuestionnaireDescription><QuestionnaireChoices><QuestionnaireChoice value="warm">Warm<QuestionnaireChoiceDescription>Friendly</QuestionnaireChoiceDescription></QuestionnaireChoice><QuestionnaireChoice value="plain" disabled className="mt-2">Plain</QuestionnaireChoice></QuestionnaireChoices><QuestionnaireError /></QuestionnaireItem><QuestionnaireItem name="name"><QuestionnaireTitle>Your name</QuestionnaireTitle><QuestionnaireInput placeholder="Ada" /><QuestionnaireError className="text-2">Say who you are.</QuestionnaireError></QuestionnaireItem><QuestionnaireActions><QuestionnairePrevious /><QuestionnaireSkip /><QuestionnaireNext /><QuestionnaireSubmit variant="outline">Send</QuestionnaireSubmit></QuestionnaireActions></Questionnaire><Questionnaire><QuestionnaireProgress>Step</QuestionnaireProgress><QuestionnaireItem name="topics" multiple><QuestionnaireTitle>Topics</QuestionnaireTitle><QuestionnaireChoices><QuestionnaireChoice value="a" defaultChecked>A</QuestionnaireChoice><QuestionnaireChoice value="b">B</QuestionnaireChoice></QuestionnaireChoices></QuestionnaireItem><QuestionnaireActions><QuestionnaireSkip /><QuestionnaireSubmit /></QuestionnaireActions></Questionnaire></>`,
      },
      svelte: {
        imports: `import * as Questionnaire from "$UI$/questionnaire/index.js";`,
        markup: `<Questionnaire.Root items={${items}} defaultItem="tone" shortcuts="letters" class="w-80"><Questionnaire.Progress /><Questionnaire.Item name="tone" required><Questionnaire.Title>How should it sound?</Questionnaire.Title><Questionnaire.Description>Pick one.</Questionnaire.Description><Questionnaire.Choices><Questionnaire.Choice value="warm">Warm<Questionnaire.ChoiceDescription>Friendly</Questionnaire.ChoiceDescription></Questionnaire.Choice><Questionnaire.Choice value="plain" disabled class="mt-2">Plain</Questionnaire.Choice></Questionnaire.Choices><Questionnaire.Error /></Questionnaire.Item><Questionnaire.Item name="name"><Questionnaire.Title>Your name</Questionnaire.Title><Questionnaire.Input placeholder="Ada" /><Questionnaire.Error class="text-2">Say who you are.</Questionnaire.Error></Questionnaire.Item><Questionnaire.Actions><Questionnaire.Previous /><Questionnaire.Skip /><Questionnaire.Next /><Questionnaire.Submit variant="outline">Send</Questionnaire.Submit></Questionnaire.Actions></Questionnaire.Root><Questionnaire.Root><Questionnaire.Progress>Step</Questionnaire.Progress><Questionnaire.Item name="topics" multiple><Questionnaire.Title>Topics</Questionnaire.Title><Questionnaire.Choices><Questionnaire.Choice value="a" defaultChecked>A</Questionnaire.Choice><Questionnaire.Choice value="b">B</Questionnaire.Choice></Questionnaire.Choices></Questionnaire.Item><Questionnaire.Actions><Questionnaire.Skip /><Questionnaire.Submit /></Questionnaire.Actions></Questionnaire.Root>`,
      },
    },
  ];
}
