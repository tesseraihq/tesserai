import type { Anatomy } from "@tesserai/core";
import { badgePieces } from "../badge";
import { cardPieces } from "../base-ui/card";
import { tablePieces } from "../base-ui/table";
import { q, unionType } from "../codegen";
import { alertPieces, avatarPieces, kbdPieces, progressPieces, separatorPieces, skeletonPieces, spinnerPieces, typographyPieces } from "../display";
import type { GeneratedFile } from "../render";
import { attributesOf, elementPart } from "./elements";
import { bitsImport, cva, indent, indexFile, indexParts, lucideImport, partFile, quoted, svelteFile, UTILS_IMPORT } from "./emit";

const DIV = attributesOf("div");

// A div part (header, footer, title…) of a component folder.
const divPart = (folder: string, slot: string, classes: string[]) => elementPart(`${folder}/${slot}.svelte`, "div", slot, quoted(classes));

// shadcn's Card; with sizes, the card is a cva by size ("default" is the system's default).
export function cardFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = cardPieces(anatomy);
  const card = Array.isArray(slots.card)
    ? divPart("card", "card", slots.card)
    : svelteFile("card/card.svelte", {
        module: `import { cva } from "class-variance-authority";

export ${cva("cardVariants", slots.card)}

export type CardSize = ${unionType(sizes)};`,
        script: `${DIV.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

let {
  ref = $bindable(null),
  class: className,
  size = "default",
  children,
  ...restProps
}: WithElementRef<${DIV.type}> & { size?: CardSize | "default" } = $props();

const resolved: CardSize = $derived(size === "default" ? ${q(defaultSize)} : size);`,
        markup: `<div bind:this={ref} data-slot="card" data-size={resolved} class={cn(cardVariants({ size: resolved }), className)} {...restProps}>
  {@render children?.()}
</div>`,
      });
  const parts = ["header", "title", "description", "action", "content", "footer"] as const;
  return [
    card,
    ...parts.map((part) => divPart("card", `card-${part}`, slots[`card-${part}`])),
    indexFile(
      "card/index.ts",
      indexParts([
        ["card.svelte", "Root", "Card"],
        ["card-header.svelte", "Header", "CardHeader"],
        ["card-title.svelte", "Title", "CardTitle"],
        ["card-description.svelte", "Description", "CardDescription"],
        ["card-action.svelte", "Action", "CardAction"],
        ["card-content.svelte", "Content", "CardContent"],
        ["card-footer.svelte", "Footer", "CardFooter"],
      ]),
    ),
  ];
}

// Bits' Separator, decorative by default as in shadcn. Its data-slot can be changed, so another
// component can use it as its own part (shadcn-svelte's convention).
export function separatorFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = separatorPieces(anatomy);
  return [
    partFile({
      path: "separator/separator.svelte",
      imports: [bitsImport("Separator")],
      props: "SeparatorPrimitive.RootProps",
      tag: "SeparatorPrimitive.Root",
      classes: quoted(slots.separator),
      destructure: [`orientation = "horizontal"`, "decorative = true", `"data-slot": dataSlot = "separator"`],
      attrs: ["data-slot={dataSlot}", "{orientation}", "{decorative}"],
    }),
    indexFile("separator/index.ts", indexParts([["separator.svelte", "Root", "Separator"]])),
  ];
}

export function skeletonFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = skeletonPieces(anatomy);
  return [
    partFile({
      path: "skeleton/skeleton.svelte",
      imports: [DIV.import],
      utils: ["type WithElementRef", "type WithoutChildren"],
      props: `WithoutChildren<WithElementRef<${DIV.type}>>`,
      tag: "div",
      element: true,
      slot: "skeleton",
      classes: quoted(slots.skeleton),
      inner: "",
    }),
    indexFile("skeleton/index.ts", indexParts([["skeleton.svelte", "Root", "Skeleton"]])),
  ];
}

// The Loader2 icon itself, announced as loading; its props are the icon's.
export function spinnerFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = spinnerPieces(anatomy);
  return [
    svelteFile("spinner/spinner.svelte", {
      script: `import type { ComponentProps } from "svelte";
${lucideImport("Loader2Icon")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots.spinner)};

let { class: className, ...restProps }: ComponentProps<typeof Loader2Icon> = $props();`,
      markup: `<Loader2Icon data-slot="spinner" role="status" aria-label="Loading" class={cn(classes, className)} {...restProps} />`,
    }),
    { path: "spinner/index.ts", source: `export { default as Spinner } from "./spinner.svelte";\n` },
  ];
}

export function kbdFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = kbdPieces(anatomy);
  return [
    elementPart("kbd/kbd.svelte", "kbd", "kbd", quoted(slots.kbd)),
    elementPart("kbd/kbd-group.svelte", "kbd", "kbd-group", quoted(slots["kbd-group"])),
    indexFile(
      "kbd/index.ts",
      indexParts([
        ["kbd.svelte", "Root", "Kbd"],
        ["kbd-group.svelte", "Group", "KbdGroup"],
      ]),
    ),
  ];
}

// Alert: variant and intent, with shadcn's names (default, destructive) as aliases. The icon's,
// title's and description's looks ride on the root's cva.
export function alertFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, intents, defaultVariant, defaultIntent, aliases } = alertPieces(anatomy);
  const alert = svelteFile("alert/alert.svelte", {
    module: `import { cva, type VariantProps } from "class-variance-authority";

export ${cva("alertVariants", slots.alert)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};

// shadcn's names keep working.
const aliases = {
${indent(aliases.map(([name, a]) => `${q(name)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} },`).join("\n"))}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

export type AlertVariant = Variant | Alias;
export type AlertIntent = Intent;
export type AlertVariants = VariantProps<typeof alertVariants>;

function resolveAxes(variant: AlertVariant | undefined, intent: Intent | undefined) {
  if (variant !== undefined && variant in aliases) {
    const alias = aliases[variant as Alias];
    return { variant: alias.variant, intent: intent ?? alias.intent };
  }
  return { variant: (variant as Variant | undefined) ?? ${q(defaultVariant)}, intent: intent ?? ${q(defaultIntent)} };
}`,
    script: `${DIV.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

let {
  ref = $bindable(null),
  class: className,
  variant,
  intent,
  children,
  ...restProps
}: WithElementRef<${DIV.type}> & { variant?: AlertVariant | undefined; intent?: AlertIntent | undefined } = $props();

const axes = $derived(resolveAxes(variant, intent));`,
    markup: `<div bind:this={ref} data-slot="alert" role="alert" data-variant={axes.variant} data-intent={axes.intent} class={cn(alertVariants(axes), className)} {...restProps}>
  {@render children?.()}
</div>`,
  });
  return [
    alert,
    divPart("alert", "alert-title", slots["alert-title"]),
    divPart("alert", "alert-description", slots["alert-description"]),
    divPart("alert", "alert-action", slots["alert-action"]),
    indexFile(
      "alert/index.ts",
      indexParts([
        ["alert.svelte", "Root", "Alert"],
        ["alert-title.svelte", "Title", "AlertTitle"],
        ["alert-description.svelte", "Description", "AlertDescription"],
        ["alert-action.svelte", "Action", "AlertAction"],
      ]),
      [{ file: "alert.svelte", names: ["alertVariants", "type AlertVariant", "type AlertIntent", "type AlertVariants"] }],
    ),
  ];
}

// Avatar on Bits: the frame and the fallback's look ride on the root's cva by size; the badge, the
// group and its count are plain elements that read the avatar's data-size.
export function avatarFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize } = avatarPieces(anatomy);
  const root = svelteFile("avatar/avatar.svelte", {
    module: `import { cva } from "class-variance-authority";

export ${cva("avatarVariants", slots.avatar)}

export type AvatarSize = ${unionType(sizes)};`,
    script: `${bitsImport("Avatar")}
${UTILS_IMPORT(["cn"])}

let {
  ref = $bindable(null),
  loadingStatus = $bindable("loading"),
  class: className,
  size = "default",
  ...restProps
}: AvatarPrimitive.RootProps & { size?: AvatarSize | "default" } = $props();

const resolved: AvatarSize = $derived(size === "default" ? ${q(defaultSize)} : size);`,
    markup: `<AvatarPrimitive.Root bind:ref bind:loadingStatus data-slot="avatar" data-size={resolved} class={cn(avatarVariants({ size: resolved }), className)} {...restProps} />`,
  });
  const primitive = (file: string, part: string, slot: "avatar-image" | "avatar-fallback") =>
    partFile({ path: `avatar/${file}`, imports: [bitsImport("Avatar")], props: `AvatarPrimitive.${part}Props`, tag: `AvatarPrimitive.${part}`, slot, classes: quoted(slots[slot]) });
  return [
    root,
    primitive("avatar-image.svelte", "Image", "avatar-image"),
    primitive("avatar-fallback.svelte", "Fallback", "avatar-fallback"),
    elementPart("avatar/avatar-badge.svelte", "span", "avatar-badge", quoted(slots["avatar-badge"])),
    divPart("avatar", "avatar-group", slots["avatar-group"]),
    divPart("avatar", "avatar-group-count", slots["avatar-group-count"]),
    indexFile(
      "avatar/index.ts",
      indexParts([
        ["avatar.svelte", "Root", "Avatar"],
        ["avatar-image.svelte", "Image", "AvatarImage"],
        ["avatar-fallback.svelte", "Fallback", "AvatarFallback"],
        ["avatar-badge.svelte", "Badge", "AvatarBadge"],
        ["avatar-group.svelte", "Group", "AvatarGroup"],
        ["avatar-group-count.svelte", "GroupCount", "AvatarGroupCount"],
      ]),
    ),
  ];
}

// shadcn's typography recipes as components, one file each; every element shares the data-slot.
export function typographyFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, elements } = typographyPieces(anatomy);
  const file = (name: string) => `typography-${name.replace(/^Typography/, "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}.svelte`;
  return [
    ...elements.map((e) => elementPart(`typography/${file(e.name)}`, e.tag, "typography", quoted(slots[e.slot]))),
    indexFile(
      "typography/index.ts",
      elements.map((e) => ({ file: file(e.name), short: e.name.replace(/^Typography/, ""), full: e.name })),
    ),
  ];
}

// The table sits in a scroll container.
export function tableFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = tablePieces(anatomy);
  const table = attributesOf("table");
  const parts: [string, string, keyof typeof slots, string, string][] = [
    ["table-header.svelte", "thead", "table-header", "Header", "TableHeader"],
    ["table-body.svelte", "tbody", "table-body", "Body", "TableBody"],
    ["table-footer.svelte", "tfoot", "table-footer", "Footer", "TableFooter"],
    ["table-head.svelte", "th", "table-head", "Head", "TableHead"],
    ["table-cell.svelte", "td", "table-cell", "Cell", "TableCell"],
    ["table-caption.svelte", "caption", "table-caption", "Caption", "TableCaption"],
  ];
  return [
    svelteFile("table/table.svelte", {
      script: `${table.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const containerClasses = ${quoted(slots["table-container"])};
const classes = ${quoted(slots.table)};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<${table.type}> = $props();`,
      markup: `<!-- Focusable, so a wide table can be scrolled from the keyboard (axe: scrollable-region-focusable). -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div data-slot="table-container" tabindex="0" class={containerClasses}>
  <table bind:this={ref} data-slot="table" class={cn(classes, className)} {...restProps}>
    {@render children?.()}
  </table>
</div>`,
    }),
    elementPart("table/table-row.svelte", "tr", "table-row", quoted(slots["table-row"]), {
      propsExtra: "{ selected?: boolean | undefined }",
      destructure: ["selected"],
      attrs: [`data-selected={selected ? "" : undefined}`],
    }),
    ...parts.map(([f, tag, slot]) => elementPart(`table/${f}`, tag, slot, quoted(slots[slot]))),
    indexFile("table/index.ts", [
      { file: "table.svelte", short: "Root", full: "Table" },
      { file: "table-row.svelte", short: "Row", full: "TableRow" },
      ...parts.map(([f, , , short, full]) => ({ file: f, short, full })),
    ]),
  ];
}

// Bits' Progress has no indicator part: the indicator is a div slid into place with an inline
// translateX, as Radix's is, and carries the same data attributes as Radix's.
export function progressFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = progressPieces(anatomy);
  return [
    svelteFile("progress/progress.svelte", {
      script: `${bitsImport("Progress")}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}

const classes = ${quoted(slots.progress)};
const indicatorClasses = ${quoted(slots["progress-indicator"])};

// value is 0-max (100 by default), or null while it isn't known.
let { ref = $bindable(null), class: className, max = 100, value = null, ...restProps }: WithoutChildrenOrChild<ProgressPrimitive.RootProps> = $props();

const state = $derived(value == null ? "indeterminate" : value === max ? "complete" : "loading");`,
      markup: `<ProgressPrimitive.Root bind:ref data-slot="progress" class={cn(classes, className)} {value} {max} {...restProps}>
  <div
    data-slot="progress-indicator"
    data-state={state}
    data-value={value ?? undefined}
    data-max={max}
    class={indicatorClasses}
    style="transform: translateX(-{100 - (100 * (value ?? 0)) / max}%)"
  ></div>
</ProgressPrimitive.Root>`,
    }),
    indexFile("progress/index.ts", indexParts([["progress.svelte", "Root", "Progress"]])),
  ];
}

// Badge: variant, intent and size, shadcn's names as aliases; given href it renders a link, as in
// shadcn-svelte, and hover styles apply to links only.
export function badgeFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, intents, sizes, defaultVariant, defaultSize, aliases, defaultIntent } = badgePieces(anatomy);
  const badge = svelteFile("badge/badge.svelte", {
    module: `import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAnchorAttributes } from "svelte/elements";
import type { WithElementRef } from "$UTILS$.js";

export ${cva("badgeVariants", slots.badge)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};

// shadcn variant names keep working; they map to a variant + intent pair.
const aliases = {
${indent(aliases.map(([name, a]) => `${q(name)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} },`).join("\n"))}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

// A variant chosen without an intent takes the intent shadcn gives that variant.
const defaultIntent: Record<Variant, Intent> = {
${indent(variants.map((v) => `${q(v)}: ${q(defaultIntent[v]!)},`).join("\n"))}
};

export type BadgeVariant = Variant | Alias;
export type BadgeIntent = Intent;
export type BadgeSize = ${unionType(sizes)};
export type BadgeVariants = VariantProps<typeof badgeVariants>;

export type BadgeProps = WithElementRef<HTMLAnchorAttributes> & {
  variant?: BadgeVariant | undefined;
  intent?: BadgeIntent | undefined;
  size?: BadgeSize | undefined;
};

function resolveAxes(variant: BadgeVariant, intent: Intent | undefined) {
  if (variant in aliases) {
    const alias = aliases[variant as Alias];
    return { variant: alias.variant, intent: intent ?? alias.intent };
  }
  return { variant: variant as Variant, intent: intent ?? defaultIntent[variant as Variant] };
}`,
    script: `${UTILS_IMPORT(["cn"])}

let {
  ref = $bindable(null),
  href,
  class: className,
  variant = ${q(defaultVariant)},
  intent,
  size = ${q(defaultSize)},
  children,
  ...restProps
}: BadgeProps = $props();

const axes = $derived(resolveAxes(variant, intent));`,
    markup: `<svelte:element
  this={href ? "a" : "span"}
  bind:this={ref}
  data-slot="badge"
  data-variant={axes.variant}
  data-intent={axes.intent}
  data-size={size}
  {href}
  class={cn(badgeVariants({ ...axes, size }), className)}
  {...restProps}
>
  {@render children?.()}
</svelte:element>`,
  });
  return [
    badge,
    {
      path: "badge/index.ts",
      source: `export { default as Badge } from "./badge.svelte";
export { badgeVariants, type BadgeProps, type BadgeVariant, type BadgeIntent, type BadgeSize, type BadgeVariants } from "./badge.svelte";
`,
    },
  ];
}
