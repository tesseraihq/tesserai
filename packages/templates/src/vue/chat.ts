import type { Anatomy } from "@tesserai/core";
import { attachmentPieces, bubblePieces, markerPieces, messagePieces } from "../chat";
import { q, unionType } from "../codegen";
import type { GeneratedFile } from "../render";
import { barrel, classList, exportedCva, folder, plain } from "./sfc";

// The chat components: plain markup, with Reka's Primitive where the React file takes asChild
// (a bubble's content, an attachment's trigger, a marker), so they can be a link or a button. Each
// part's classes are its pieces', as the Radix output prints them.

const ALIGN = `align?: "start" | "end"`;

export function renderMessage(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = messagePieces(anatomy);
  const f = folder("message");
  const message = f.file(
    "Message",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

// align="end" for your own messages.
const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; ${ALIGN} }>(), { align: "start" });`,
    `<div data-slot="message" :data-align="align" :class="cn(${classList(slots.message)}, props.class)">
  <slot />
</div>`,
  );
  return [
    plain(f, "MessageGroup", "div", "message-group", classList(slots["message-group"])),
    message,
    plain(f, "MessageAvatar", "div", "message-avatar", classList(slots["message-avatar"])),
    plain(f, "MessageContent", "div", "message-content", classList(slots["message-content"])),
    plain(f, "MessageHeader", "div", "message-header", classList(slots["message-header"])),
    plain(f, "MessageFooter", "div", "message-footer", classList(slots["message-footer"])),
    barrel("message", ["Message", "MessageAvatar", "MessageContent", "MessageFooter", "MessageGroup", "MessageHeader"]),
  ];
}

// A Primitive part: a tag by default, `as` and `as-child` for another element or component.
function primitive(f: ReturnType<typeof folder>, file: string, tag: string, slot: string, classes: string, extra: { props?: string; defaults?: string; attrs?: string; script?: string } = {}): GeneratedFile {
  return f.file(
    file,
    `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { Primitive } from "reka-ui";
import { cn } from "@/lib/utils";
${extra.script ?? ""}
const props = withDefaults(defineProps<PrimitiveProps & { class?: HTMLAttributes["class"]${extra.props ?? ""} }>(), { as: "${tag}"${extra.defaults ?? ""} });`,
    `<Primitive data-slot="${slot}"${extra.attrs ?? ""} :as="as" :as-child="asChild" :class="cn(${classes}, props.class)">
  <slot />
</Primitive>`,
  );
}

export function renderBubble(anatomy: Anatomy): GeneratedFile[] {
  const { slots, variants, intents, aliases, defaultVariant, defaultIntent } = bubblePieces(anatomy);
  const f = folder("bubble");
  const index = `import { cva } from "class-variance-authority";

${exportedCva("bubbleVariants", slots.bubble)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};

// shadcn variant names keep working; they map to a variant + intent pair.
const aliases = {
${aliases.map(([n, a]) => `  ${q(n)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} },`).join("\n")}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

export type BubbleVariantProps = { variant?: Variant | Alias | undefined; intent?: Intent | undefined };

// The variant and intent a bubble's props come to; Bubble writes them as data attributes.
export function resolveBubbleAxes(variant: Variant | Alias | undefined, intent: Intent | undefined) {
  if (variant !== undefined && variant in aliases) {
    const alias = aliases[variant as Alias];
    return { variant: alias.variant, intent: intent ?? alias.intent };
  }
  return { variant: (variant as Variant | undefined) ?? ${q(defaultVariant)}, intent: intent ?? ${q(defaultIntent)} };
}`;
  const bubble = f.file(
    "Bubble",
    `import type { HTMLAttributes } from "vue";
import type { BubbleVariantProps } from ".";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { bubbleVariants, resolveBubbleAxes } from ".";

// align="end" for your own messages.
const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; variant?: BubbleVariantProps["variant"]; intent?: BubbleVariantProps["intent"]; ${ALIGN} }>(), { variant: undefined, intent: undefined, align: "start" });
const axes = computed(() => resolveBubbleAxes(props.variant, props.intent));`,
    `<div data-slot="bubble" :data-variant="axes.variant" :data-intent="axes.intent" :data-align="align" :class="cn(bubbleVariants(axes), props.class)">
  <slot />
</div>`,
  );
  const reactions = f.file(
    "BubbleReactions",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

// Emoji reactions pinned to the bubble's edge.
const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; ${ALIGN}; side?: "top" | "bottom" }>(), { align: "end", side: "bottom" });`,
    `<div data-slot="bubble-reactions" :data-align="align" :data-side="side" :class="cn(${classList(slots["bubble-reactions"])}, props.class)">
  <slot />
</div>`,
  );
  return [
    plain(f, "BubbleGroup", "div", "bubble-group", classList(slots["bubble-group"])),
    bubble,
    // The text (or a button or link) inside the bubble.
    primitive(f, "BubbleContent", "div", "bubble-content", classList(slots["bubble-content"])),
    reactions,
    barrel("bubble", ["Bubble", "BubbleContent", "BubbleGroup", "BubbleReactions"], index),
  ];
}

export function renderAttachment(anatomy: Anatomy): GeneratedFile[] {
  const { slots, sizes, defaultSize, action } = attachmentPieces(anatomy);
  const f = folder("attachment");
  const index = `import { cva } from "class-variance-authority";

${exportedCva("attachmentVariants", slots.attachment)}

export type AttachmentSize = ${unionType(sizes)};`;
  const attachment = f.file(
    "Attachment",
    `import type { HTMLAttributes } from "vue";
import type { AttachmentSize } from ".";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { attachmentVariants } from ".";

// state: idle (a drop target), uploading, processing, error or done.
const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    state?: "idle" | "uploading" | "processing" | "error" | "done";
    size?: AttachmentSize | "default";
    orientation?: "horizontal" | "vertical";
  }>(),
  { state: "done", size: "default", orientation: "horizontal" },
);
const resolved = computed<AttachmentSize>(() => (props.size === "default" ? ${q(defaultSize)} : props.size));`,
    `<div
  data-slot="attachment"
  :data-state="state"
  :data-size="resolved"
  :data-orientation="orientation"
  :class="
    cn(
      attachmentVariants({ size: resolved }),
      orientation === 'vertical' ? ${classList(slots["attachment:+vertical"])} : ${classList(slots["attachment:+horizontal"])},
      ${classList(slots["attachment:+padding"])},
      props.class,
    )
  "
>
  <slot />
</div>`,
  );
  const media = f.file(
    "AttachmentMedia",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

// variant="image" crops a picture to a square.
const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; variant?: "icon" | "image" }>(), { variant: "icon" });`,
    `<div data-slot="attachment-media" :data-variant="variant" :class="cn(${classList(slots["attachment-media"])}, variant === 'image' && ${classList(slots["attachment-media:+image"])}, props.class)">
  <slot />
</div>`,
  );
  const actionFile = f.file(
    "AttachmentAction",
    `import type { ButtonVariantProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

// Remove, retry, open: the system's ghost icon buttons.
withDefaults(defineProps<{ variant?: ButtonVariantProps["variant"]; size?: ButtonVariantProps["size"] }>(), { variant: ${q(action.variant)}, size: ${q(action.size)} });`,
    `<Button data-slot="attachment-action" :variant="variant" :size="size">
  <slot />
</Button>`,
  );
  // Covers the whole attachment, so clicking it opens the file.
  const trigger = primitive(f, "AttachmentTrigger", "button", "attachment-trigger", classList(slots["attachment-trigger"]), {
    attrs: ` :type="asChild || as !== 'button' ? undefined : 'button'"`,
  });
  return [
    attachment,
    plain(f, "AttachmentGroup", "div", "attachment-group", classList(slots["attachment-group"])),
    media,
    plain(f, "AttachmentContent", "div", "attachment-content", classList(slots["attachment-content"])),
    plain(f, "AttachmentTitle", "span", "attachment-title", classList(slots["attachment-title"])),
    plain(f, "AttachmentDescription", "span", "attachment-description", classList(slots["attachment-description"])),
    plain(f, "AttachmentActions", "div", "attachment-actions", classList(slots["attachment-actions"])),
    actionFile,
    trigger,
    barrel("attachment", ["Attachment", "AttachmentAction", "AttachmentActions", "AttachmentContent", "AttachmentDescription", "AttachmentGroup", "AttachmentMedia", "AttachmentTitle", "AttachmentTrigger"], index),
  ];
}

export function renderMarker(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = markerPieces(anatomy);
  const f = folder("marker");
  const index = `import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

// variant="separator" draws rules either side; "border" rules it underneath.
${exportedCva("markerVariants", slots.marker)}

export type MarkerVariants = VariantProps<typeof markerVariants>;`;
  const marker = primitive(f, "Marker", "div", "marker", `markerVariants({ variant })`, {
    script: `import type { MarkerVariants } from ".";\nimport { markerVariants } from ".";\n`,
    props: `; variant?: NonNullable<MarkerVariants["variant"]>`,
    defaults: `, variant: "default"`,
    attrs: ` :data-variant="variant"`,
  });
  const icon = f.file(
    "MarkerIcon",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<span data-slot="marker-icon" aria-hidden="true" :class="cn(${classList(slots["marker-icon"])}, props.class)">
  <slot />
</span>`,
  );
  return [marker, icon, plain(f, "MarkerContent", "span", "marker-content", classList(slots["marker-content"])), barrel("marker", ["Marker", "MarkerContent", "MarkerIcon"], index)];
}
