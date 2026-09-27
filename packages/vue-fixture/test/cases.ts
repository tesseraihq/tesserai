import { parseDate } from "@internationalized/date";
import { n, nx, type Tree } from "./tree";

// The trees the DOM parity tests render in both frameworks, by component: every part, the axes
// and states that change markup, and classes of the page's own. A case is valid on both systems
// (the custom one adds an "accent" intent everywhere, used in CUSTOM_CASES).

type Cases = Record<string, [string, Tree][]>;

const t = (s: string) => s;

// Rendered on the server: everything that isn't in a portal.
export const SSR_CASES: Cases = {
  badge: [
    ["default", n("Badge", {}, "New")],
    ["a shadcn alias", n("Badge", { variant: "destructive" }, "3")],
    ["variant, intent and size", n("Badge", { variant: "outline", intent: "danger", size: "sm", class: "ms-2" }, "x")],
    ["as a link", n("Badge", { asChild: true, variant: "secondary" }, n("a", { href: "/" }, "Link"))],
  ],
  input: [
    ["default", n("Input", { placeholder: "Email" })],
    ["sized, invalid, with a class", n("Input", { size: "sm", "aria-invalid": "true", class: "w-40", defaultValue: "a" })],
  ],
  textarea: [["with a class", n("Textarea", { class: "min-h-40", placeholder: "Bio" })]],
  label: [["for a control", nx("Label", { both: { class: "text-2" }, react: { htmlFor: "a" }, vue: { for: "a" } }, "Name")]],
  field: [
    [
      "every part",
      n(
        "FieldSet",
        {},
        n("FieldLegend", { variant: "label" }, "Profile"),
        n(
          "FieldGroup",
          {},
          n(
            "Field",
            { orientation: "horizontal", "data-invalid": "true" },
            n("FieldLabel", {}, "Name"),
            n("FieldContent", {}, n("FieldTitle", {}, "Title"), n("FieldDescription", {}, "Help")),
            n("FieldError", { errors: [{ message: "Required" }, { message: "Too short" }] }),
          ),
          n("FieldSeparator", {}, "or"),
          n("FieldSeparator", {}),
          n("Field", { orientation: "responsive" }, n("FieldError", { errors: [{ message: "One" }] }), n("FieldError", { class: "mt-2" }, "Own")),
          n("Field", {}),
        ),
      ),
    ],
  ],
  checkbox: [
    ["unchecked", n("Checkbox", {})],
    ["checked, small", nx("Checkbox", { both: { size: "sm", class: "me-2" }, react: { defaultChecked: true }, vue: { defaultValue: true } })],
    ["indeterminate", nx("Checkbox", { react: { checked: "indeterminate" }, vue: { modelValue: "indeterminate" } })],
    ["disabled", n("Checkbox", { disabled: true })],
  ],
  switch: [
    ["off", n("Switch", {})],
    ["on, small, disabled", nx("Switch", { both: { size: "sm", disabled: true }, react: { defaultChecked: true }, vue: { defaultValue: true } })],
  ],
  "radio-group": [
    [
      "with a chosen item",
      n("RadioGroup", { defaultValue: "b", class: "gap-4" }, n("RadioGroupItem", { value: "a" }), n("RadioGroupItem", { value: "b", size: "sm" }), n("RadioGroupItem", { value: "c", disabled: true })),
    ],
  ],
  select: [
    ["closed, with a placeholder", n("Select", {}, n("SelectTrigger", { class: "w-40" }, n("SelectValue", { placeholder: "Fruit" })))],
    ["sized trigger", n("Select", {}, n("SelectTrigger", { size: "sm" }, n("SelectValue", { placeholder: "Fruit" })))],
  ],
  "native-select": [
    [
      "options and a group",
      n(
        "NativeSelect",
        { size: "sm", class: "w-40", disabled: true },
        n("NativeSelectOption", { value: "a" }, "A"),
        n("NativeSelectOptGroup", { label: "More" }, n("NativeSelectOption", { value: "b", class: "font-bold" }, "B")),
      ),
    ],
  ],
  card: [
    [
      "every part",
      n(
        "Card",
        { class: "w-80" },
        n("CardHeader", {}, n("CardTitle", {}, "Title"), n("CardDescription", {}, "Text"), n("CardAction", {}, "Act")),
        n("CardContent", {}, "Body"),
        n("CardFooter", {}, "Foot"),
      ),
    ],
    ["small", n("Card", { size: "sm" }, "Body")],
  ],
  separator: [
    ["horizontal", n("Separator", {})],
    ["vertical, announced", n("Separator", { orientation: "vertical", decorative: false, class: "mx-2" })],
  ],
  skeleton: [["with a class", n("Skeleton", { class: "h-4 w-40" })]],
  spinner: [["with a class", n("Spinner", { class: "size-6" })]],
  kbd: [["a group", n("KbdGroup", {}, n("Kbd", {}, "⌘"), n("Kbd", { class: "px-2" }, "K"))]],
  alert: [
    ["default", n("Alert", {}, n("AlertTitle", {}, "Title"), n("AlertDescription", {}, "Text"), n("AlertAction", {}, "Undo"))],
    ["a shadcn alias", n("Alert", { variant: "destructive" }, "!")],
    ["variant and intent", n("Alert", { variant: "soft", intent: "success", class: "mt-2" }, "!")],
  ],
  avatar: [
    [
      "a group with a fallback and a badge",
      n(
        "AvatarGroup",
        {},
        n("Avatar", {}, n("AvatarFallback", {}, "AL"), n("AvatarBadge", {})),
        n("Avatar", { size: "lg", class: "ring-2" }, n("AvatarFallback", { class: "text-3" }, "BK")),
        n("AvatarGroupCount", {}, "+3"),
      ),
    ],
  ],
  typography: [
    [
      "every element",
      n(
        "div",
        {},
        ...["TypographyH1", "TypographyH2", "TypographyH3", "TypographyH4", "TypographyP", "TypographyLead", "TypographyLarge", "TypographySmall", "TypographyMuted", "TypographyBlockquote", "TypographyInlineCode"].map((p) => n(p, {}, t(p))),
        n("TypographyList", { class: "my-2" }, n("li", {}, "One")),
      ),
    ],
  ],
  table: [
    [
      "every part",
      n(
        "Table",
        { class: "mt-2" },
        n("TableCaption", {}, "Invoices"),
        n("TableHeader", {}, n("TableRow", {}, n("TableHead", {}, "Invoice"))),
        n("TableBody", {}, n("TableRow", { selected: true }, n("TableCell", {}, "INV001")), n("TableRow", {}, n("TableCell", { class: "text-end" }, "INV002"))),
        n("TableFooter", {}, n("TableRow", {}, n("TableCell", {}, "Total"))),
      ),
    ],
  ],
  tabs: [
    [
      "line, horizontal",
      n("Tabs", { defaultValue: "a" }, n("TabsList", {}, n("TabsTrigger", { value: "a" }, "A"), n("TabsTrigger", { value: "b", disabled: true }, "B")), n("TabsContent", { value: "a" }, "Panel A")),
    ],
    ["segmented (shadcn's default), vertical", n("Tabs", { defaultValue: "a", orientation: "vertical" }, n("TabsList", { variant: "default" }, n("TabsTrigger", { value: "a" }, "A")), n("TabsContent", { value: "a", class: "p-2" }, "Panel"))],
  ],
  accordion: [
    [
      "one open item, one closed",
      n(
        "Accordion",
        { type: "single", collapsible: true, defaultValue: "a" },
        n("AccordionItem", { value: "a" }, n("AccordionTrigger", {}, "Open"), n("AccordionContent", { class: "pb-2" }, "Shown")),
        n("AccordionItem", { value: "b", disabled: true }, n("AccordionTrigger", { class: "text-3" }, "Closed"), n("AccordionContent", {}, "Hidden")),
      ),
    ],
  ],
  collapsible: [
    ["open", n("Collapsible", { defaultOpen: true }, n("CollapsibleTrigger", {}, "Toggle"), n("CollapsibleContent", { class: "mt-2" }, "Shown"))],
    ["closed", n("Collapsible", {}, n("CollapsibleTrigger", {}, "Toggle"), n("CollapsibleContent", {}, "Hidden"))],
  ],
  toggle: [
    ["off", n("Toggle", { "aria-label": "Bold" }, "B")],
    ["on, outline, small", nx("Toggle", { both: { variant: "outline", size: "sm", class: "px-4" }, react: { defaultPressed: true }, vue: { defaultValue: true } }, "B")],
    ["shadcn's default, disabled", n("Toggle", { variant: "default", disabled: true }, "B")],
  ],
  "toggle-group": [
    [
      "joined, outline",
      n("ToggleGroup", { type: "single", defaultValue: "a", variant: "outline", spacing: 0 }, n("ToggleGroupItem", { value: "a" }, "A"), n("ToggleGroupItem", { value: "b" }, "B")),
    ],
    [
      "spaced, vertical, items sized",
      n("ToggleGroup", { type: "multiple", orientation: "vertical", spacing: 2, class: "w-40" }, n("ToggleGroupItem", { value: "a", size: "sm" }, "A"), n("ToggleGroupItem", { value: "b", variant: "outline", class: "grow" }, "B")),
    ],
  ],
  // A closed tooltip renders only its trigger, which has no data-slot in either (dom-parity opens it).
  popover: [["closed", n("Popover", {}, n("PopoverTrigger", {}, "Open"), n("PopoverContent", {}, "Text"))]],
  "dropdown-menu": [["closed", n("DropdownMenu", {}, n("DropdownMenuTrigger", {}, "Open"), n("DropdownMenuContent", {}, n("DropdownMenuItem", {}, "Item")))]],
  progress: [
    ["60%", nx("Progress", { both: { class: "w-40" }, react: { value: 60 }, vue: { modelValue: 60 } })],
    ["no value", n("Progress", {})],
  ],
  slider: [
    ["one thumb", n("Slider", { defaultValue: [40], "aria-label": "Volume" })],
    ["no value: two thumbs, min to max", n("Slider", { class: "w-40" })],
    ["vertical, disabled", n("Slider", { defaultValue: [20, 80], orientation: "vertical", disabled: true })],
  ],
  breadcrumb: [
    [
      "every part",
      n(
        "Breadcrumb",
        {},
        n(
          "BreadcrumbList",
          {},
          n("BreadcrumbItem", {}, n("BreadcrumbLink", { href: "/" }, "Home")),
          n("BreadcrumbSeparator", {}),
          n("BreadcrumbItem", {}, n("BreadcrumbLink", { asChild: true }, n("a", { href: "/docs" }, "Docs"))),
          n("BreadcrumbSeparator", { class: "size-3" }, "/"),
          n("BreadcrumbItem", {}, n("BreadcrumbEllipsis", {})),
          n("BreadcrumbItem", {}, n("BreadcrumbPage", {}, "Card")),
        ),
      ),
    ],
  ],
  pagination: [
    [
      "every part",
      n(
        "Pagination",
        {},
        n(
          "PaginationContent",
          {},
          n("PaginationItem", {}, n("PaginationPrevious", { href: "#" })),
          n("PaginationItem", {}, n("PaginationLink", { href: "#" }, "1")),
          n("PaginationItem", {}, n("PaginationLink", { href: "#", isActive: true }, "2")),
          n("PaginationItem", {}, n("PaginationEllipsis", {})),
          n("PaginationItem", {}, n("PaginationNext", { href: "#", class: "ms-2" })),
        ),
      ),
    ],
  ],
  "alert-dialog": [["closed", n("AlertDialog", {}, n("AlertDialogTrigger", {}, "Delete"))]],
  sheet: [["closed", n("Sheet", {}, n("SheetTrigger", {}, "Open"))]],
  // Layout and composition, beyond the everyday set.
  "aspect-ratio": [["16:9, with a class", n("AspectRatio", { ratio: 16 / 9, class: "rounded-lg" }, n("img", { src: "/a.png", alt: "" }))]],
  "button-group": [
    [
      "every part",
      n("ButtonGroup", { "aria-label": "Actions" }, n("Button", { variant: "outline" }, "Reply"), n("ButtonGroupSeparator", {}), n("ButtonGroupText", {}, "Text"), n("ButtonGroupText", { asChild: true }, n("label", {}, "Label"))),
    ],
    ["vertical, a separator across", n("ButtonGroup", { orientation: "vertical", class: "w-40" }, n("Button", {}, "A"), n("ButtonGroupSeparator", { orientation: "horizontal" }), n("Button", {}, "B"))],
  ],
  empty: [
    [
      "every part",
      n(
        "Empty",
        { class: "border" },
        n("EmptyHeader", {}, n("EmptyMedia", { variant: "icon" }, "!"), n("EmptyTitle", {}, "No projects"), n("EmptyDescription", {}, "Create one.")),
        n("EmptyContent", {}, "Act"),
      ),
    ],
    ["plain media", n("EmptyMedia", { class: "size-3" }, "!")],
  ],
  item: [
    [
      "a group of every part",
      n(
        "ItemGroup",
        {},
        n(
          "Item",
          { variant: "outline", size: "sm" },
          n("ItemMedia", { variant: "icon" }, "i"),
          n("ItemContent", {}, n("ItemTitle", {}, "Title"), n("ItemDescription", {}, "Text")),
          n("ItemActions", {}, "Go"),
        ),
        n("ItemSeparator", {}),
        n("Item", { variant: "default", asChild: true }, n("a", { href: "/" }, "Link")),
        n("Item", { size: "default", class: "mt-2" }, n("ItemMedia", { variant: "image" }, n("img", { src: "/a.png", alt: "" })), n("ItemHeader", {}, "Header"), n("ItemFooter", {}, "Footer")),
      ),
    ],
    // As the docs example uses it: no group around it (no listitem role, and no missing-context error).
    ["on its own", n("Item", { variant: "outline" }, n("ItemContent", {}, n("ItemTitle", {}, "Title")))],
  ],
  "input-group": [
    [
      "addons on every side, a button, an input",
      n(
        "InputGroup",
        { class: "w-80" },
        n("InputGroupInput", { placeholder: "example", "aria-invalid": "true" }),
        n("InputGroupAddon", {}, n("InputGroupText", {}, "https://")),
        n("InputGroupAddon", { align: "inline-end" }, n("InputGroupButton", { size: "icon-xs" }, "x")),
        n("InputGroupAddon", { align: "block-end" }, n("InputGroupButton", { class: "ms-2" }, "Send")),
      ),
    ],
    ["a textarea", n("InputGroup", {}, n("InputGroupTextarea", { placeholder: "Say" }), n("InputGroupAddon", { align: "block-start" }, "Title"))],
  ],
  "input-otp": [
    [
      "six slots in two groups",
      nx(
        "InputOTP",
        { react: { maxLength: 6 }, vue: { maxlength: 6 } },
        n("InputOTPGroup", {}, n("InputOTPSlot", { index: 0 }), n("InputOTPSlot", { index: 1 }), n("InputOTPSlot", { index: 2, class: "rounded-none" })),
        n("InputOTPSeparator", {}),
        n("InputOTPGroup", {}, n("InputOTPSlot", { index: 3 }), n("InputOTPSlot", { index: 4 }), n("InputOTPSlot", { index: 5 })),
      ),
    ],
    ["disabled, with classes", nx("InputOTP", { both: { disabled: true, class: "w-40" }, react: { maxLength: 4, containerClassName: "gap-4" }, vue: { maxlength: 4, containerClass: "gap-4" } }, n("InputOTPGroup", {}, n("InputOTPSlot", { index: 0 })))],
  ],
  "scroll-area": [["with content", n("ScrollArea", { class: "h-40" }, n("div", {}, "Long"))]],
  resizable: [
    [
      "across, with a grip",
      nx(
        "ResizablePanelGroup",
        { both: { class: "min-h-48" }, react: { orientation: "horizontal" }, vue: { direction: "horizontal" } },
        nx("ResizablePanel", { react: { defaultSize: "50" }, vue: { defaultSize: 50 } }, "A"),
        n("ResizableHandle", { withHandle: true }),
        nx("ResizablePanel", { react: { defaultSize: "50" }, vue: { defaultSize: 50 } }, "B"),
      ),
    ],
    [
      "down",
      nx(
        "ResizablePanelGroup",
        { react: { orientation: "vertical" }, vue: { direction: "vertical" } },
        nx("ResizablePanel", { react: { defaultSize: "30" }, vue: { defaultSize: 30 } }, "A"),
        n("ResizableHandle", { class: "bg-transparent" }),
        nx("ResizablePanel", { react: { defaultSize: "70" }, vue: { defaultSize: 70 } }, "B"),
      ),
    ],
  ],
  direction: [["right to left, around a part", n("DirectionProvider", { dir: "rtl" }, n("Kbd", {}, "K"))]],
  sidebar: [
    [
      "icon-collapsible and inset, every part",
      n(
        "SidebarProvider",
        {},
        n(
          "Sidebar",
          { collapsible: "icon", variant: "inset" },
          n("SidebarHeader", {}, n("SidebarInput", { placeholder: "Search" })),
          n(
            "SidebarContent",
            {},
            n(
              "SidebarGroup",
              {},
              n("SidebarGroupLabel", {}, "Navigation"),
              n("SidebarGroupAction", { title: "Add" }, "+"),
              n(
                "SidebarGroupContent",
                {},
                n(
                  "SidebarMenu",
                  {},
                  n(
                    "SidebarMenuItem",
                    {},
                    n("SidebarMenuButton", { isActive: true, tooltip: "Home" }, n("span", {}, "Home")),
                    n("SidebarMenuAction", { showOnHover: true }, "…"),
                    n("SidebarMenuBadge", {}, "3"),
                    n("SidebarMenuSub", {}, n("SidebarMenuSubItem", {}, n("SidebarMenuSubButton", { href: "/a", isActive: true }, "A")), n("SidebarMenuSubItem", {}, n("SidebarMenuSubButton", { href: "/b", size: "sm" }, "B"))),
                  ),
                  n("SidebarMenuItem", {}, n("SidebarMenuButton", { size: "lg", variant: "outline" }, "Big")),
                  n("SidebarMenuItem", {}, n("SidebarMenuButton", { asChild: true, size: "sm" }, n("a", { href: "/x" }, "Link"))),
                ),
              ),
            ),
            n("SidebarSeparator", {}),
          ),
          n("SidebarFooter", {}, "Footer"),
          n("SidebarRail", {}),
        ),
        n("SidebarInset", {}, n("SidebarTrigger", { class: "-ms-1" })),
      ),
    ],
    [
      "floating, on the right, collapsed",
      n("SidebarProvider", { defaultOpen: false, class: "min-h-0" }, n("Sidebar", { variant: "floating", side: "right", class: "w-60" }, n("SidebarContent", {}, "Nav")), n("SidebarInset", {}, "Page")),
    ],
    ["not collapsible", n("SidebarProvider", {}, n("Sidebar", { collapsible: "none" }, n("SidebarMenu", {}, n("SidebarMenuItem", {}, n("SidebarMenuSkeleton", {})))))],
  ],
  carousel: [
    [
      "across",
      n(
        "Carousel",
        { class: "w-60", "aria-label": "Numbers" },
        n("CarouselContent", { class: "h-40" }, n("CarouselItem", {}, "1"), n("CarouselItem", { class: "basis-1/2" }, "2")),
        n("CarouselPrevious", {}),
        n("CarouselNext", { variant: "ghost" }),
      ),
    ],
    ["down", n("Carousel", { orientation: "vertical" }, n("CarouselContent", {}, n("CarouselItem", {}, "1")), n("CarouselPrevious", { class: "size-6" }), n("CarouselNext", {}))],
  ],
  message: [
    [
      "a group, theirs and mine",
      n(
        "MessageGroup",
        { class: "gap-4" },
        n("Message", {}, n("MessageAvatar", {}, "AL"), n("MessageContent", {}, n("MessageHeader", {}, "Ada"), "Hi", n("MessageFooter", {}, "9:41"))),
        n("Message", { align: "end", class: "mt-2" }, n("MessageContent", {}, "Hello")),
      ),
    ],
  ],
  bubble: [
    [
      "a group, every part",
      n(
        "BubbleGroup",
        {},
        n("Bubble", {}, n("BubbleContent", {}, "Hi"), n("BubbleReactions", {}, "👍")),
        n("Bubble", { variant: "outline", intent: "neutral", align: "end", class: "mt-2" }, n("BubbleContent", { class: "px-4" }, "Yo"), n("BubbleReactions", { side: "top", align: "start" }, "1")),
      ),
    ],
    ["a shadcn alias", n("Bubble", { variant: "secondary" }, n("BubbleContent", {}, "Hi"))],
    ["content as a link", n("Bubble", { variant: "ghost" }, n("BubbleContent", { asChild: true }, n("a", { href: "/" }, "Open")))],
  ],
  attachment: [
    [
      "every part",
      n(
        "AttachmentGroup",
        {},
        n(
          "Attachment",
          { state: "uploading", size: "sm" },
          n("AttachmentMedia", {}, "F"),
          n("AttachmentContent", {}, n("AttachmentTitle", {}, "brief.pdf"), n("AttachmentDescription", {}, "1.2 MB")),
          n("AttachmentActions", {}, n("AttachmentAction", { "aria-label": "Remove" }, "x")),
          n("AttachmentTrigger", {}),
        ),
        n("Attachment", { orientation: "vertical", state: "error", class: "w-40" }, n("AttachmentMedia", { variant: "image" }, n("img", { alt: "" }))),
      ),
    ],
    ["a link as the trigger", n("Attachment", {}, n("AttachmentTrigger", { asChild: true }, n("a", { href: "/" }, "Open")))],
  ],
  "data-table": [
    [
      "selectable, with a filter, two pages",
      n("DataTable", {
        label: "People",
        columns: [
          { accessorKey: "email", header: "Email" },
          { accessorKey: "amount", header: "Amount" },
        ],
        data: [
          { email: "ada@example.com", amount: 316 },
          { email: "ken@example.com", amount: 242 },
          { email: "abe@example.com", amount: 837 },
        ],
        filterColumn: "email",
        filterPlaceholder: "Filter emails",
        selectable: true,
        pageSize: 2,
        class: "w-80",
      }),
    ],
    ["empty, no filter", n("DataTable", { label: "Nothing", columns: [{ accessorKey: "name", header: "Name" }], data: [], empty: "Nobody yet." })],
  ],
  "date-picker": [
    ["empty, with a class", n("DatePicker", { class: "w-80" })],
    ["a date", nx("DatePicker", { react: { value: new Date(2026, 8, 15) }, vue: { modelValue: parseDate("2026-09-15") } })],
    ["a range", nx("DateRangePicker", { react: { value: { from: new Date(2026, 8, 15), to: new Date(2026, 8, 18) } }, vue: { modelValue: { start: parseDate("2026-09-15"), end: parseDate("2026-09-18") } } })],
    ["an empty range, placeholder text", n("DateRangePicker", { placeholder: "When?" })],
  ],
  marker: [
    ["default", n("Marker", {}, n("MarkerIcon", {}, "*"), n("MarkerContent", {}, "Today"))],
    ["separator and border", n("div", {}, n("Marker", { variant: "separator" }, n("MarkerContent", {}, "Today")), n("Marker", { variant: "border", class: "mt-2" }, n("MarkerContent", { class: "text-2" }, "Joined")))],
  ],
  // Menus, overlays, pickers and toasts: closed, as a page first renders them.
  "context-menu": [["closed", n("ContextMenu", {}, n("ContextMenuTrigger", { class: "h-32" }, "Right-click"), n("ContextMenuContent", {}, n("ContextMenuItem", {}, "Back")))]],
  menubar: [
    [
      "closed menus",
      n("Menubar", { class: "w-80", "aria-label": "App" }, n("MenubarMenu", { value: "file" }, n("MenubarTrigger", {}, "File"), n("MenubarContent", {}, n("MenubarItem", {}, "New"))), n("MenubarMenu", { value: "edit" }, n("MenubarTrigger", { class: "px-4" }, "Edit"))),
    ],
  ],
  "hover-card": [["closed", n("HoverCard", {}, n("HoverCardTrigger", {}, "@ada"), n("HoverCardContent", {}, "Ada"))]],
  drawer: [["closed", n("Drawer", {}, n("DrawerTrigger", {}, "Open"))]],
  command: [
    [
      "every part",
      n(
        "Command",
        { class: "rounded-lg border" },
        n("CommandInput", { placeholder: "Search" }),
        n(
          "CommandList",
          { "aria-label": "Commands" },
          n("CommandEmpty", {}, "No results."),
          n("CommandGroup", { heading: "Suggestions" }, nx("CommandItem", { react: {}, vue: { value: "calendar" } }, "Calendar", n("CommandShortcut", {}, "⌘C")), n("CommandItem", { disabled: true, class: "font-bold" }, "Search")),
          n("CommandSeparator", {}),
          n("CommandGroup", { heading: "Settings", class: "p-2" }, n("CommandItem", {}, "Profile")),
        ),
      ),
    ],
  ],
  combobox: [
    ["closed", n("Combobox", {}, n("ComboboxInput", { placeholder: "Framework", "aria-label": "Framework" }), n("ComboboxContent", {}, n("ComboboxList", {}, n("ComboboxItem", { value: "a" }, "A"))))],
    ["with the clear button, no trigger, a class", n("Combobox", {}, n("ComboboxInput", { showClear: true, showTrigger: false, class: "w-60", "aria-label": "Framework" }))],
  ],
  "navigation-menu": [
    [
      "closed, a trigger and a link",
      n(
        "NavigationMenu",
        {},
        n(
          "NavigationMenuList",
          {},
          n("NavigationMenuItem", { value: "start" }, n("NavigationMenuTrigger", {}, "Getting started"), n("NavigationMenuContent", {}, n("NavigationMenuLink", { href: "/docs" }, "Introduction"))),
          n("NavigationMenuItem", { value: "docs", class: "ms-2" }, n("NavigationMenuLink", { href: "/docs", active: true }, "Docs")),
        ),
      ),
    ],
    ["without the viewport", n("NavigationMenu", { viewport: false, class: "w-80" }, n("NavigationMenuList", {}, n("NavigationMenuItem", {}, n("NavigationMenuLink", { href: "/" }, "Home"))))],
  ],
  // The long tail. A chart's container (an id, so both name it alike; its plot is its library's).
  chart: [["a container with an id and a class", n("ChartContainer", { id: "sales", class: "h-40", config: { desktop: { label: "Desktop", color: "var(--chart-1)" } } }, n("div", {}, "plot"))]],
  "message-scroller": [
    [
      "every part, opening at the end",
      n(
        "MessageScrollerProvider",
        {},
        n(
          "MessageScroller",
          { class: "h-40" },
          n("MessageScrollerViewport", { "aria-label": "Chat" }, n("MessageScrollerContent", { class: "p-4" }, n("MessageScrollerItem", {}, "a"), n("MessageScrollerItem", { messageId: "b", scrollAnchor: true, class: "px-2" }, "b"))),
          n("MessageScrollerButton", {}),
          n("MessageScrollerButton", { direction: "start", variant: "ghost", class: "size-6" }),
        ),
      ),
    ],
    ["opening at the start, empty", n("MessageScrollerProvider", { defaultScrollPosition: "start" }, n("MessageScroller", {}, n("MessageScrollerViewport", {}, n("MessageScrollerContent", {}))))],
  ],
  questionnaire: [
    [
      "with items and letter shortcuts, every part",
      n(
        "Questionnaire",
        { items: [{ name: "tone", required: true, choices: [{ value: "warm" }, { value: "plain", disabled: true }] }, { name: "name" }], defaultItem: "tone", shortcuts: "letters", class: "w-80" },
        n("QuestionnaireProgress", {}),
        n(
          "QuestionnaireItem",
          { name: "tone", required: true },
          n("QuestionnaireTitle", {}, "How should it sound?"),
          n("QuestionnaireDescription", {}, "Pick one."),
          n("QuestionnaireChoices", {}, n("QuestionnaireChoice", { value: "warm" }, "Warm", n("QuestionnaireChoiceDescription", {}, "Friendly")), n("QuestionnaireChoice", { value: "plain", disabled: true, class: "mt-2" }, "Plain")),
          n("QuestionnaireError", {}),
        ),
        n("QuestionnaireItem", { name: "name" }, n("QuestionnaireTitle", {}, "Your name"), n("QuestionnaireInput", { placeholder: "Ada" }), n("QuestionnaireError", { class: "text-2" }, "Say who you are.")),
        n("QuestionnaireActions", {}, n("QuestionnairePrevious", {}), n("QuestionnaireSkip", {}), n("QuestionnaireNext", {}), n("QuestionnaireSubmit", { variant: "outline" }, "Send")),
      ),
    ],
    [
      "without items, several answers, a checked default",
      n(
        "Questionnaire",
        {},
        n("QuestionnaireProgress", {}, "Step"),
        n("QuestionnaireItem", { name: "topics", multiple: true }, n("QuestionnaireTitle", {}, "Topics"), n("QuestionnaireChoices", {}, n("QuestionnaireChoice", { value: "a", defaultChecked: true }, "A"), n("QuestionnaireChoice", { value: "b" }, "B"))),
        n("QuestionnaireActions", {}, n("QuestionnaireSkip", {}), n("QuestionnaireSubmit", {})),
      ),
    ],
  ],
};

// The custom system's own intent, where a component has intents.
export const CUSTOM_CASES: Cases = {
  badge: [["the custom intent", n("Badge", { intent: "accent" }, "New")]],
  alert: [["the custom intent", n("Alert", { variant: "soft", intent: "accent" }, "!")]],
  bubble: [["the custom intent", n("Bubble", { variant: "soft", intent: "accent" }, n("BubbleContent", {}, "Hi"))]],
};

// Mounted in a DOM: what opens in a portal.
export const DOM_CASES: Cases = {
  select: [
    [
      "open, over the trigger",
      n(
        "Select",
        { defaultOpen: true, defaultValue: "apple" },
        n("SelectTrigger", {}, n("SelectValue", {})),
        n(
          "SelectContent",
          {},
          n("SelectGroup", {}, n("SelectLabel", {}, "Fruit"), n("SelectItem", { value: "apple" }, "Apple"), n("SelectItem", { value: "pear", disabled: true }, "Pear")),
          n("SelectSeparator", {}),
          n("SelectItem", { value: "fig", class: "font-bold" }, "Fig"),
        ),
      ),
    ],
    ["open, as a popper", n("Select", { defaultOpen: true }, n("SelectTrigger", {}, n("SelectValue", { placeholder: "Fruit" })), n("SelectContent", { position: "popper", class: "w-60" }, n("SelectItem", { value: "a" }, "A")))],
  ],
  tooltip: [["open", n("Tooltip", { defaultOpen: true }, n("TooltipTrigger", {}, "Help"), n("TooltipContent", { class: "max-w-40" }, "Text"))]],
  popover: [
    [
      "open",
      n("Popover", { defaultOpen: true }, n("PopoverTrigger", {}, "Open"), n("PopoverContent", { class: "w-80" }, n("PopoverHeader", {}, n("PopoverTitle", {}, "Title"), n("PopoverDescription", {}, "Text")))),
    ],
  ],
  "dropdown-menu": [
    [
      "open, every kind of row",
      n(
        "DropdownMenu",
        { defaultOpen: true },
        n("DropdownMenuTrigger", {}, "Open"),
        n(
          "DropdownMenuContent",
          { class: "w-56" },
          n("DropdownMenuLabel", { inset: true }, "Account"),
          n("DropdownMenuGroup", {}, n("DropdownMenuItem", {}, "Profile", n("DropdownMenuShortcut", {}, "⌘P")), n("DropdownMenuItem", { variant: "destructive", disabled: true }, "Delete")),
          n("DropdownMenuSeparator", {}),
          nx("DropdownMenuCheckboxItem", { react: { checked: true }, vue: { modelValue: true } }, "Status bar"),
          nx("DropdownMenuRadioGroup", { react: { value: "top" }, vue: { modelValue: "top" } },n("DropdownMenuRadioItem", { value: "top" }, "Top"), n("DropdownMenuRadioItem", { value: "bottom" }, "Bottom")),
          n("DropdownMenuSub", {}, n("DropdownMenuSubTrigger", { inset: true }, "More"), n("DropdownMenuSubContent", {}, n("DropdownMenuItem", {}, "Email"))),
        ),
      ),
    ],
  ],
  "alert-dialog": [
    [
      "open, every part",
      n(
        "AlertDialog",
        { defaultOpen: true },
        n(
          "AlertDialogContent",
          { size: "sm" },
          n("AlertDialogHeader", {}, n("AlertDialogMedia", {}, "!"), n("AlertDialogTitle", {}, "Delete?"), n("AlertDialogDescription", {}, "It can't be undone.")),
          n("AlertDialogFooter", {}, n("AlertDialogCancel", {}, "Cancel"), n("AlertDialogAction", { variant: "destructive" }, "Delete")),
        ),
      ),
    ],
    ["open, default size, a class of the page's own", n("AlertDialog", { defaultOpen: true }, n("AlertDialogContent", { class: "max-w-2xl" }, n("AlertDialogTitle", {}, "Sure?"), n("AlertDialogDescription", {}, "Text"), n("AlertDialogAction", {}, "OK")))],
  ],
  sheet: [
    [
      "open on the right",
      n(
        "Sheet",
        { defaultOpen: true },
        n("SheetContent", {}, n("SheetHeader", {}, n("SheetTitle", {}, "Edit"), n("SheetDescription", {}, "Change it.")), n("SheetFooter", {}, n("SheetClose", {}, "Done"))),
      ),
    ],
    ["open on the left, no close button", n("Sheet", { defaultOpen: true }, n("SheetContent", { side: "left", showCloseButton: false, class: "w-96" }, n("SheetTitle", {}, "Edit"), n("SheetDescription", {}, "Text")))],
  ],
  // Menus, overlays, pickers and toasts, open. (A context menu opens from a right-click, a toast
  // from toast.add: dom-parity.test.ts opens those.)
  menubar: [
    [
      "a menu open, every kind of row",
      n(
        "Menubar",
        { defaultValue: "file" },
        n(
          "MenubarMenu",
          { value: "file" },
          n("MenubarTrigger", {}, "File"),
          n(
            "MenubarContent",
            { class: "w-56" },
            n("MenubarLabel", { inset: true }, "Tabs"),
            n("MenubarGroup", {}, n("MenubarItem", {}, "New tab", n("MenubarShortcut", {}, "⌘T")), n("MenubarItem", { variant: "destructive", disabled: true }, "Close")),
            n("MenubarSeparator", {}),
            nx("MenubarCheckboxItem", { react: { checked: true }, vue: { modelValue: true } }, "Bookmarks"),
            nx("MenubarRadioGroup", { react: { value: "ada" }, vue: { modelValue: "ada" } }, n("MenubarRadioItem", { value: "ada" }, "Ada"), n("MenubarRadioItem", { value: "bo" }, "Bo")),
            n("MenubarSub", {}, n("MenubarSubTrigger", { inset: true }, "Share"), n("MenubarSubContent", {}, n("MenubarItem", {}, "Email"))),
          ),
        ),
        n("MenubarMenu", { value: "edit" }, n("MenubarTrigger", {}, "Edit")),
      ),
    ],
  ],
  "hover-card": [["open", n("HoverCard", { defaultOpen: true }, n("HoverCardTrigger", {}, "@ada"), n("HoverCardContent", { class: "w-80", side: "top" }, "Ada Lovelace"))]],
  drawer: [
    [
      "open from the bottom, every part",
      n(
        "Drawer",
        { defaultOpen: true },
        n("DrawerContent", {}, n("DrawerHeader", {}, n("DrawerTitle", {}, "Move goal"), n("DrawerDescription", {}, "Set your goal.")), n("DrawerFooter", { class: "gap-4" }, n("DrawerClose", {}, "Cancel"))),
      ),
    ],
    ["open on the right", n("Drawer", { defaultOpen: true, direction: "right" }, n("DrawerContent", { class: "max-w-md" }, n("DrawerTitle", {}, "Edit"), n("DrawerDescription", {}, "Text")))],
  ],
  command: [
    [
      "in a dialog, open",
      n(
        "CommandDialog",
        { defaultOpen: true, class: "max-w-lg" },
        n("Command", {}, n("CommandInput", {}), n("CommandList", {}, n("CommandGroup", { heading: "Settings" }, nx("CommandItem", { react: {}, vue: { value: "profile" } }, "Profile")))),
      ),
    ],
  ],
  combobox: [
    [
      "open, with a choice",
      n(
        "Combobox",
        { defaultOpen: true, defaultValue: "Nuxt" },
        n("ComboboxInput", { "aria-label": "Framework", showClear: true }),
        n(
          "ComboboxContent",
          { class: "w-72" },
          n("ComboboxEmpty", {}, "No match."),
          n(
            "ComboboxList",
            {},
            n("ComboboxGroup", {}, n("ComboboxLabel", {}, "Frameworks"), n("ComboboxItem", { value: "Next.js" }, "Next.js"), n("ComboboxItem", { value: "Nuxt" }, "Nuxt")),
            n("ComboboxSeparator", {}),
            n("ComboboxItem", { value: "Astro", disabled: true, class: "font-bold" }, "Astro"),
          ),
        ),
      ),
    ],
  ],
  "navigation-menu": [
    [
      "a panel open in the viewport",
      n(
        "NavigationMenu",
        { defaultValue: "start" },
        n(
          "NavigationMenuList",
          {},
          n("NavigationMenuItem", { value: "start" }, n("NavigationMenuTrigger", {}, "Getting started"), n("NavigationMenuContent", { class: "w-80" }, n("NavigationMenuLink", { href: "/docs", active: true }, "Introduction"))),
          n("NavigationMenuItem", { value: "docs" }, n("NavigationMenuLink", { href: "/docs" }, "Docs")),
        ),
      ),
    ],
    // Radix draws the indicator once it has measured the trigger, which happy-dom never lays out;
    // its classes are held by class-parity.
    [
      "a panel open under its item, no viewport",
      n(
        "NavigationMenu",
        { defaultValue: "start", viewport: false },
        n("NavigationMenuList", {}, n("NavigationMenuItem", { value: "start" }, n("NavigationMenuTrigger", { class: "px-4" }, "Start"), n("NavigationMenuContent", {}, n("NavigationMenuLink", { href: "/" }, "Home")))),
      ),
    ],
  ],
};
