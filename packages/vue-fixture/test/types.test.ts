import { PRESETS } from "@tesserai/core";
import { prefixFiles, renderAll } from "@tesserai/templates";
import { describe, expect, it } from "vitest";
import { vueTsc, writeGenerated, type GeneratedFile } from "../harness";
import { ICON_SYSTEMS, SYSTEMS } from "./systems";

// vue-tsc over the generated Vue code, with a page that uses it the way an app would: shadcn
// names and tesserai's axes, a link through as-child, v-model on the dialog. Strict TypeScript, and
// Vue's checks for unknown components, directives and events in templates.

const USAGE: GeneratedFile = {
  path: "pages/Usage.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";
import { Button, buttonVariants, type ButtonVariantProps } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const open = ref(false);
const size: ButtonVariantProps["size"] = "icon";
const linkClasses = buttonVariants({ variant: "outline", class: "w-full" });
</script>

<template>
  <Button>Save</Button>
  <Button variant="destructive" size="sm" @click="open = true">Delete</Button>
  <Button variant="soft" intent="danger" :size="size" class="mt-2" disabled>x</Button>
  <Button as-child variant="ghost"><a href="/docs">Docs</a></Button>
  <Button as="a" href="/docs">Docs</Button>
  <a :class="linkClasses" href="/">Home</a>
  <Dialog v-model:open="open">
    <DialogTrigger as-child><Button variant="outline">Invite</Button></DialogTrigger>
    <DialogContent class="max-w-lg" :show-close-button="false" @escape-key-down="open = false">
      <DialogHeader>
        <DialogTitle>Invite</DialogTitle>
        <DialogDescription>They'll get an email.</DialogDescription>
      </DialogHeader>
      <DialogFooter show-close-button>
        <DialogClose as-child><Button variant="ghost">Cancel</Button></DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
`,
};

// The rest of the everyday set, used as the shadcn-vue docs use it: v-model on every control,
// v-model:open on overlays, slots, emits, as-child links, and tesserai's axes where there are some.
const EVERYDAY: GeneratedFile = {
  path: "pages/Everyday.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertAction, AlertDescription, AlertTitle, alertVariants } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Popover, PopoverAnchor, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TypographyBlockquote, TypographyH1, TypographyInlineCode, TypographyList, TypographyMuted, TypographyP } from "@/components/ui/typography";

const name = ref("");
const bio = ref("");
const plan = ref("pro");
const fruit = ref<string>();
const accepted = ref<boolean | "indeterminate">("indeterminate");
const notify = ref(true);
const volume = ref([40]);
const range = ref<number[]>();
const tab = ref<string | number>("account");
const open = ref(false);
const sheet = ref(false);
const menuOpen = ref(false);
const bold = ref(false);
const align = ref<string | string[]>("left");
const showStatus = ref<boolean | "indeterminate">(true);
const position = ref("top");
const alertClasses = alertVariants({ variant: "outline", intent: "danger" });
const badgeClasses = badgeVariants({ variant: "outline", intent: "neutral", size: "md" });
</script>

<template>
  <Accordion type="single" collapsible default-value="a">
    <AccordionItem value="a">
      <AccordionTrigger>Is it accessible?</AccordionTrigger>
      <AccordionContent class="pb-2">Yes.</AccordionContent>
    </AccordionItem>
  </Accordion>
  <Alert variant="destructive">
    <AlertTitle>Heads up</AlertTitle>
    <AlertDescription>Something happened.</AlertDescription>
    <AlertAction><Button size="sm">Undo</Button></AlertAction>
  </Alert>
  <Alert variant="soft" intent="success" :class="alertClasses" />
  <AlertDialog v-model:open="open">
    <AlertDialogTrigger as-child><Button variant="outline">Delete</Button></AlertDialogTrigger>
    <AlertDialogContent size="sm" @escape-key-down="open = false">
      <AlertDialogHeader>
        <AlertDialogMedia>!</AlertDialogMedia>
        <AlertDialogTitle>Delete?</AlertDialogTitle>
        <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive" @click="open = false">Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  <AvatarGroup>
    <Avatar size="sm">
      <AvatarImage src="/a.png" alt="Ada" @loading-status-change="() => {}" />
      <AvatarFallback :delay-ms="200">AL</AvatarFallback>
      <AvatarBadge />
    </Avatar>
    <AvatarGroupCount>+3</AvatarGroupCount>
  </AvatarGroup>
  <Badge>New</Badge>
  <Badge variant="destructive" size="sm">3</Badge>
  <Badge as-child variant="outline"><a href="/">Link</a></Badge>
  <a :class="badgeClasses">Plain</a>
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem><BreadcrumbLink as-child><a href="/docs">Docs</a></BreadcrumbLink></BreadcrumbItem>
      <BreadcrumbSeparator>/</BreadcrumbSeparator>
      <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>
      <BreadcrumbItem><BreadcrumbPage>Card</BreadcrumbPage></BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
  <Card size="default" class="w-80">
    <CardHeader>
      <CardTitle>Title</CardTitle>
      <CardDescription>Description</CardDescription>
      <CardAction><Button size="sm">Act</Button></CardAction>
    </CardHeader>
    <CardContent>Body</CardContent>
    <CardFooter>Footer</CardFooter>
  </Card>
  <Checkbox id="terms" v-model="accepted" size="sm" />
  <Checkbox :default-value="true" disabled />
  <Collapsible v-model:open="sheet">
    <CollapsibleTrigger>Toggle</CollapsibleTrigger>
    <CollapsibleContent>Hidden</CollapsibleContent>
  </Collapsible>
  <DropdownMenu v-model:open="menuOpen">
    <DropdownMenuTrigger as-child><Button variant="outline">Open</Button></DropdownMenuTrigger>
    <DropdownMenuContent class="w-56" align="start">
      <DropdownMenuLabel inset>My account</DropdownMenuLabel>
      <DropdownMenuGroup>
        <DropdownMenuItem @select="menuOpen = false">Profile <DropdownMenuShortcut>⌘P</DropdownMenuShortcut></DropdownMenuItem>
        <DropdownMenuItem variant="destructive" disabled>Delete</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem v-model="showStatus">Status bar</DropdownMenuCheckboxItem>
      <DropdownMenuRadioGroup v-model="position">
        <DropdownMenuRadioItem value="top">Top</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
        <DropdownMenuSubContent><DropdownMenuItem>Email</DropdownMenuItem></DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
  <FieldSet>
    <FieldLegend variant="label">Profile</FieldLegend>
    <FieldGroup>
      <Field orientation="horizontal" data-invalid="true">
        <FieldLabel for="name">Name</FieldLabel>
        <FieldContent>
          <Input id="name" v-model="name" size="sm" placeholder="Ada" aria-invalid="true" @blur="() => {}" />
          <FieldDescription>Your name.</FieldDescription>
        </FieldContent>
        <FieldError :errors="[{ message: 'Required' }, 'Too short', undefined]" />
      </Field>
      <FieldSeparator>or</FieldSeparator>
      <FieldSeparator />
      <Field>
        <FieldTitle>Bio</FieldTitle>
        <Textarea v-model="bio" default-value="Hi" rows="3" />
        <FieldError>Needed</FieldError>
      </Field>
    </FieldGroup>
  </FieldSet>
  <KbdGroup><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup>
  <Label for="terms">Accept terms</Label>
  <NativeSelect v-model="fruit" size="sm" class="w-40" name="fruit" required @change="() => {}">
    <NativeSelectOption value="">Pick one</NativeSelectOption>
    <NativeSelectOptGroup label="Fruit">
      <NativeSelectOption value="apple">Apple</NativeSelectOption>
    </NativeSelectOptGroup>
  </NativeSelect>
  <Pagination>
    <PaginationContent>
      <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
      <PaginationItem><PaginationLink href="#" is-active>1</PaginationLink></PaginationItem>
      <PaginationItem><PaginationLink as-child><a href="#">2</a></PaginationLink></PaginationItem>
      <PaginationItem><PaginationEllipsis /></PaginationItem>
      <PaginationItem><PaginationNext href="#" text="Onward" /></PaginationItem>
    </PaginationContent>
  </Pagination>
  <Popover>
    <PopoverAnchor />
    <PopoverTrigger as-child><Button variant="outline">Details</Button></PopoverTrigger>
    <PopoverContent side="top" :side-offset="8" @open-auto-focus="(e) => e.preventDefault()">
      <PopoverHeader>
        <PopoverTitle>Dimensions</PopoverTitle>
        <PopoverDescription>Set them.</PopoverDescription>
      </PopoverHeader>
    </PopoverContent>
  </Popover>
  <Progress :model-value="60" class="w-1/2" />
  <RadioGroup v-model="plan" orientation="vertical">
    <RadioGroupItem id="free" value="free" size="sm" />
    <RadioGroupItem id="pro" value="pro" disabled />
  </RadioGroup>
  <Select v-model="fruit">
    <SelectTrigger size="sm" class="w-44"><SelectValue placeholder="Fruit" /></SelectTrigger>
    <SelectContent position="popper">
      <SelectGroup>
        <SelectLabel>Fruit</SelectLabel>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectSeparator />
        <SelectItem value="pear" disabled>Pear</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
  <Separator orientation="vertical" :decorative="false" />
  <Sheet v-model:open="sheet">
    <SheetTrigger as-child><Button>Open</Button></SheetTrigger>
    <SheetContent side="left" :show-close-button="false" class="w-96" @interact-outside="() => {}">
      <SheetHeader><SheetTitle>Edit</SheetTitle><SheetDescription>Change it.</SheetDescription></SheetHeader>
      <SheetFooter><SheetClose as-child><Button>Done</Button></SheetClose></SheetFooter>
    </SheetContent>
  </Sheet>
  <Skeleton class="h-4 w-40" />
  <Slider v-model="volume" :max="100" :step="1" aria-label="Volume" />
  <Slider v-model="range" orientation="vertical" disabled />
  <Spinner class="size-6" />
  <Switch v-model="notify" size="sm" @update:model-value="(v) => (notify = v)" />
  <Table class="mt-2">
    <TableCaption>Invoices</TableCaption>
    <TableHeader><TableRow><TableHead>Invoice</TableHead></TableRow></TableHeader>
    <TableBody><TableRow selected><TableCell>INV001</TableCell></TableRow></TableBody>
    <TableFooter><TableRow><TableCell>Total</TableCell></TableRow></TableFooter>
  </Table>
  <Tabs v-model="tab" orientation="vertical">
    <TabsList variant="default">
      <TabsTrigger value="account">Account</TabsTrigger>
      <TabsTrigger value="password" disabled>Password</TabsTrigger>
    </TabsList>
    <TabsContent value="account">Account</TabsContent>
  </Tabs>
  <Toggle v-model="bold" variant="default" size="sm" aria-label="Bold">B</Toggle>
  <ToggleGroup v-model="align" type="single" variant="outline" :spacing="0">
    <ToggleGroupItem value="left">L</ToggleGroupItem>
    <ToggleGroupItem value="right" size="lg">R</ToggleGroupItem>
  </ToggleGroup>
  <TooltipProvider :delay-duration="300">
    <Tooltip>
      <TooltipTrigger as-child><Button size="icon">?</Button></TooltipTrigger>
      <TooltipContent side="right">Help <Kbd>?</Kbd></TooltipContent>
    </Tooltip>
  </TooltipProvider>
  <TypographyH1>Title</TypographyH1>
  <TypographyP class="text-center">Body</TypographyP>
  <TypographyBlockquote>Quote</TypographyBlockquote>
  <TypographyList><li>One</li></TypographyList>
  <TypographyMuted>Muted <TypographyInlineCode>code</TypographyInlineCode></TypographyMuted>
</template>
`,
};

// The layout and composition components beyond the everyday set, used as shadcn-vue's docs use
// them: v-model on the code and the sidebar, as / as-child links, emits, slots.
const LAYOUT: GeneratedFile = {
  path: "pages/Layout.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants } from "@/components/ui/button-group";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { DirectionProvider, useDirection } from "@/components/ui/direction";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, emptyMediaVariants } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle, itemVariants } from "@/components/ui/item";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const code = ref("");
const url = ref("");
const api = ref<CarouselApi>();
const sidebarOpen = ref(true);
const direction = useDirection();
const classes = [buttonGroupVariants({ orientation: "vertical" }), emptyMediaVariants({ variant: "icon" }), itemVariants({ variant: "outline", size: "sm" })];
</script>

<template>
  <AspectRatio :ratio="16 / 9" :class="classes"><img src="/a.png" alt="" /></AspectRatio>
  <ButtonGroup orientation="vertical" aria-label="Actions">
    <Button variant="outline">Reply</Button>
    <ButtonGroupSeparator orientation="horizontal" />
    <ButtonGroupText as="label" for="x">Text</ButtonGroupText>
  </ButtonGroup>
  <Carousel orientation="vertical" :opts="{ loop: true }" class="w-full" @init-api="(a) => (api = a)">
    <CarouselContent class="h-40">
      <CarouselItem v-for="n in 3" :key="n" class="basis-1/2">{{ n }}</CarouselItem>
    </CarouselContent>
    <CarouselPrevious />
    <CarouselNext variant="ghost" size="icon" />
  </Carousel>
  <DirectionProvider dir="rtl"><Button>{{ direction }}</Button></DirectionProvider>
  <DirectionProvider direction="ltr"><Button>LTR</Button></DirectionProvider>
  <Empty class="border">
    <EmptyHeader>
      <EmptyMedia variant="icon">!</EmptyMedia>
      <EmptyTitle>No projects</EmptyTitle>
      <EmptyDescription>Create one.</EmptyDescription>
    </EmptyHeader>
    <EmptyContent><Button size="sm">Create</Button></EmptyContent>
  </Empty>
  <InputGroup class="w-80">
    <InputGroupInput v-model="url" placeholder="example.com" aria-label="Website" />
    <InputGroupAddon><InputGroupText>https://</InputGroupText></InputGroupAddon>
    <InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" aria-label="Clear" @click="url = ''">x</InputGroupButton></InputGroupAddon>
  </InputGroup>
  <InputGroup><InputGroupTextarea default-value="Hi" rows="3" /></InputGroup>
  <InputOTP v-model="code" :maxlength="6" container-class="justify-center" @complete="(value) => (code = value)">
    <InputOTPGroup>
      <InputOTPSlot :index="0" />
      <InputOTPSlot :index="1" class="rounded-none" />
    </InputOTPGroup>
    <InputOTPSeparator />
    <InputOTPGroup><InputOTPSlot :index="2" /></InputOTPGroup>
  </InputOTP>
  <ItemGroup>
    <Item variant="outline" size="sm" as="a" href="/">
      <ItemMedia variant="icon">i</ItemMedia>
      <ItemContent>
        <ItemTitle>Title</ItemTitle>
        <ItemDescription>Description</ItemDescription>
      </ItemContent>
      <ItemActions><Button size="sm">Go</Button></ItemActions>
    </Item>
    <ItemSeparator />
    <Item variant="default" as-child><a href="/">Link</a></Item>
  </ItemGroup>
  <Item size="default"><ItemHeader>Header</ItemHeader><ItemFooter>Footer</ItemFooter></Item>
  <ResizablePanelGroup direction="horizontal" class="min-h-48" @layout="(sizes) => sizes.length">
    <ResizablePanel :default-size="50" :min-size="20">A</ResizablePanel>
    <ResizableHandle with-handle />
    <ResizablePanel :default-size="50">B</ResizablePanel>
  </ResizablePanelGroup>
  <ScrollArea class="h-40" type="always">
    <div>Long</div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
  <SidebarProvider v-model:open="sidebarOpen">
    <Sidebar collapsible="icon" variant="inset" side="right">
      <SidebarHeader><SidebarInput placeholder="Search" /></SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupAction title="Add">+</SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton is-active tooltip="Home" size="lg" variant="outline"><span>Home</span></SidebarMenuButton>
                <SidebarMenuAction show-on-hover>…</SidebarMenuAction>
                <SidebarMenuBadge>3</SidebarMenuBadge>
                <SidebarMenuSub>
                  <SidebarMenuSubItem><SidebarMenuSubButton href="/a" is-active size="sm">A</SidebarMenuSubButton></SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton as-child><a href="/x">X</a></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuSkeleton show-icon /></SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
      </SidebarContent>
      <SidebarFooter>Footer</SidebarFooter>
      <SidebarRail />
    </Sidebar>
    <SidebarInset><SidebarTrigger class="-ms-1" /></SidebarInset>
  </SidebarProvider>
</template>
`,
};

// Menus, overlays, pickers and toasts, used as the shadcn-vue docs use them: v-model on the menus'
// rows and the combobox, v-model:open on overlays, slots, emits, as-child triggers and links.
const MENUS_AND_OVERLAYS: GeneratedFile = {
  path: "pages/MenusAndOverlays.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";
import { toast as sonner } from "vue-sonner";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxLabel, ComboboxList, ComboboxSeparator, ComboboxValue } from "@/components/ui/combobox";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuLabel, ContextMenuRadioGroup, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarMenu, MenubarRadioGroup, MenubarRadioItem, MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubContent, MenubarSubTrigger, MenubarTrigger } from "@/components/ui/menubar";
import { NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster, toast, toastVariants, useToastManager } from "@/components/ui/toast";

const drawer = ref(false);
const palette = ref(false);
const framework = ref<string>();
const frameworks = ref<string[]>(["Nuxt"]);
const bookmarks = ref<boolean | "indeterminate">(true);
const person = ref("ada");
const menu = ref("");
const { toasts } = useToastManager();
const toastClasses = toastVariants({ intent: "danger" });
const linkClasses = navigationMenuTriggerStyle();
</script>

<template>
  <Combobox v-model="framework">
    <ComboboxInput placeholder="Select a framework" aria-label="Framework" show-clear />
    <ComboboxContent>
      <ComboboxEmpty>No match.</ComboboxEmpty>
      <ComboboxList>
        <ComboboxGroup>
          <ComboboxLabel>Frameworks</ComboboxLabel>
          <ComboboxItem v-for="item in ['Next.js', 'Nuxt']" :key="item" :value="item">{{ item }}</ComboboxItem>
        </ComboboxGroup>
        <ComboboxSeparator />
        <ComboboxItem value="Astro" disabled>Astro</ComboboxItem>
      </ComboboxList>
    </ComboboxContent>
    <ComboboxValue />
  </Combobox>
  <Combobox v-model="frameworks" multiple>
    <ComboboxChips>
      <ComboboxChip v-for="item in frameworks" :key="item" :value="item">{{ item }}</ComboboxChip>
      <ComboboxChipsInput placeholder="Add" />
    </ComboboxChips>
    <ComboboxContent>
      <ComboboxList><ComboboxItem value="Remix">Remix</ComboboxItem></ComboboxList>
    </ComboboxContent>
  </Combobox>
  <Command class="rounded-lg border">
    <CommandInput placeholder="Type a command or search…" />
    <CommandList aria-label="Commands">
      <CommandEmpty>No results found.</CommandEmpty>
      <CommandGroup heading="Suggestions">
        <CommandItem value="calendar" @select="() => {}">Calendar <CommandShortcut>⌘C</CommandShortcut></CommandItem>
        <CommandItem disabled>Search</CommandItem>
      </CommandGroup>
      <CommandSeparator />
    </CommandList>
  </Command>
  <CommandDialog v-model:open="palette" title="Commands">
    <Command><CommandInput /><CommandList><CommandItem>Profile</CommandItem></CommandList></Command>
  </CommandDialog>
  <ContextMenu @update:open="() => {}">
    <ContextMenuTrigger as-child><div class="h-32">Right-click</div></ContextMenuTrigger>
    <ContextMenuContent class="w-56">
      <ContextMenuLabel inset>Page</ContextMenuLabel>
      <ContextMenuGroup><ContextMenuItem @select="() => {}">Back <ContextMenuShortcut>⌘[</ContextMenuShortcut></ContextMenuItem></ContextMenuGroup>
      <ContextMenuItem variant="destructive" disabled>Delete</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuCheckboxItem v-model="bookmarks">Bookmarks</ContextMenuCheckboxItem>
      <ContextMenuRadioGroup v-model="person"><ContextMenuRadioItem value="ada">Ada</ContextMenuRadioItem></ContextMenuRadioGroup>
      <ContextMenuSub>
        <ContextMenuSubTrigger inset>More</ContextMenuSubTrigger>
        <ContextMenuSubContent><ContextMenuItem>Save as…</ContextMenuItem></ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  </ContextMenu>
  <Drawer v-model:open="drawer" direction="right">
    <DrawerTrigger as-child><Button variant="outline">Open drawer</Button></DrawerTrigger>
    <DrawerContent class="max-w-md" @escape-key-down="drawer = false">
      <DrawerHeader><DrawerTitle>Move goal</DrawerTitle><DrawerDescription>Set your daily goal.</DrawerDescription></DrawerHeader>
      <DrawerFooter><Button>Submit</Button><DrawerClose as-child><Button variant="outline">Cancel</Button></DrawerClose></DrawerFooter>
    </DrawerContent>
  </Drawer>
  <HoverCard :open-delay="200">
    <HoverCardTrigger as-child><Button variant="ghost">@ada</Button></HoverCardTrigger>
    <HoverCardContent side="top" class="w-80">Ada Lovelace</HoverCardContent>
  </HoverCard>
  <Menubar v-model="menu" aria-label="Application">
    <MenubarMenu value="file">
      <MenubarTrigger>File</MenubarTrigger>
      <MenubarContent :side-offset="4">
        <MenubarItem>New tab <MenubarShortcut>⌘T</MenubarShortcut></MenubarItem>
        <MenubarSeparator />
        <MenubarCheckboxItem v-model="bookmarks">Bookmarks</MenubarCheckboxItem>
        <MenubarRadioGroup v-model="person"><MenubarRadioItem value="ada">Ada</MenubarRadioItem></MenubarRadioGroup>
        <MenubarSub><MenubarSubTrigger>Share</MenubarSubTrigger><MenubarSubContent><MenubarItem>Email</MenubarItem></MenubarSubContent></MenubarSub>
      </MenubarContent>
    </MenubarMenu>
  </Menubar>
  <NavigationMenu :viewport="false">
    <NavigationMenuList>
      <NavigationMenuItem value="start">
        <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
        <NavigationMenuContent><NavigationMenuLink href="/docs" active>Introduction</NavigationMenuLink></NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem><NavigationMenuLink href="/docs" :class="linkClasses">Docs</NavigationMenuLink></NavigationMenuItem>
      <NavigationMenuIndicator />
    </NavigationMenuList>
  </NavigationMenu>
  <Sonner position="top-center" rich-colors />
  <Button @click="sonner.success('Event created', { description: 'Sunday at 9:00' })">Sonner</Button>
  <Toaster class="end-8">
    <Button @click="toast.add({ title: 'Saved', type: 'success', actionProps: { children: 'Undo', onClick: () => {} } })">Toast</Button>
  </Toaster>
  <p :class="toastClasses">{{ toasts.length }}</p>
</template>
`,
};

// Beyond the everyday set: calendars and date pickers with v-model on @internationalized/date
// values, a data table with typed columns and a sorting header, and the chat components.
const MORE: GeneratedFile = {
  path: "pages/More.vue",
  source: `<script setup lang="ts">
import type { DataTableColumn } from "@/components/ui/data-table";
import type { DateRange, DateValue } from "reka-ui";
import { getLocalTimeZone, today } from "@internationalized/date";
import { h, shallowRef } from "vue";
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentMedia, AttachmentTitle, AttachmentTrigger } from "@/components/ui/attachment";
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions, bubbleVariants } from "@/components/ui/bubble";
import { Calendar, RangeCalendar } from "@/components/ui/calendar";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import { Marker, MarkerContent, MarkerIcon, markerVariants } from "@/components/ui/marker";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "@/components/ui/message";

type Payment = { id: string; email: string; amount: number };
const payments: Payment[] = [{ id: "a", email: "ada@example.com", amount: 316 }];
const columns: DataTableColumn<Payment>[] = [
  { accessorKey: "email", header: ({ column }) => h(DataTableColumnHeader, { column, title: "Email" }) },
  { accessorKey: "amount", header: "Amount", cell: ({ row }) => h("span", { class: "tabular-nums" }, String(row.original.amount)) },
];
const day = shallowRef<DateValue>(today(getLocalTimeZone()));
const days = shallowRef<DateRange>({ start: today(getLocalTimeZone()), end: today(getLocalTimeZone()).add({ days: 6 }) });
const picked = shallowRef<DateValue>();
const span = shallowRef<DateRange>();
const bubble = bubbleVariants({ variant: "soft", intent: "neutral" });
const marker = markerVariants({ variant: "separator" });
</script>

<template>
  <Calendar v-model="day" layout="month-and-year" :number-of-months="2" class="rounded-lg border" />
  <RangeCalendar v-model="days" button-variant="outline" />
  <DatePicker v-model="picked" placeholder="When?" class="w-60" />
  <DateRangePicker v-model="span" />
  <DataTable label="Payments" :columns="columns" :data="payments" filter-column="email" selectable :page-size="5">
    <template #empty>Nothing yet.</template>
  </DataTable>
  <MessageGroup>
    <Message align="end">
      <MessageAvatar>AL</MessageAvatar>
      <MessageContent>
        <MessageHeader>Ada</MessageHeader>
        <BubbleGroup>
          <Bubble variant="secondary" align="end" :class="bubble">
            <BubbleContent as-child><a href="/">Open</a></BubbleContent>
            <BubbleReactions side="top">👍</BubbleReactions>
          </Bubble>
        </BubbleGroup>
        <MessageFooter>Read</MessageFooter>
      </MessageContent>
    </Message>
  </MessageGroup>
  <Attachment state="uploading" size="sm" orientation="vertical">
    <AttachmentMedia variant="image"><img alt="" src="/a.png" /></AttachmentMedia>
    <AttachmentContent>
      <AttachmentTitle>brief.pdf</AttachmentTitle>
      <AttachmentDescription>1.2 MB</AttachmentDescription>
    </AttachmentContent>
    <AttachmentActions><AttachmentAction aria-label="Remove">x</AttachmentAction></AttachmentActions>
    <AttachmentTrigger as="a" href="/brief.pdf" />
  </Attachment>
  <Marker variant="border" :class="marker"><MarkerIcon>*</MarkerIcon><MarkerContent>Today</MarkerContent></Marker>
</template>
`,
};

// The long tail: a chart on Unovis the way shadcn-vue's examples draw one (the tooltip through
// componentToString, the legend from the config), a conversation that follows its newest message
// and jumps to one, and a questionnaire with v-model on the question shown, a choice and a typed answer.
const LONG_TAIL: GeneratedFile = {
  path: "pages/LongTail.vue",
  source: `<script setup lang="ts">
import type { ChartConfig } from "@/components/ui/chart";
import type { MessageScrollerScrollable } from "@/components/ui/message-scroller";
import type { QuestionnaireItemStatus } from "@/components/ui/questionnaire";
import { VisArea, VisAxis, VisLine, VisXYContainer } from "@unovis/vue";
import { ref } from "vue";
import { ChartContainer, ChartCrosshair, ChartLegend, ChartLegendContent, ChartStyle, ChartTooltip, ChartTooltipContent, componentToString } from "@/components/ui/chart";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@/components/ui/message-scroller";
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire";

const data = [
  { month: 1, desktop: 186, mobile: 80 },
  { month: 2, desktop: 305, mobile: 200 },
];
type Datum = (typeof data)[number];
const config = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", theme: { light: "var(--chart-2)", dark: "var(--chart-3)" } },
} satisfies ChartConfig;
const tooltip = componentToString(config, ChartTooltipContent, { indicator: "line", hideLabel: true });

const messages = ref([{ id: "a", text: "Hi" }]);
const item = ref("tone");
const agreed = ref(false);
const name = ref("");
const status = ref<QuestionnaireItemStatus>("unanswered");
const scrollable = ref<MessageScrollerScrollable>();
void scrollable;
void useMessageScroller;
void useMessageScrollerScrollable;
void useMessageScrollerVisibility;
</script>

<template>
  <ChartContainer :config="config" class="h-56 w-full" :cursor="false">
    <VisXYContainer :data="data">
      <VisArea :x="(d: Datum) => d.month" :y="[(d: Datum) => d.desktop, (d: Datum) => d.mobile]" :opacity="0.4" />
      <VisLine :x="(d: Datum) => d.month" :y="(d: Datum) => d.desktop" color="var(--color-desktop)" />
      <VisAxis type="x" :tick-line="false" :tick-format="(t: number | Date) => String(t)" />
      <ChartTooltip />
      <ChartCrosshair :template="tooltip" color="#0000" />
      <ChartLegend :items="[{ name: 'Desktop', color: 'var(--color-desktop)' }]" />
    </VisXYContainer>
    <ChartLegendContent vertical-align="top" name-key="desktop" hide-icon />
  </ChartContainer>
  <ChartStyle id="chart-x" :config="config" />
  <ChartTooltipContent :config="config" :payload="data[0]" :x="1" indicator="dashed" label-key="desktop" :label-formatter="(x) => String(x)" label-class="font-bold" />

  <MessageScrollerProvider auto-scroll default-scroll-position="last-anchor" :scroll-edge-threshold="4">
    <MessageScroller class="h-64">
      <MessageScrollerViewport :preserve-scroll-on-prepend="false" aria-label="Chat">
        <MessageScrollerContent class="gap-4 p-4" spacer-class="bg-transparent">
          <MessageScrollerItem v-for="m in messages" :key="m.id" :message-id="m.id" scroll-anchor>{{ m.text }}</MessageScrollerItem>
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
      <MessageScrollerButton direction="start" variant="secondary" behavior="auto" @click="(e: MouseEvent) => e.preventDefault()">Top</MessageScrollerButton>
    </MessageScroller>
  </MessageScrollerProvider>

  <Questionnaire v-model:item="item" :items="[{ name: 'tone', required: true, choices: [{ value: 'warm' }, { value: 'plain' }] }, { name: 'name' }]" shortcuts="letters" :no-validate="false" @submit="(e: SubmitEvent) => e.preventDefault()" @reset="() => {}">
    <QuestionnaireProgress />
    <QuestionnaireItem name="tone" required @update:status="(s: QuestionnaireItemStatus) => (status = s)">
      <QuestionnaireTitle>How should it sound?</QuestionnaireTitle>
      <QuestionnaireDescription>Pick one.</QuestionnaireDescription>
      <QuestionnaireChoices>
        <QuestionnaireChoice value="warm" default-checked>Warm<QuestionnaireChoiceDescription>Friendly</QuestionnaireChoiceDescription></QuestionnaireChoice>
        <QuestionnaireChoice v-model:checked="agreed" value="plain" @change="() => {}">Plain</QuestionnaireChoice>
      </QuestionnaireChoices>
      <QuestionnaireError />
    </QuestionnaireItem>
    <QuestionnaireItem name="name" multiple invalid>
      <QuestionnaireTitle>Your name</QuestionnaireTitle>
      <QuestionnaireInput v-model="name" type="email" placeholder="ada@example.com" />
      <QuestionnaireError id="name-error">Tell us who you are.</QuestionnaireError>
    </QuestionnaireItem>
    <QuestionnaireActions>
      <QuestionnairePrevious variant="ghost" />
      <QuestionnaireSkip @click="(e: MouseEvent) => e.preventDefault()" />
      <QuestionnaireNext size="sm">Continue</QuestionnaireNext>
      <QuestionnaireSubmit />
    </QuestionnaireActions>
  </Questionnaire>
</template>
`,
};

// Every page the checks compile beside the generated code.
const PAGES = [
  USAGE,
  EVERYDAY,
  LAYOUT,
  MORE,
  MENUS_AND_OVERLAYS,
  LONG_TAIL,
];

// Every preset, the customized system, and the default drawn with other icon libraries: the icon
// systems that between them import every Vue icon package, directly and through the
// wrappers (a weight, a stroke, the system's own icons); ssr-parity renders all of them.
const ICONS_CHECKED = ["phosphor-bold", "hugeicons", "remix"];
const systems = { ...SYSTEMS, ...Object.fromEntries(PRESETS.slice(1).map((p) => [p.id, () => p.build()])), ...Object.fromEntries(ICONS_CHECKED.map((k) => [`icons-${k}`, ICON_SYSTEMS[k]!])) };

describe.each(Object.keys(systems))("generated Vue code for the %s system", (name) => {
  it("type-checks with vue-tsc, and so do pages using it", async () => {
    const dir = writeGenerated(`types-${name}`, [...(await renderAll("reka-ui", systems[name]!())), ...PAGES]);
    expect(vueTsc(dir)).toEqual([]);
  }, 120_000);
});

// With a Tailwind class prefix, the prefixed code still compiles.
it("type-checks with a class prefix", async () => {
  const dir = writeGenerated("types-prefixed", [...(await prefixFiles(await renderAll("reka-ui", PRESETS[0]!.build()), "tw")), ...PAGES]);
  expect(vueTsc(dir)).toEqual([]);
}, 120_000);

// The check can fail: a page that gets the components wrong is caught, in the .vue file and line.
it("vue-tsc reports a page that misuses the components", async () => {
  const broken: GeneratedFile = {
    path: "pages/Broken.vue",
    source: `<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { DialogContent } from "@/components/ui/dialog";
</script>

<template>
  <Button variant="nope">Save</Button>
  <DialogContent :show-close-button="'yes'" />
</template>
`,
  };
  const dir = writeGenerated("types-broken", [...(await renderAll("reka-ui", PRESETS[0]!.build())), broken]);
  const diagnostics = vueTsc(dir);
  expect(diagnostics.map((d) => [d.file, d.line])).toEqual([
    ["pages/Broken.vue", 7],
    ["pages/Broken.vue", 8],
  ]);
}, 120_000);
