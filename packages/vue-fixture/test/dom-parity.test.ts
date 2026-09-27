import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { supportedComponents } from "@tesserai/templates";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import type { VNode } from "vue";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLoader, FIXTURE_DIR, type Loader } from "../harness";
import { CUSTOM_CASES, DOM_CASES, SSR_CASES } from "./cases";
import { ACCEPTED_DATA, acceptedData, rekaVars, seenData, slotsOf, type SlotElement } from "./slots";
import { SYSTEMS, writeRun } from "./systems";
import { n, nx, toReact, toVue, type Tree } from "./tree";

// DOM parity, mounted: what only renders in a browser (an open dialog, select, menu, popover or
// tooltip, whose parts go through a portal into document.body), and every server-rendered case
// again once mounted (where a part changes what it writes after mounting). Both frameworks mount
// into the same happy-dom document, one after the other, and the data-slot elements in the body
// are compared: tag, data attributes, classes.

// Only in a mounted DOM: what a library writes on an open layer.
const MENU_ROW = "Radix writes the menu's orientation on every row, Reka on none; a menu is always vertical and no class of its rows reads it";
const ACCEPTED_DOM_DATA: Record<string, string> = {
  "data-dismissable-layer": "Reka marks an open layer (dialog, menu, popover) so its outside-click and focus handling can find it; no class selects on it",
  "data-radix-popper-side": "Radix marks an open popup's anchor (the trigger) with the side the popup took, for its own use; no class selects on it (the popup's own data-side, which classes do read, both write)",
  "data-radix-popper-align": "The same, for the alignment",
  "data-radix-menu-content": "Radix marks a menu's content for its own focus handling; no class selects on it",
  "data-reka-menu-content": "Reka's name for the same marker",
  "dropdown-menu-item/data-orientation": MENU_ROW,
  "dropdown-menu-checkbox-item/data-orientation": MENU_ROW,
  "dropdown-menu-radio-item/data-orientation": MENU_ROW,
  "dropdown-menu-sub-trigger/data-orientation": MENU_ROW,
  ...Object.fromEntries(
    ["input-otp/data-input-otp-mss", "input-otp/data-input-otp-mse"].map((k) => [
      k,
      "vue-input-otp writes where the input's selection starts and ends from the moment it's mounted, input-otp once there is a selection; no class reads them",
    ]),
  ),
  // Menus, overlays, pickers and toasts.
  ...Object.fromEntries(["menubar", "context-menu"].flatMap((menu) => ["item", "checkbox-item", "radio-item", "sub-trigger"].map((row) => [`${menu}-${row}/data-orientation`, MENU_ROW]))),
  "data-radix-menubar-content": "Radix marks a menubar menu's content for its own focus handling; no class selects on it",
  "data-reka-menubar-content": "Reka's name for the same marker",
  "data-radix-menubar-subtrigger": "Radix marks a menubar submenu's trigger for its own keyboard handling; no class selects on it",
  "data-reka-menubar-subtrigger": "Reka's name for the same marker",
  "data-vaul-animate": "Vaul marks whether the drawer animates in (not when it starts open); vaul-vue doesn't write it; no class selects on it",
  "data-vaul-custom-container": "Vaul marks a drawer portalled into a container of the page's own; vaul-vue doesn't write it; no class selects on it",
  "command-group/data-value": "cmdk writes a group's heading as its value, for its own filtering; no class reads it",
  "command-item/data-value": "cmdk writes a row's text as its value, for its own filtering; no class reads it",
  "command-item/data-highlighted": "Reka's mark for the highlighted row (the first, in both), which cmdk writes as data-selected=\"true\"; the classes are written for each (slots.ts REKA_CLASSES)",
  "navigation-menu-content/data-state": "Radix leaves data-state off a panel it draws in the shared viewport (the viewport carries the open state), Reka writes it there too; the panel reads data-state only without a viewport, where both write it",
  ...Object.fromEntries(["combobox-input", "combobox-trigger", "combobox-clear"].map((slot) => [`${slot}/data-popup-open`, "Base UI marks the field's parts while the list is open; their classes don't read it"])),
  ...Object.fromEntries(["combobox-input", "combobox-trigger"].map((slot) => [`${slot}/data-popup-side`, "Base UI marks the field's parts with the side the list opened on; their classes don't read it"])),
  ...Object.fromEntries(["combobox-input", "combobox-trigger"].map((slot) => [`${slot}/data-pressed`, "Base UI marks the field's parts pressed while the list is open; their classes don't read it"])),
  "combobox-clear/data-visible": "Base UI marks its clear button shown (it renders it only then, as the Vue one does); no class reads it",
  "combobox-content/data-anchor-hidden": "Base UI marks the list when the field scrolls out of view; no class reads it",
  "combobox-content/data-base-ui-focusable": "Base UI marks the list focusable for its own focus handling; no class reads it",
  "combobox-content/data-open": "Base UI's open mark, which Reka writes as data-state=open; the list's motion is written for each (slots.ts REKA_CLASSES)",
  "combobox-content/data-state": "Reka's open state on the list, which Base UI writes as data-open; the motion is written for each (REKA_CLASSES)",
  "combobox-content/data-orientation": "Reka's listbox writes its (vertical) orientation on the list; its classes don't read it",
  ...Object.fromEntries(["combobox-content", "combobox-list"].map((slot) => [`${slot}/data-empty`, "Base UI marks the list with no rows of its own collection (the rows here are written out, not given as items); no class reads it"])),
  "data-reka-combobox-viewport": "Reka marks the list's scrolling element for its own lookups; no class selects on it",
  "combobox-item/data-selected": "Base UI's mark for the chosen row, which Reka writes as data-state=checked; the row's classes are written for each (REKA_CLASSES)",
  "combobox-item/data-state": "Reka's mark for the chosen row (checked) and the rest (unchecked), which Base UI writes as data-selected; the classes are written for each (REKA_CLASSES)",
  "combobox-separator/data-orientation": "Base UI writes the separator's (horizontal) orientation; its classes don't read it",
  "data-radix-toast-announce-exclude": "Radix marks a toast's parts left out of its screen-reader announcement; no class selects on it",
  "data-reka-toast-announce-exclude": "Reka's name for the same marker",
  "data-radix-toast-announce-alt": "Radix writes the action's alternative text for the announcement; no class selects on it",
  "data-reka-toast-announce-alt": "Reka's name for the same",
};

type Parts = Record<string, any>;
type Render = {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => ReactElement;
  h: (type: unknown, props?: unknown, children?: unknown) => VNode;
  mountReact: (element: ReactElement) => Promise<() => Promise<void>>;
  mountVue: (render: () => VNode) => Promise<() => Promise<void>>;
  clickReact: (element: HTMLElement) => Promise<void>;
  clickVue: (element: HTMLElement) => Promise<void>;
  actReact: (fn: () => void) => Promise<void>;
  actVue: (fn: () => void) => Promise<void>;
};

let dom: Loader;
let render: Render;
beforeAll(async () => {
  // The DOM goes on globalThis before React or Vue load: Vue's DOM runtime takes `document` then.
  GlobalRegistrator.register({ url: "http://localhost/" });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  dom = await createLoader("dom");
  render = await dom.load<Render>(join(FIXTURE_DIR, "harness/render-dom.ts"));
});
afterAll(async () => {
  await dom.close();
  await GlobalRegistrator.unregister();
});

const accepted = { ...ACCEPTED_DATA, ...ACCEPTED_DOM_DATA };

// Mounts a tree in one framework, reads the body's data-slot elements, unmounts.
async function slotsMounted(mount: () => Promise<() => Promise<void>>): Promise<SlotElement[]> {
  const unmount = await mount();
  const slots = slotsOf(document.body);
  await unmount();
  expect(document.querySelectorAll("[data-slot]")).toHaveLength(0);
  return slots;
}

// The dialog, with children written out, as before the everyday set.
const dialogTree = (content: Record<string, unknown>, title?: string): Tree =>
  n(
    "Dialog",
    { defaultOpen: true },
    n("DialogContent", content, n("DialogHeader", {}, n("DialogTitle", { class: title }, "Invite"), n("DialogDescription", {}, "They'll get an email.")), n("DialogFooter", { showCloseButton: true }, "Send")),
  );

describe.each(Object.keys(SYSTEMS))("%s system", (name) => {
  let react: Parts;
  let vue: Parts;
  beforeAll(async () => {
    const system = SYSTEMS[name]!();
    const reactDir = await writeRun(`dom-${name}-react`, "radix", system);
    const vueDir = await writeRun(`dom-${name}-vue`, "reka-ui", system);
    react = {};
    vue = {};
    for (const component of supportedComponents("reka-ui")) {
      Object.assign(react, await dom.load(join(reactDir, `components/ui/${component}.tsx`)));
      Object.assign(vue, await dom.load(join(vueDir, `components/ui/${component}/index.ts`)));
    }
    toast = { react: await dom.load(join(reactDir, "components/ui/toast.tsx")), vue: await dom.load(join(vueDir, "components/ui/toast/index.ts")) };
    sonner = { react: await dom.load(join(reactDir, "components/ui/sonner.tsx")), vue: await dom.load(join(vueDir, "components/ui/sonner/index.ts")) };
    // Each package's toast(), imported as a page beside the generated Toaster imports it (so it's
    // the same module instance the Toaster listens to).
    writeFileSync(join(reactDir, "sonner-toast.ts"), `export { toast } from "sonner";\n`);
    writeFileSync(join(vueDir, "sonner-toast.ts"), `export { toast } from "vue-sonner";\n`);
    sonnerToast = { react: await dom.load(join(reactDir, "sonner-toast.ts")), vue: await dom.load(join(vueDir, "sonner-toast.ts")) };
  });
  let toast: { react: Parts; vue: Parts };
  let sonner: { react: Parts; vue: Parts };
  let sonnerToast: { react: Parts; vue: Parts };

  const compare = async (tree: Tree) => {
    const reactSlots = acceptedData(rekaVars(await slotsMounted(() => render.mountReact(toReact(tree, react, render) as ReactElement))), accepted);
    const vueSlots = acceptedData(await slotsMounted(() => render.mountVue(() => toVue(tree, vue, render) as VNode)), accepted);
    expect(reactSlots.length).toBeGreaterThan(0);
    expect(vueSlots).toEqual(reactSlots);
    return reactSlots;
  };

  it("Dialog open, with a header, footer and the close button", async () => {
    const slots = await compare(dialogTree({}));
    expect(slots.map((s) => s.slot)).toEqual(["dialog-overlay", "dialog-content", "dialog-header", "dialog-title", "dialog-description", "dialog-footer", "dialog-close"]);
  });

  it("Dialog without the close button, with classes of the page's own", async () => {
    const slots = await compare(dialogTree({ showCloseButton: false, class: "max-w-2xl p-0" }, "text-2"));
    expect(slots.map((s) => s.slot)).toEqual(["dialog-overlay", "dialog-content", "dialog-header", "dialog-title", "dialog-description", "dialog-footer"]);
  });

  const cases = [...Object.entries(DOM_CASES).map(([c, list]) => [c, list, "open"] as const), ...Object.entries(SSR_CASES).map(([c, list]) => [c, [...list, ...(name === "custom" ? (CUSTOM_CASES[c] ?? []) : [])], "mounted"] as const)].flatMap(
    ([component, list, how]) => list.map(([label, tree]) => [`${component} (${how}): ${label}`, tree] as const),
  );
  it.each(cases)("%s", async (_, tree) => {
    await compare(tree);
  });

  // A native select given no value shows the option its markup chooses, as React's does (Vue's
  // v-model on undefined would show none: a blank select, the placeholder option gone).
  it.each([
    ["the first option", n("NativeSelect", { "aria-label": "Plan" }, n("NativeSelectOption", { value: "" }, "Choose a plan"), n("NativeSelectOption", { value: "team" }, "Team"))],
    ["a selected option", n("NativeSelect", {}, n("NativeSelectOption", { value: "a" }, "A"), n("NativeSelectOption", { value: "b", selected: true }, "B"))],
    ["its default value", nx("NativeSelect", { react: { defaultValue: "b" }, vue: { defaultValue: "b" } }, n("NativeSelectOption", { value: "a" }, "A"), n("NativeSelectOption", { value: "b" }, "B"))],
  ] as const)("NativeSelect with no value shows %s, as React's does", async (_, tree) => {
    const shown = async (mount: () => Promise<() => Promise<void>>) => {
      const unmount = await mount();
      const select = document.querySelector<HTMLSelectElement>("[data-slot=native-select]")!;
      const text = select.selectedOptions[0]?.textContent ?? "(none)";
      await unmount();
      return text;
    };
    const r = await shown(() => render.mountReact(toReact(tree, react, render) as ReactElement));
    expect(r).not.toBe("(none)");
    expect(await shown(() => render.mountVue(() => toVue(tree, vue, render) as VNode))).toBe(r);
  });

  // The data table used: sorted by a header, a row selected, the next page. Each click lands in
  // both the same way (TanStack's state, through each adapter's reactivity).
  it("DataTable sorted, a row selected and paged, as React's is", async () => {
    const header = (framework: "react" | "vue") => ({ column }: { column: unknown }) =>
      framework === "react" ? render.createElement(react["DataTableColumnHeader"], { column, title: "Email" }) : render.h(vue["DataTableColumnHeader"], { column, title: "Email" });
    const table = (framework: "react" | "vue") =>
      n("DataTable", {
        label: "People",
        columns: [{ accessorKey: "email", header: header(framework) }, { accessorKey: "amount", header: "Amount" }],
        data: [
          { email: "ken@example.com", amount: 242 },
          { email: "ada@example.com", amount: 316 },
          { email: "abe@example.com", amount: 837 },
        ],
        selectable: true,
        pageSize: 2,
      });
    const clicks = ['[aria-label="Sort by Email"]', '[aria-label="Select row"]', "[data-slot=data-table-footer] button:last-child"];
    const used = async (mount: () => Promise<() => Promise<void>>, click: (el: HTMLElement) => Promise<void>) => {
      const unmount = await mount();
      for (const selector of clicks) await click(document.querySelector<HTMLElement>(selector)!);
      const slots = slotsOf(document.body);
      // Text without spaces: a template's line breaks between a title and its icon aren't JSX's.
      const text = document.querySelector("[data-slot=data-table]")!.textContent.replace(/\s+/g, "");
      await unmount();
      return { slots, text };
    };
    const r = await used(() => render.mountReact(toReact(table("react"), react, render) as ReactElement), render.clickReact);
    const v = await used(() => render.mountVue(() => toVue(table("vue"), vue, render) as VNode), render.clickVue);
    // Sorted by email (abe, ada | ken), the first row selected, on page 2: ken's row.
    expect(r.text).toContain("ken@example.com");
    expect(r.text).not.toContain("abe@example.com");
    expect(r.text).toContain("1of3selected");
    expect(v.text).toBe(r.text);
    expect(acceptedData(v.slots, accepted)).toEqual(acceptedData(rekaVars(r.slots), accepted));
  });

  // What opens only from something the page does: mounted, then acted on in each framework, and
  // the data-slot elements compared.
  const afterAction = async (tree: Tree, act: { react: () => void; vue: () => void }, parts = { react, vue }) => {
    const read = async (mount: () => Promise<() => Promise<void>>, action: () => Promise<void>) => {
      const unmount = await mount();
      await action();
      const slots = slotsOf(document.body);
      await unmount();
      return slots;
    };
    const reactSlots = acceptedData(rekaVars(await read(() => render.mountReact(toReact(tree, parts.react, render) as ReactElement), () => render.actReact(act.react))), accepted);
    const vueSlots = acceptedData(await read(() => render.mountVue(() => toVue(tree, parts.vue, render) as VNode), () => render.actVue(act.vue)), accepted);
    expect(vueSlots).toEqual(reactSlots);
    return reactSlots;
  };

  // A right-click on the area opens its menu at the pointer.
  it("context-menu, opened by a right-click: every kind of row", async () => {
    const tree = n(
      "ContextMenu",
      {},
      n("ContextMenuTrigger", { class: "h-32" }, "Right-click"),
      n(
        "ContextMenuContent",
        { class: "w-56" },
        n("ContextMenuLabel", { inset: true }, "Page"),
        n("ContextMenuGroup", {}, n("ContextMenuItem", {}, "Back", n("ContextMenuShortcut", {}, "⌘[")), n("ContextMenuItem", { variant: "destructive", disabled: true }, "Delete")),
        n("ContextMenuSeparator", {}),
        nx("ContextMenuCheckboxItem", { react: { checked: true }, vue: { modelValue: true } }, "Bookmarks"),
        nx("ContextMenuRadioGroup", { react: { value: "ada" }, vue: { modelValue: "ada" } }, n("ContextMenuRadioItem", { value: "ada" }, "Ada")),
        n("ContextMenuSub", {}, n("ContextMenuSubTrigger", { inset: true }, "More"), n("ContextMenuSubContent", {}, n("ContextMenuItem", {}, "Save as…"))),
      ),
    );
    const rightClick = () => document.querySelector("[data-slot=context-menu-trigger]")!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }));
    const slots = await afterAction(tree, { react: rightClick, vue: rightClick });
    expect(slots.map((s) => s.slot)).toContain("context-menu-content");
  });

  // toast.add() from anywhere; the Toaster shows each with its intent's icon and classes.
  it("toast, raised with toast.add: every part, each intent", async () => {
    const intents = [undefined, ...Object.keys(SYSTEMS[name]!().intents)];
    const raise = (toast: { add: (options: object) => string }) => () => {
      intents.forEach((type, i) => toast.add({ id: `t${i}`, title: `Title ${i}`, ...(i % 2 === 0 ? { description: "Text" } : {}), ...(type === undefined ? {} : { type }), ...(i === 1 ? { actionProps: { children: "Undo" } } : {}) }));
    };
    const close = (toast: { close: (id: string) => void }) => intents.forEach((_, i) => toast.close(`t${i}`));
    // Sonner's Toaster shares the name: this one is the toast folder's.
    const parts = { react: toast.react, vue: toast.vue };
    const slots = await afterAction(n("Toaster", { class: "end-8" }), { react: raise(parts.react["toast"]), vue: raise(parts.vue["toast"]) }, parts);
    close(parts.react["toast"]);
    close(parts.vue["toast"]);
    expect(slots.filter((s) => s.slot === "toast")).toHaveLength(intents.length);
    expect(slots.map((s) => s.slot)).toEqual(expect.arrayContaining(["toast-icon", "toast-title", "toast-description", "toast-action", "toast-close", "toast-viewport"]));
  });

  // Sonner renders no data-slot of ours: what's compared is the classes it gives each toast's parts
  // from the Toaster's toastOptions (sonner's classNames, vue-sonner's classes), and each kind's
  // icon, for every kind of toast.
  it("sonner, raised with toast(): each part's classes, every kind", async () => {
    type Sonner = ((title: string, options?: object) => unknown) & Record<string, (title: string, options?: object) => unknown> & { dismiss: () => void };
    const packages = { react: sonnerToast.react["toast"] as Sonner, vue: sonnerToast.vue["toast"] as Sonner };
    const raise = (toast: Sonner) => () => {
      toast("Plain", { description: "Text", action: { label: "Undo", onClick: () => {} }, cancel: { label: "Cancel", onClick: () => {} } });
      for (const kind of ["success", "info", "warning", "error", "loading"]) toast[kind]!(`A ${kind}`);
    };
    const classes = (el: Element | null) => (el?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean).sort();
    const read = () =>
      [...document.querySelectorAll("[data-sonner-toast]")].map((li) => ({
        // A plain toast: Sonner leaves data-type off, vue-sonner writes "default".
        type: li.getAttribute("data-type") ?? "default",
        toast: classes(li),
        title: classes(li.querySelector("[data-title]")),
        description: classes(li.querySelector("[data-description]")),
        action: classes(li.querySelector("[data-button]:not([data-cancel])")),
        cancel: classes(li.querySelector("[data-cancel]")),
        icon: classes(li.querySelector("[data-icon] svg")),
      }));
    const shown = async (framework: "react" | "vue") => {
      const tree = n("Toaster", {});
      const unmount = framework === "react" ? await render.mountReact(toReact(tree, sonner.react, render) as ReactElement) : await render.mountVue(() => toVue(tree, sonner.vue, render) as VNode);
      const act = framework === "react" ? render.actReact : render.actVue;
      await act(raise(packages[framework]));
      // Sonner (React) adds a toast on a timer after toast() returns.
      await new Promise((resolve) => setTimeout(resolve, 20));
      await act(() => {});
      const toasts = read();
      await (framework === "react" ? render.actReact : render.actVue)(() => packages[framework].dismiss());
      await unmount();
      return toasts;
    };
    const reactToasts = await shown("react");
    expect(reactToasts).toHaveLength(6);
    expect(await shown("vue")).toEqual(reactToasts);
  });
});

// An accepted difference that no longer happens is taken off the list, so it can't hide a new one.
it("every accepted difference still occurs", () => {
  expect([...seenData].filter((k) => k in accepted).sort()).toEqual(Object.keys(accepted).sort());
});
