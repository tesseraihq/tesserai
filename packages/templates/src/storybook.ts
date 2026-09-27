import { commentText } from "./source-comment";
import { componentName, includedComponents, type DesignSystem } from "@tesserai/core";
import { CATALOG } from "./pages/catalog";
import { printPage, type PagePrinter } from "./pages/print";
import { specBuilder, type PageSpec } from "./pages/spec";

// A Storybook for the system: a story file per component, each showing an example and, for
// components with options, every option side by side. The examples are page specs printed by the
// same per-library printer as the pages, so they're right for Base UI, Radix and React Aria and
// type-check like the components. Button, Badge and Toggle also get live controls.

export type StorybookFramework = "react-vite" | "nextjs-vite" | "vue3-vite" | "sveltekit" | "svelte-vite";

type Add = ReturnType<typeof specBuilder>["add"];
const text = (add: Add, t: string) => add("Text", { text: t });
const options = (...labels: string[]) => labels.map((label) => ({ value: label.toLowerCase().replace(/\s+/g, "-"), label }));

// One example per component the page catalog can build, as a spec's root.
export const STORY_EXAMPLES: Record<string, (add: Add) => string> = {
  button: (add) => add("Button", { label: "Save changes" }),
  badge: (add) => add("Badge", { label: "New" }),
  input: (add) => add("Field", { label: "Email", description: "We'll only use it to send receipts." }, [add("Input", { type: "email", placeholder: "you@example.com" })]),
  textarea: (add) => add("Field", { label: "Message" }, [add("Textarea", { placeholder: "Tell us a little about your project" })]),
  checkbox: (add) => add("Checkbox", { label: "Email me about product updates", defaultChecked: true }),
  switch: (add) => add("Switch", { label: "Notifications", defaultChecked: true }),
  "radio-group": (add) => add("RadioGroup", { label: "Plan", options: options("Starter", "Pro", "Team"), defaultValue: "pro" }),
  slider: (add) => add("Slider", { label: "Volume", min: 0, max: 100, defaultValue: [40] }),
  select: (add) => add("Select", { label: "Fruit", options: options("Apple", "Banana", "Blueberry", "Grapes"), placeholder: "Choose a fruit" }),
  "input-otp": (add) => add("InputOTP", { label: "Verification code", length: 6 }),
  tabs: (add) =>
    add("Tabs", { tabs: options("Account", "Password"), defaultValue: "account" }, [], {
      account: [text(add, "Change your name and email here.")],
      password: [text(add, "Change your password here. After saving, you'll be signed out.")],
    }),
  card: (add) =>
    add("Card", { title: "Invite your team", description: "Anyone you invite can edit this project." }, [add("Field", { label: "Email" }, [add("Input", { type: "email", placeholder: "teammate@example.com" })])], {
      footer: [add("Button", { label: "Send invite" })],
    }),
  alert: (add) => add("Alert", { title: "Your trial ends in 3 days", description: "Add a payment method to keep your projects." }),
  separator: (add) => add("Stack", {}, [text(add, "Account"), add("Separator", {}), text(add, "Billing")]),
  avatar: (add) => add("Avatar", { name: "Ada Lovelace" }),
  progress: (add) => add("Progress", { label: "Uploading", value: 60 }),
  breadcrumb: (add) => add("Breadcrumb", { links: ["Home", "Projects"], current: "Design system" }),
  pagination: (add) => add("Pagination", { current: 3, last: 10 }),
  accordion: (add) =>
    add("Accordion", { items: [{ value: "shipping", title: "How long does shipping take?" }, { value: "returns", title: "Can I return an item?" }] }, [], {
      shipping: [text(add, "Orders ship within two working days.")],
      returns: [text(add, "Yes, within 30 days of delivery.")],
    }),
  toggle: (add) => add("Toggle", { label: "Bold", defaultPressed: true }),
  "toggle-group": (add) => add("ToggleGroup", { label: "Alignment", options: options("Left", "Center", "Right") }),
  "dropdown-menu": (add) =>
    add("DropdownMenu", { items: [{ label: "Profile" }, { label: "Settings" }, { label: "Log out", destructive: true, separatorBefore: true }] }, [], {
      trigger: [add("Button", { label: "Open menu", variant: "outline" })],
    }),
  popover: (add) =>
    add("Popover", { title: "Dimensions", description: "Set the size of the layer." }, [add("Field", { label: "Width" }, [add("Input", { defaultValue: "100%" })])], {
      trigger: [add("Button", { label: "Open popover", variant: "outline" })],
    }),
  sheet: (add) =>
    add("Sheet", { title: "Edit profile", description: "Make changes to your profile here." }, [add("Field", { label: "Name" }, [add("Input", { defaultValue: "Ada Lovelace" })])], {
      trigger: [add("Button", { label: "Open sheet", variant: "outline" })],
      footer: [add("Button", { label: "Save", closes: true })],
    }),
  dialog: (add) =>
    add("Dialog", { title: "Share this document", description: "Anyone with the link can view it." }, [add("Field", { label: "Link" }, [add("Input", { defaultValue: "https://example.com/doc/42" })])], {
      trigger: [add("Button", { label: "Share", variant: "outline" })],
      footer: [add("Button", { label: "Done", closes: true })],
    }),
  "alert-dialog": (add) =>
    add("AlertDialog", { title: "Delete this project?", description: "This can't be undone.", confirm: "Delete" }, [], {
      trigger: [add("Button", { label: "Delete project", intent: "danger" })],
    }),
  field: (add) => add("Field", { label: "Username", description: "This is your public display name.", error: "That name is taken." }, [add("Input", { defaultValue: "ada" })]),
  label: (add) => add("Label", { text: "Email address" }),
  kbd: (add) => add("Row", { gap: 3 }, [add("Kbd", { keys: ["⌘", "K"] }), add("Text", { text: "to search" })]),
  skeleton: (add) => add("Row", { gap: 4 }, [add("Skeleton", { shape: "circle" }), add("Stack", { gap: 2 }, [add("Skeleton", { shape: "line", width: "sm" }), add("Skeleton", { shape: "line", width: "xs" })])]),
  spinner: (add) => add("Spinner", {}),
  "aspect-ratio": (add) => add("AspectRatio", { ratio: "16:9" }, [add("Text", { text: "16 : 9" })]),
  typography: (add) =>
    add("Stack", { gap: 3 }, [
      add("Typography", { kind: "h2", text: "The king's plan" }),
      add("Typography", { kind: "lead", text: "Once upon a time, a very lazy king spent all day on his throne." }),
      add("Typography", { kind: "p", text: "He thought long and hard, and finally came up with a plan: he would tax the jokes in the kingdom." }),
      add("Typography", { kind: "blockquote", text: "After all, everyone enjoys a good joke, so it's only fair they should pay for the privilege." }),
      add("Typography", { kind: "muted", text: "Chapter 2 of 12" }),
    ]),
  empty: (add) =>
    add("Empty", { title: "No projects yet", description: "Create your first project to get started.", icon: "folder" }, [], { action: [add("Button", { label: "Create project", size: "sm" })] }),
  item: (add) =>
    add("Item", { title: "Two-factor authentication", description: "Ask for a code when you sign in on a new device.", icon: "settings", variant: "outline" }, [], {
      actions: [add("Button", { label: "Set up", variant: "outline", size: "sm" })],
    }),
  "button-group": (add) => add("ButtonGroup", { label: "Message actions" }, [add("Button", { label: "Reply", variant: "outline" }), add("Button", { label: "Archive", variant: "outline" }), add("Button", { label: "Report", variant: "outline" })]),
  "input-group": (add) => add("InputGroup", { label: "Website", prefix: "https://", suffix: ".com", placeholder: "example" }),
  "native-select": (add) => add("NativeSelect", { label: "Plan", options: options("Starter", "Team", "Enterprise"), placeholder: "Choose a plan" }),
  collapsible: (add) =>
    add("Collapsible", { title: "3 repositories starred", defaultOpen: true }, [add("Text", { text: "tesserai/core" }), add("Text", { text: "tesserai/templates" }), add("Text", { text: "tesserai/builder" })]),
  "scroll-area": (add) => add("ScrollArea", { height: "sm" }, Array.from({ length: 16 }, (_, i) => add("Text", { text: `v1.2.0-beta.${16 - i}` }))),
  tooltip: (add) => add("Tooltip", { text: "A short hint." }, [], { trigger: [add("Button", { label: "Hover me", variant: "outline" })] }),
  "hover-card": (add) =>
    add("HoverCard", {}, [add("Text", { text: "Ada Lovelace", tone: "strong" }), add("Text", { text: "Wrote the first program, for a machine that didn't exist yet.", tone: "muted" })], {
      trigger: [add("Button", { label: "@ada", variant: "link" })],
    }),
  sidebar: (add) =>
    add("AppShell", { brand: "Acme", nav: [{ label: "Home", icon: "home", active: true }, { label: "Inbox", icon: "inbox", badge: "3" }, { label: "Settings", icon: "settings" }] }, [add("Page", {}, [add("Heading", { text: "Home" })])]),
  drawer: (add) =>
    add("Drawer", { title: "Move goal", description: "Set your daily activity goal." }, [add("Slider", { label: "Goal", min: 100, max: 800, defaultValue: [350] })], {
      trigger: [add("Button", { label: "Open drawer", variant: "outline" })],
      footer: [add("Button", { label: "Submit" }), add("Button", { label: "Cancel", variant: "outline", closes: true })],
    }),
  "context-menu": (add) => add("ContextMenu", { items: [{ label: "Back" }, { label: "Reload" }, { label: "Save as…" }, { label: "Delete", destructive: true, separatorBefore: true }] }, [add("Text", { text: "Right-click here" })]),
  menubar: (add) =>
    add("Menubar", {
      label: "Application",
      menus: [
        { label: "File", items: [{ label: "New tab", shortcut: "⌘T" }, { label: "New window", shortcut: "⌘N" }, { label: "Print", shortcut: "⌘P", separatorBefore: true }] },
        { label: "Edit", items: [{ label: "Undo", shortcut: "⌘Z" }, { label: "Redo", shortcut: "⇧⌘Z" }] },
        { label: "View", items: [{ label: "Zoom in" }, { label: "Zoom out" }] },
      ],
    }),
  command: (add) =>
    add("Command", {
      groups: [
        { heading: "Suggestions", items: [{ label: "Calendar", icon: "calendar" }, { label: "Search", icon: "search" }] },
        { heading: "Settings", items: [{ label: "Profile", icon: "user", shortcut: "⌘P" }, { label: "Settings", icon: "settings", shortcut: "⌘S" }] },
      ],
    }),
  combobox: (add) => add("Combobox", { label: "Framework", placeholder: "Select a framework", options: ["Next.js", "SvelteKit", "Nuxt", "Remix", "Astro"] }),
  "navigation-menu": (add) =>
    add("NavigationMenu", {
      items: [
        { label: "Getting started", links: [{ title: "Introduction", text: "What a design system is made of." }, { title: "Installation", text: "Add the components to your app." }] },
        { label: "Components", links: [{ title: "Button" }, { title: "Dialog" }, { title: "Select" }] },
        { label: "Docs" },
      ],
    }),
  toast: (add) => add("Toast", { label: "Show a toast", title: "Changes saved", description: "Your system is up to date." }),
  sonner: (add) => add("Sonner", { label: "Show a toast", title: "Event created", description: "Sunday at 9:00", kind: "success" }),
  resizable: (add) => add("Resizable", { panels: 2 }, [], { "panel-1": [add("Text", { text: "Sidebar" })], "panel-2": [add("Text", { text: "Content" })] }),
  carousel: (add) => add("Carousel", { label: "Numbers", slides: 3 }, [], { "slide-1": [add("Heading", { text: "1" })], "slide-2": [add("Heading", { text: "2" })], "slide-3": [add("Heading", { text: "3" })] }),
  calendar: (add) => add("Calendar", { label: "Date" }),
  "date-picker": (add) => add("DatePicker", {}),
  chart: (add) =>
    add("Chart", {
      kind: "bar",
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      series: [
        { label: "Desktop", values: [186, 305, 237, 73, 209, 214] },
        { label: "Mobile", values: [80, 200, 120, 190, 130, 140] },
      ],
    }),
  "data-table": (add) =>
    add("DataTable", {
      label: "Payments",
      columns: [
        { key: "status", label: "Status" },
        { key: "email", label: "Email" },
        { key: "amount", label: "Amount" },
      ],
      rows: [
        { status: "success", email: "ken@example.com", amount: 316 },
        { status: "processing", email: "abe@example.com", amount: 242 },
        { status: "failed", email: "ada@example.com", amount: 837 },
      ],
      filter: "email",
    }),
  message: (add) =>
    add("MessageGroup", {}, [add("Message", { author: "Ada Lovelace", initials: "AL", text: "Has the new palette landed?" }), add("Message", { text: "Yes, it shipped this morning.", footer: "Read 9:41", mine: true })]),
  bubble: (add) => add("Bubble", { text: "Looks great on all three libraries.", reactions: "👍 3" }),
  attachment: (add) => add("Attachment", { name: "brief.pdf", detail: "1.2 MB" }),
  marker: (add) => add("Marker", { text: "Today", variant: "separator" }),
  "message-scroller": (add) =>
    add("MessageScroller", { label: "Conversation", height: "sm" }, Array.from({ length: 8 }, (_, i) => add("Text", { text: i % 2 === 0 ? `Question ${i / 2 + 1}: how do tokens reach the preview?` : "Through CSS variables, refreshed on every change." }))),
  questionnaire: (add) =>
    add("Questionnaire", {
      questions: [
        { title: "How should the assistant sound?", description: "Pick one.", choices: ["Plain and direct", "Warm", "Formal"] },
        { title: "What should every update include?", description: "Select all that apply.", multiple: true, choices: ["Progress", "Decisions", "Next step"] },
      ],
      submit: "Save",
    }),
  table: (add) =>
    add("Table", { label: "Invoices", columns: [{ label: "Invoice" }, { label: "Status" }, { label: "Amount", align: "end", mono: true }] }, [
      add("TableRow", {}, [text(add, "INV-001"), add("Badge", { label: "Paid" }), text(add, "$250.00")]),
      add("TableRow", {}, [text(add, "INV-002"), add("Badge", { label: "Pending", intent: "warning" }), text(add, "$150.00")]),
    ]),
};

// Examples that fill their width (a progress bar, a table) get one, since Storybook centers stories.
export const STORY_WIDTH: Record<string, string> = {
  input: "w-80", textarea: "w-80", slider: "w-80", progress: "w-80", select: "w-80", "input-otp": "w-80", "radio-group": "w-80",
combobox: "w-72", command: "w-96 max-w-full", chart: "w-[32rem] max-w-full", "data-table": "w-[40rem] max-w-full", message: "w-[28rem] max-w-full", "message-scroller": "w-[28rem] max-w-full", questionnaire: "w-[28rem] max-w-full", resizable: "w-[28rem] max-w-full", marker: "w-80", "context-menu": "w-80", carousel: "w-96 max-w-full",
  "input-group": "w-80", "native-select": "w-80", collapsible: "w-72", "scroll-area": "w-64", item: "w-[28rem] max-w-full", empty: "w-[28rem] max-w-full", "aspect-ratio": "w-80", typography: "w-[32rem] max-w-full", sidebar: "h-[28rem] w-[48rem] max-w-full", field: "w-80",
  tabs: "w-[28rem] max-w-full", card: "w-[28rem] max-w-full", accordion: "w-[28rem] max-w-full", table: "w-[36rem] max-w-full", separator: "w-80", alert: "w-[28rem] max-w-full",
};

// Components whose root takes text and the system's options as props: they get live controls.
const CONTROLLED: Record<string, string> = { button: "Button", badge: "Badge", toggle: "Toggle" };

const pascal = (id: string) => id.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");

function specOf(build: (add: Add) => string): PageSpec {
  const { add, spec } = specBuilder();
  return spec(build(add));
}

// A spec with one element per option of an axis, in a row: every variant, intent or size.
function axisSpec(component: string, type: string, axis: "variant" | "intent" | "size", values: readonly string[]): PageSpec | null {
  const example = STORY_EXAMPLES[component];
  if (example === undefined) return null;
  const { add, spec } = specBuilder();
  const base = specOf(example);
  const root = base.elements[base.root]!;
  if (root.type !== type) return null;
  const items = values.map((value) => add(type, { ...root.props, [axis]: value }));
  return spec(add("Row", { gap: 3 }, items));
}

export type StorybookOptions = {
  framework: StorybookFramework;
  // Where the stories go, relative to the project ("src/stories/tesserai").
  storiesDir: string;
  // The stylesheet with Tailwind and tesserai.css, relative to .storybook.
  stylesheet: string;
};

export type StorybookResult = { files: { path: string; source: string }[]; covered: string[]; uncovered: string[] };

// Every file of the Storybook: its config, and per component a story file and its printed examples.
export function storybookFiles(system: DesignSystem, generated: readonly { path: string; source: string }[], options: StorybookOptions): StorybookResult {
  const framework = `@storybook/${options.framework}`;
  const files: { path: string; source: string }[] = [
    {
      path: ".storybook/main.ts",
      source: `// Storybook for the ${commentText(system.name)} design system, generated by tesserai. \`npx @tesserai/cli sync\` keeps it current.
import type { StorybookConfig } from "${framework}";

const config: StorybookConfig = {
  framework: "${framework}",
  stories: ["../${options.storiesDir}/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-themes"],
};

export default config;
`,
    },
    {
      path: ".storybook/preview.tsx",
      source: `import type { Preview } from "${framework}";
import { withThemeByClassName } from "@storybook/addon-themes";
// Tailwind and the system's tokens, as the app loads them.
import "${options.stylesheet}";

// The canvas is the system's page, in light and dark.
document.body.style.background = "var(--surface-page)";
document.body.style.color = "var(--color-neutral-text-strong)";

const preview: Preview = {
  globalTypes: {
    density: {
      description: "How much fits on screen",
      toolbar: {
        title: "Density",
        icon: "component",
        items: [
          { value: "compact", title: "Compact" },
          { value: "default", title: "Default" },
          { value: "comfortable", title: "Comfortable" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { density: "default" },
  decorators: [
    // Dark mode is the dark class on <html>, as in the app.
    withThemeByClassName({ themes: { light: "", dark: "dark" }, defaultTheme: "light" }),
    (Story, context) => {
      document.documentElement.dataset["density"] = String(context.globals["density"] ?? "default");
      return <Story />;
    },
  ],
  parameters: { layout: "centered", a11y: { test: "todo" } },
};

export default preview;
`,
    },
  ];

  const included = includedComponents(system);
  const covered: string[] = [];
  const uncovered: string[] = [];
  for (const [component, anatomy] of Object.entries(included)) {
    const example = STORY_EXAMPLES[component];
    // A provider (text direction) has nothing to show.
    if (example === undefined) {
      if (CONTROLLED[component] === undefined && component !== "direction") uncovered.push(component);
    }
    const title = componentName(component);
    const imports: string[] = [];
    const stories: string[] = [];
    const exampleFiles: { path: string; source: string }[] = [];
    const print = (spec: PageSpec, name: string) => {
      const printed = printPage(spec, system, generated, name);
      // A component this library doesn't generate has no story (React Aria has no navigation menu).
      if (printed.problems.length > 0 || printed.source === "" || printed.missing.includes(component)) return false;
      exampleFiles.push({ path: `${options.storiesDir}/examples/${name}.tsx`, source: printed.source });
      return true;
    };

    if (example !== undefined && print(specOf(example), component)) {
      imports.push(`import ${pascal(component)}Example from "./examples/${component}";`);
      const wrap = (jsx: string) => (STORY_WIDTH[component] === undefined ? jsx : `<div className="${STORY_WIDTH[component]}">${jsx}</div>`);
      stories.push(`export const Example: Story = { render: () => ${wrap(`<${pascal(component)}Example />`)} };`);
      // Every option of each axis the example's element takes.
      const root = specOf(example);
      const type = root.elements[root.root]!.type;
      for (const axis of CATALOG[type]?.axes ?? []) {
        const values = anatomy.axes[axis]?.enabled ?? [];
        if (values.length < 2) continue;
        const spec = axisSpec(component, type, axis, values);
        const name = `${component}-${axis}s`;
        if (spec !== null && print(spec, name)) {
          imports.push(`import ${pascal(name)} from "./examples/${name}";`);
          stories.push(`export const ${pascal(`all-${axis}s`)}: Story = { render: () => ${wrap(`<${pascal(name)} />`)} };`);
        }
      }
    }

    const controlled = CONTROLLED[component];
    let meta: string;
    if (controlled !== undefined && generated.some((f) => f.path === `components/ui/${component}.tsx`)) {
      imports.unshift(`import { ${controlled} } from "@/components/ui/${component}";`);
      const argTypes = (["variant", "intent", "size"] as const)
        .filter((axis) => (anatomy.axes[axis]?.enabled.length ?? 0) > 1)
        .map((axis) => `    ${axis}: { control: "select", options: ${JSON.stringify(anatomy.axes[axis]!.enabled)} },`);
      const args = (["variant", "intent", "size"] as const)
        .filter((axis) => anatomy.axes[axis]?.default !== undefined)
        .map((axis) => `${axis}: ${JSON.stringify(anatomy.axes[axis]!.default)}`);
      meta = `const meta = {
  title: "Components/${title}",
  component: ${controlled},
  args: { ${[...args, `children: ${JSON.stringify(component === "badge" ? "New" : component === "toggle" ? "Bold" : "Button")}`].join(", ")} },
  argTypes: {
${argTypes.join("\n")}
  },
} satisfies Meta<typeof ${controlled}>;`;
      stories.unshift(`export const Playground: Story = {};`);
    } else {
      if (stories.length === 0) continue;
      meta = `const meta = { title: "Components/${title}" } satisfies Meta;`;
    }
    covered.push(component);
    files.push(...exampleFiles, {
      path: `${options.storiesDir}/${component}.stories.tsx`,
      source: `// ${commentText(title)}, generated by tesserai from the ${commentText(system.name)} design system. \`npx @tesserai/cli sync\` keeps it current.
import type { Meta, StoryObj } from "${framework}";
${imports.join("\n")}

${meta}

export default meta;
type Story = StoryObj<typeof meta>;

${stories.join("\n")}
`,
    });
  }
  return { files, covered, uncovered: uncovered.filter((c) => !covered.includes(c)) };
}

// A component's example as code for the system's library (the story's Example), or null. `printer`
// writes it for Vue or Svelte instead (see pagePrinting).
export function exampleSource(system: DesignSystem, generated: readonly { path: string; source: string }[], component: string, printer?: PagePrinter): string | null {
  const example = STORY_EXAMPLES[component];
  if (example === undefined) return null;
  const printed = printPage(specOf(example), system, generated, `${component}-example`, printer === undefined ? {} : { printer });
  if (printed.problems.length > 0 || printed.source === "" || printed.missing.includes(component)) return null;
  // As a reader copies it: no "generated by" line, and named for what it is.
  return printed.source.replace(/^(\/\/[^\n]*|<!--[^\n]*-->)\n/, "").replace(/ExamplePage\b/g, "Example");
}

// The stories every system can have, whatever it includes: an example per catalog component and a
// grid per axis its element takes. The hosted Storybook's sidebar is built from this.
export function storyPlan(): { component: string; axes: ("variant" | "intent" | "size")[] }[] {
  return Object.entries(STORY_EXAMPLES).map(([component, example]) => {
    const spec = specOf(example);
    const type = spec.elements[spec.root]!.type;
    return { component, axes: [...(CATALOG[type]?.axes ?? [])] };
  });
}

// For the Vue and Svelte Storybooks (storybook-frameworks.ts), which tell the same stories.
export { CONTROLLED as STORY_CONTROLLED, specOf as storySpec, axisSpec as storyAxisSpec };
