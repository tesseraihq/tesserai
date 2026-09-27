import type { Anatomy } from "@tesserai/core";
import { attachmentPieces, bubblePieces, markerPieces, messagePieces } from "../chat";
import { q, unionType } from "../codegen";
import type { GeneratedFile } from "../render";
import { attributesOf, elementPart } from "./elements";
import { cva, indent, indexFile, indexParts, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";

// The chat components as shadcn-svelte lays them out: plain elements, with a `child` snippet where
// the React file takes asChild (a bubble's content, an attachment's trigger, a marker). Each part's
// classes are its pieces', as the Radix output prints them.

const div = attributesOf("div");

export function messageFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = messagePieces(anatomy);
  const part = (file: string, slot: keyof typeof slots) => elementPart(`message/${file}`, "div", slot, quoted(slots[slot]));
  return [
    part("message-group.svelte", "message-group"),
    // align="end" for your own messages.
    elementPart("message/message.svelte", "div", "message", quoted(slots.message), {
      destructure: [`align = "start"`],
      propsExtra: `{ align?: "start" | "end" }`,
      attrs: ["data-align={align}"],
    }),
    part("message-avatar.svelte", "message-avatar"),
    part("message-content.svelte", "message-content"),
    part("message-header.svelte", "message-header"),
    part("message-footer.svelte", "message-footer"),
    indexFile(
      "message/index.ts",
      indexParts([
        ["message.svelte", "Root", "Message"],
        ["message-group.svelte", "Group", "MessageGroup"],
        ["message-avatar.svelte", "Avatar", "MessageAvatar"],
        ["message-content.svelte", "Content", "MessageContent"],
        ["message-header.svelte", "Header", "MessageHeader"],
        ["message-footer.svelte", "Footer", "MessageFooter"],
      ]),
    ),
  ];
}

// An element that renders as something else through a `child` snippet (shadcn-svelte's asChild),
// its data attributes and classes handed to the snippet as props.
function childPart(path: string, tag: string, attributes: { type: string; import: string }, o: { slot: string; module?: string; constants: Record<string, string>; props?: string; destructure?: string[]; script?: string; attrs: string; element?: string }): GeneratedFile {
  return svelteFile(path, {
    ...(o.module === undefined ? {} : { module: o.module }),
    script: `${attributes.import}
import type { Snippet } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}

${Object.entries(o.constants).map(([name, value]) => `const ${name} = ${value};`).join("\n")}

let {
  ref = $bindable(null),
  class: className,
${(o.destructure ?? []).map((d) => `  ${d},\n`).join("")}  child,
  children,
  ...restProps
}: WithElementRef<${attributes.type}>${o.props === undefined ? "" : ` & ${o.props}`} & { child?: Snippet<[{ props: Record<string, unknown> }]> } = $props();
${o.script ?? ""}
const attrs = $derived({ ${o.attrs}, ...restProps });`,
    markup: `{#if child}
  {@render child({ props: attrs })}
{:else}
  <${tag} bind:this={ref}${o.element ?? ""} {...attrs}>
    {@render children?.()}
  </${tag}>
{/if}`,
  });
}

export function bubbleFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, intents, aliases, defaultVariant, defaultIntent } = bubblePieces(anatomy);
  const bubble = svelteFile("bubble/bubble.svelte", {
    module: `import { cva } from "class-variance-authority";

export ${cva("bubbleVariants", slots.bubble)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};

// shadcn variant names keep working; they map to a variant + intent pair.
const aliases = {
${indent(aliases.map(([n, a]) => `${q(n)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} },`).join("\n"))}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

export type BubbleVariant = Variant | Alias;
export type BubbleIntent = Intent;

function resolveAxes(variant: BubbleVariant | undefined, intent: Intent | undefined) {
  if (variant !== undefined && variant in aliases) {
    const alias = aliases[variant as Alias];
    return { variant: alias.variant, intent: intent ?? alias.intent };
  }
  return { variant: (variant as Variant | undefined) ?? ${q(defaultVariant)}, intent: intent ?? ${q(defaultIntent)} };
}`,
    script: `${div.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

// align="end" for your own messages.
let {
  ref = $bindable(null),
  class: className,
  variant,
  intent,
  align = "start",
  children,
  ...restProps
}: WithElementRef<${div.type}> & { variant?: BubbleVariant | undefined; intent?: BubbleIntent | undefined; align?: "start" | "end" } = $props();

const axes = $derived(resolveAxes(variant, intent));`,
    markup: `<div bind:this={ref} data-slot="bubble" data-variant={axes.variant} data-intent={axes.intent} data-align={align} class={cn(bubbleVariants(axes), className)} {...restProps}>
  {@render children?.()}
</div>`,
  });
  return [
    elementPart("bubble/bubble-group.svelte", "div", "bubble-group", quoted(slots["bubble-group"])),
    bubble,
    // The text (or a button or link) inside the bubble.
    childPart("bubble/bubble-content.svelte", "div", div, {
      slot: "bubble-content",
      constants: { classes: quoted(slots["bubble-content"]) },
      attrs: `"data-slot": "bubble-content", class: cn(classes, className)`,
    }),
    // Emoji reactions pinned to the bubble's edge.
    elementPart("bubble/bubble-reactions.svelte", "div", "bubble-reactions", quoted(slots["bubble-reactions"]), {
      destructure: [`align = "end"`, `side = "bottom"`],
      propsExtra: `{ align?: "start" | "end"; side?: "top" | "bottom" }`,
      attrs: ["data-align={align}", "data-side={side}"],
    }),
    indexFile(
      "bubble/index.ts",
      indexParts([
        ["bubble.svelte", "Root", "Bubble"],
        ["bubble-group.svelte", "Group", "BubbleGroup"],
        ["bubble-content.svelte", "Content", "BubbleContent"],
        ["bubble-reactions.svelte", "Reactions", "BubbleReactions"],
      ]),
      [{ file: "bubble.svelte", names: ["bubbleVariants", "type BubbleVariant", "type BubbleIntent"] }],
    ),
  ];
}

export function attachmentFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize, action } = attachmentPieces(anatomy);
  const attachment = svelteFile("attachment/attachment.svelte", {
    module: `import { cva } from "class-variance-authority";

export ${cva("attachmentVariants", slots.attachment)}

export type AttachmentSize = ${unionType(sizes)};
export type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";
export type AttachmentOrientation = "horizontal" | "vertical";`,
    script: `${div.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const verticalClasses = ${quoted(slots["attachment:+vertical"])};
const horizontalClasses = ${quoted(slots["attachment:+horizontal"])};
const paddingClasses = ${quoted(slots["attachment:+padding"])};

// state: idle (a drop target), uploading, processing, error or done.
let {
  ref = $bindable(null),
  class: className,
  state = "done",
  size = "default",
  orientation = "horizontal",
  children,
  ...restProps
}: WithElementRef<${div.type}> & { state?: AttachmentState; size?: AttachmentSize | "default"; orientation?: AttachmentOrientation } = $props();

const resolved = $derived<AttachmentSize>(size === "default" ? ${q(defaultSize)} : size);`,
    markup: `<div
  bind:this={ref}
  data-slot="attachment"
  data-state={state}
  data-size={resolved}
  data-orientation={orientation}
  class={cn(attachmentVariants({ size: resolved }), orientation === "vertical" ? verticalClasses : horizontalClasses, paddingClasses, className)}
  {...restProps}
>
  {@render children?.()}
</div>`,
  });
  // variant="image" crops a picture to a square.
  const media = elementPart("attachment/attachment-media.svelte", "div", "attachment-media", quoted(slots["attachment-media"]), {
    destructure: [`variant = "icon"`],
    propsExtra: `{ variant?: "icon" | "image" }`,
    constants: { imageClasses: quoted(slots["attachment-media:+image"]) },
    attrs: ["data-variant={variant}"],
    classExpr: `cn(classes, variant === "image" && imageClasses, className)`,
  });
  // Remove, retry, open: the system's ghost icon buttons.
  const actionFile = svelteFile("attachment/attachment-action.svelte", {
    script: `${uiImport("button", ["Button", "type ButtonProps"])}

let { ref = $bindable(null), variant = ${q(action.variant)}, size = ${q(action.size)}, ...restProps }: ButtonProps = $props();`,
    markup: `<Button bind:ref data-slot="attachment-action" {variant} {size} {...restProps} />`,
  });
  // Covers the whole attachment, so clicking it opens the file.
  const trigger = childPart("attachment/attachment-trigger.svelte", "button", { type: "HTMLButtonAttributes", import: `import type { HTMLButtonAttributes } from "svelte/elements";` }, {
    slot: "attachment-trigger",
    constants: { classes: quoted(slots["attachment-trigger"]) },
    destructure: [`type = "button"`],
    attrs: `"data-slot": "attachment-trigger", class: cn(classes, className)`,
    element: " {type}",
  });
  return [
    attachment,
    elementPart("attachment/attachment-group.svelte", "div", "attachment-group", quoted(slots["attachment-group"])),
    media,
    elementPart("attachment/attachment-content.svelte", "div", "attachment-content", quoted(slots["attachment-content"])),
    elementPart("attachment/attachment-title.svelte", "span", "attachment-title", quoted(slots["attachment-title"])),
    elementPart("attachment/attachment-description.svelte", "span", "attachment-description", quoted(slots["attachment-description"])),
    elementPart("attachment/attachment-actions.svelte", "div", "attachment-actions", quoted(slots["attachment-actions"])),
    actionFile,
    trigger,
    indexFile(
      "attachment/index.ts",
      indexParts([
        ["attachment.svelte", "Root", "Attachment"],
        ["attachment-group.svelte", "Group", "AttachmentGroup"],
        ["attachment-media.svelte", "Media", "AttachmentMedia"],
        ["attachment-content.svelte", "Content", "AttachmentContent"],
        ["attachment-title.svelte", "Title", "AttachmentTitle"],
        ["attachment-description.svelte", "Description", "AttachmentDescription"],
        ["attachment-actions.svelte", "Actions", "AttachmentActions"],
        ["attachment-action.svelte", "Action", "AttachmentAction"],
        ["attachment-trigger.svelte", "Trigger", "AttachmentTrigger"],
      ]),
      [{ file: "attachment.svelte", names: ["attachmentVariants", "type AttachmentSize", "type AttachmentState", "type AttachmentOrientation"] }],
    ),
  ];
}

export function markerFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = markerPieces(anatomy);
  return [
    // variant="separator" draws rules either side; "border" rules it underneath.
    childPart("marker/marker.svelte", "div", div, {
      slot: "marker",
      module: `import { cva, type VariantProps } from "class-variance-authority";

export ${cva("markerVariants", slots.marker)}

export type MarkerVariant = NonNullable<VariantProps<typeof markerVariants>["variant"]>;`,
      constants: {},
      destructure: [`variant = "default"`],
      props: `{ variant?: MarkerVariant }`,
      attrs: `"data-slot": "marker", "data-variant": variant, class: cn(markerVariants({ variant }), className)`,
    }),
    elementPart("marker/marker-icon.svelte", "span", "marker-icon", quoted(slots["marker-icon"]), { attrs: [`aria-hidden="true"`] }),
    elementPart("marker/marker-content.svelte", "span", "marker-content", quoted(slots["marker-content"])),
    indexFile(
      "marker/index.ts",
      indexParts([
        ["marker.svelte", "Root", "Marker"],
        ["marker-icon.svelte", "Icon", "MarkerIcon"],
        ["marker-content.svelte", "Content", "MarkerContent"],
      ]),
      [{ file: "marker.svelte", names: ["markerVariants", "type MarkerVariant"] }],
    ),
  ];
}

