import type { Anatomy, Base } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString, cvaSource, q, unionType } from "./codegen";
import { mergeInto, poly, polyAttrs } from "./display";
import { factorClasses, flatClasses, type CvaConfig } from "./factor";
import { TEXT_IN_SPAN } from "./label";

// shadcn's chat components. Styles come from the system; shadcn's own helper utilities
// (scroll-fade, shimmer) are left out so the generated code needs no extra stylesheet.

// Message's classes, which every framework's shell prints from: plain elements, the message's
// alignment (data-align) read by its parts through the group/message name.
export function messagePieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  const c = (part: string, extra: string[] = []) => flatClasses(anatomy, part, { states }, extra);
  return {
    slots: {
      "message-group": ["flex", "min-w-0", "flex-col"],
      message: c("root", ["group/message", "relative", "flex", "w-full", "min-w-0", "data-[align=end]:flex-row-reverse"]),
      "message-avatar": c("avatar", ["flex", "w-fit", "shrink-0", "items-center", "justify-center-safe", "self-end", "overflow-hidden", "group-has-data-[slot=message-footer]/message:-translate-y-8"]),
      "message-content": c("content", ["flex", "w-full", "min-w-0", "flex-col", "wrap-break-word", "group-data-[align=end]/message:*:data-slot:self-end"]),
      "message-header": c("header", ["flex", "max-w-full", "min-w-0", "items-center", "group-has-data-[variant=ghost]/message:px-0"]),
      "message-footer": c("footer", ["flex", "max-w-full", "min-w-0", "items-center", "group-data-[align=end]/message:justify-end", "group-has-data-[variant=ghost]/message:px-0"]),
    },
  };
}

export function renderMessage(anatomy: Anatomy): string {
  const { slots } = messagePieces(anatomy);
  const c = (slot: keyof typeof slots) => classString(slots[slot]);
  return `import * as React from "react";
import { cn } from "@/lib/utils";

function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-group" className={cn(${c("message-group")}, className)} {...props} />;
}

// align="end" for your own messages.
function Message({ className, align = "start", ...props }: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return <div data-slot="message" data-align={align} className={cn(${c("message")}, className)} {...props} />;
}

function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={cn(${c("message-avatar")}, className)}
      {...props}
    />
  );
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="message-content" className={cn(${c("message-content")}, className)} {...props} />
  );
}

function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="message-header" className={cn(${c("message-header")}, className)} {...props} />;
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn(${c("message-footer")}, className)}
      {...props}
    />
  );
}

export { MessageGroup, Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader };
`;
}

// A bubble's look rides on the bubble (its variant and intent) and lands on its content; hover only
// when the content is a button or link.
const BUBBLE_ALIASES: Record<string, { variant: string; intent: string }> = {
  default: { variant: "solid", intent: "primary" },
  secondary: { variant: "soft", intent: "neutral" },
  muted: { variant: "soft", intent: "neutral" },
  tinted: { variant: "soft", intent: "primary" },
  destructive: { variant: "soft", intent: "danger" },
};

// Bubble's classes and axes, which every framework's shell prints from. The bubble's cva carries its
// content's and reactions' looks, by variant and intent, onto those children (*:data-[slot=…]:).
export function bubblePieces(anatomy: Anatomy, native: StatePrefixes = NATIVE_STATES) {
  const states: StatePrefixes = { ...native, hover: ["[&:is(button,a)]:hover:"] };
  const root = factorClasses(anatomy, "reactions", { states: native, prefix: "*:data-[slot=bubble-reactions]:" }, [
    "group/bubble",
    "relative",
    "flex",
    "w-fit",
    "max-w-[80%]",
    "min-w-0",
    "flex-col",
    "gap-1",
    "data-[align=end]:self-end",
    "group-data-[align=end]/message:self-end",
    "data-[variant=ghost]:max-w-full",
  ]);
  mergeInto(root, factorClasses(anatomy, "content", { states, prefix: "*:data-[slot=bubble-content]:" }));
  const variants = anatomy.axes.variant?.enabled ?? [];
  const intents = anatomy.axes.intent?.enabled ?? [];
  return {
    slots: {
      "bubble-group": flatClasses(anatomy, "group", { states: native }, ["flex", "min-w-0", "flex-col"]),
      bubble: root,
      "bubble-content": "w-fit max-w-full min-w-0 overflow-hidden leading-relaxed wrap-break-word outline-none [button]:text-start [button,a]:transition-colors group-data-[align=end]/bubble:self-end group-data-[variant=ghost]/bubble:rounded-none group-data-[variant=ghost]/bubble:p-0".split(" "),
      "bubble-reactions":
        "absolute z-10 flex w-fit shrink-0 items-center justify-center has-[button]:p-0 data-[side=top]:top-0 data-[side=top]:-translate-y-3/4 data-[side=bottom]:bottom-0 data-[side=bottom]:translate-y-3/4 data-[align=start]:start-3 data-[align=end]:end-3".split(" "),
    },
    variants,
    intents,
    // shadcn's names the system doesn't use itself, and the variant + intent pair each stands for.
    aliases: Object.entries(BUBBLE_ALIASES).filter(([n, a]) => !variants.includes(n) && variants.includes(a.variant) && intents.includes(a.intent)),
    defaultVariant: anatomy.axes.variant?.default ?? variants[0] ?? "solid",
    defaultIntent: anatomy.axes.intent?.default ?? intents[0] ?? "primary",
  };
}

export function bubbleTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots, variants, intents, aliases, defaultVariant, defaultIntent } = bubblePieces(anatomy);
    const root = slots.bubble;
    const group = classString(slots["bubble-group"]);
    const p = poly(base);
    return `import * as React from "react";
${p.imports}
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

function BubbleGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="bubble-group" className={cn(${group}, className)} {...props} />;
}

${cvaSource("bubbleVariants", root)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};
const aliases = {
${aliases.map(([n, a]) => `  ${q(n)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} },`).join("\n")}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

function resolveAxes(variant: Variant | Alias | undefined, intent: Intent | undefined) {
  if (variant !== undefined && variant in aliases) {
    const alias = aliases[variant as Alias];
    return { variant: alias.variant, intent: intent ?? alias.intent };
  }
  return { variant: (variant as Variant | undefined) ?? ${q(defaultVariant)}, intent: intent ?? ${q(defaultIntent)} };
}

// align="end" for your own messages.
function Bubble({
  variant,
  intent,
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> & { variant?: Variant | Alias | undefined; intent?: Intent | undefined; align?: "start" | "end" }) {
  const axes = resolveAxes(variant, intent);
  return <div data-slot="bubble" data-variant={axes.variant} data-intent={axes.intent} data-align={align} className={cn(bubbleVariants(axes), className)} {...props} />;
}

// The text (or a button or link) inside the bubble.
function BubbleContent({ className, ${p.destructure}...props }: ${p.props("div")}) {
  ${p.body("div", "bubble-content", `cn(${classString(slots["bubble-content"])}, className)`)}
}

// Emoji reactions pinned to the bubble's edge.
function BubbleReactions({ side = "bottom", align = "end", className, ...props }: React.ComponentProps<"div"> & { align?: "start" | "end"; side?: "top" | "bottom" }) {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align}
      data-side={side}
      className={cn(
        ${classString(slots["bubble-reactions"])},
        className,
      )}
      {...props}
    />
  );
}

export { BubbleGroup, Bubble, BubbleContent, BubbleReactions, bubbleVariants };
`;
  };
}

// Attachment's classes, which every framework's shell prints from. The root's cva sizes it and styles
// its media tile; "attachment:+…" entries are classes the root adds beside the cva (by orientation,
// and always), as "attachment-media:+image" is what an image tile adds.
export function attachmentPieces(anatomy: Anatomy, native: StatePrefixes = NATIVE_STATES) {
  const opts = { states: native };
  const rootStates: StatePrefixes = { ...native, hover: ["has-[>a,>button]:hover:"], "focus-visible": ["focus-within:"] };
  const root = factorClasses(anatomy, "root", { states: rootStates }, ["group/attachment", "relative", "flex", "w-fit", "max-w-full", "min-w-0", "shrink-0", "flex-wrap", "transition-colors", "data-[state=idle]:border-dashed"]);
  mergeInto(root, factorClasses(anatomy, "media", { ...opts, prefix: "*:data-[slot=attachment-media]:" }));
  // A failed upload: its border, its media tile and its description turn to the danger colors.
  const error = flatClasses(anatomy, "error", opts);
  root.base.push(
    ...error.filter((x) => /^border-(?!\()/.test(x)).map((x) => `data-[state=error]:${x}`),
    ...error.filter((x) => x.startsWith("bg-") || x.startsWith("text-")).map((x) => `data-[state=error]:*:data-[slot=attachment-media]:${x}`),
  );
  const sizes = anatomy.axes.size?.enabled ?? [];
  const split = (classes: string) => classes.split(" ");
  return {
    slots: {
      attachment: root,
      "attachment:+vertical": split("w-24 flex-col has-data-[slot=attachment-content]:w-30"),
      "attachment:+horizontal": split("min-w-40 items-center"),
      "attachment:+padding": split("has-data-[slot=attachment-content]:px-2.5 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2"),
      "attachment-media": split(
        "relative flex aspect-square shrink-0 items-center justify-center overflow-hidden [&_svg]:pointer-events-none [&_svg]:size-4 group-data-[orientation=vertical]/attachment:w-full group-data-[orientation=vertical]/attachment:[&_svg]:size-6",
      ),
      "attachment-media:+image": split("opacity-60 group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover"),
      "attachment-content": split("max-w-full min-w-0 flex-1 leading-tight group-data-[orientation=vertical]/attachment:px-1"),
      "attachment-title": flatClasses(anatomy, "title", opts, ["block", "max-w-full", "min-w-0", "truncate", "group-data-[state=uploading]/attachment:animate-pulse", "group-data-[state=processing]/attachment:animate-pulse"]),
      "attachment-description": flatClasses(anatomy, "description", opts, ["mt-0.5", "block", "max-w-full", "min-w-0", "truncate"]).concat(
        flatClasses(anatomy, "error", { ...opts, prefix: "group-data-[state=error]/attachment:" }).filter((x) => x.includes(":text-")),
      ),
      "attachment-actions": split(
        "relative z-20 flex shrink-0 items-center group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:top-3 group-data-[orientation=vertical]/attachment:end-3 group-data-[orientation=vertical]/attachment:gap-1",
      ),
      "attachment-trigger": split("absolute inset-0 z-10 outline-none"),
      "attachment-group": flatClasses(anatomy, "group", opts, ["flex", "min-w-0", "snap-x", "snap-mandatory", "overflow-x-auto", "overscroll-x-contain", "py-1", "[scrollbar-width:none]", "*:data-[slot=attachment]:flex-none", "*:data-[slot=attachment]:snap-start"]),
    },
    sizes,
    defaultSize: anatomy.axes.size?.default ?? sizes[0] ?? "md",
    // The Button an action is: ghost, the smallest icon size.
    action: { variant: "ghost", size: "icon-xs" },
  };
}

export function attachmentTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots, sizes, defaultSize, action } = attachmentPieces(anatomy);
    const root = slots.attachment;
    const title = classString(slots["attachment-title"]);
    const description = classString(slots["attachment-description"]);
    const group = classString(slots["attachment-group"]);
    const p = poly(base);
    const triggerClasses = `cn(${classString(slots["attachment-trigger"])}, className)`;
    const trigger =
      base === "base-ui"
        ? `function AttachmentTrigger({ className, render, type, ...props }: useRender.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">({ type: render ? type : (type ?? "button"), className: ${triggerClasses} }, props),
    render,
    state: { slot: "attachment-trigger" },
  });
}`
        : base === "radix"
          ? `function AttachmentTrigger({ className, asChild = false, type, ...props }: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="attachment-trigger" type={asChild ? type : (type ?? "button")} className={${triggerClasses}} {...props} />;
}`
          : `function AttachmentTrigger({ className, render, type, ...props }: React.ComponentProps<"button"> & { render?: (props: React.HTMLAttributes<HTMLElement>) => React.ReactNode }) {
  if (render) return render({ ...props, "data-slot": "attachment-trigger", className: ${triggerClasses} } as React.HTMLAttributes<HTMLElement>);
  return <button {...props} type={type ?? "button"} data-slot="attachment-trigger" className={${triggerClasses}} />;
}`;
    return `import * as React from "react";
${p.imports}
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

${cvaSource("attachmentVariants", root)}

type Size = ${unionType(sizes)};

// state: idle (a drop target), uploading, processing, error or done.
function Attachment({
  className,
  state = "done",
  size = "default",
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & { state?: "idle" | "uploading" | "processing" | "error" | "done"; size?: Size | "default"; orientation?: "horizontal" | "vertical" }) {
  const resolved: Size = size === "default" ? ${q(defaultSize)} : size;
  return (
    <div
      data-slot="attachment"
      data-state={state}
      data-size={resolved}
      data-orientation={orientation}
      className={cn(
        attachmentVariants({ size: resolved }),
        orientation === "vertical" ? ${classString(slots["attachment:+vertical"])} : ${classString(slots["attachment:+horizontal"])},
        ${classString(slots["attachment:+padding"])},
        className,
      )}
      {...props}
    />
  );
}

// variant="image" crops a picture to a square.
function AttachmentMedia({ className, variant = "icon", ...props }: React.ComponentProps<"div"> & { variant?: "icon" | "image" }) {
  return (
    <div
      data-slot="attachment-media"
      data-variant={variant}
      className={cn(
        ${classString(slots["attachment-media"])},
        variant === "image" && ${classString(slots["attachment-media:+image"])},
        className,
      )}
      {...props}
    />
  );
}

function AttachmentContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="attachment-content" className={cn(${classString(slots["attachment-content"])}, className)} {...props} />;
}

function AttachmentTitle({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="attachment-title" className={cn(${title}, className)} {...props} />;
}

function AttachmentDescription({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="attachment-description" className={cn(${description}, className)} {...props} />;
}

function AttachmentActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn(${classString(slots["attachment-actions"])}, className)}
      {...props}
    />
  );
}

// Remove, retry, open: the system's ghost icon buttons.
function AttachmentAction({ variant, size = ${q(action.size)}, ...props }: React.ComponentProps<typeof Button>) {
  return <Button data-slot="attachment-action" variant={variant ?? ${q(action.variant)}} size={size} {...props} />;
}

// Covers the whole attachment, so clicking it opens the file.
${trigger}

// A row of attachments that scrolls sideways.
function AttachmentGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="attachment-group" className={cn(${group}, className)} {...props} />;
}

export { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction, AttachmentTrigger };
`;
  };
}

// Marker's classes, which every framework's shell prints from: a cva by variant (rules either side,
// or one underneath, from the rule part), and its icon and content.
export function markerPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  const root = flatClasses(anatomy, "root", { states }, ["group/marker", "relative", "flex", "min-h-4", "w-full", "items-center", "text-start", "[a]:underline", "[a]:underline-offset-3", "[&_svg]:size-4"]);
  const rule = flatClasses(anatomy, "rule", { states });
  const before = rule.map((x) => `before:${x}`);
  const after = rule.map((x) => `after:${x}`);
  const border = rule.filter((x) => x.startsWith("bg-")).map((x) => `border-${x.slice(3)}`);
  const marker: CvaConfig = {
    base: root,
    variants: {
      variant: {
        default: [],
        separator: ["before:min-w-0", "before:flex-1", "before:me-1", ...before, "after:min-w-0", "after:flex-1", "after:ms-1", ...after],
        border: ["border-b-(length:--border-width)", ...border, "pb-2"],
      },
    },
    compoundVariants: [],
    defaultVariants: { variant: "default" },
  };
  return {
    slots: {
      marker,
      "marker-icon": ["size-4", "shrink-0", "[&_svg]:size-4"],
      "marker-content": "min-w-0 wrap-break-word group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center *:[a]:underline *:[a]:underline-offset-3".split(" "),
    },
  };
}

export function markerTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots } = markerPieces(anatomy);
    const variant = slots.marker.variants.variant!;
    const p = poly(base);
    return `import * as React from "react";
${p.imports}
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// variant="separator" draws rules either side; "border" rules it underneath.
const markerVariants = cva(${classString(slots.marker.base)}, {
  variants: {
    variant: {
      default: ${classString(variant["default"]!)},
      separator: ${classString(variant["separator"]!)},
      border: ${classString(variant["border"]!)},
    },
  },
  defaultVariants: { variant: "default" },
});

function Marker({ className, variant = "default", ${p.destructure}...props }: ${p.props("div")} & VariantProps<typeof markerVariants>) {
  ${p.body("div", "marker", "cn(markerVariants({ variant }), className)", polyAttrs(base, { variant: "variant" }))}
}

function MarkerIcon({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="marker-icon" aria-hidden="true" className={cn(${classString(slots["marker-icon"])}, className)} {...props} />;
}

function MarkerContent({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="marker-content"
      className={cn(${classString(slots["marker-content"])}, className)}
      {...props}
    />
  );
}

export { Marker, MarkerIcon, MarkerContent, markerVariants };
`;
  };
}

// Message scroller's classes, which every framework's shell prints from; its button is the system's
// Button (outline, the small icon size) with these classes beside its own.
export function messageScrollerPieces(anatomy: Anatomy) {
  const split = (classes: string) => classes.split(" ");
  return {
    slots: {
      "message-scroller": split("group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden"),
      "message-scroller-viewport": split("size-full min-h-0 min-w-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:thin] contain-content data-pending-scroll:invisible"),
      "message-scroller-content": flatClasses(anatomy, "content", { states: NATIVE_STATES }, ["flex", "h-max", "min-h-full", "flex-col"]),
      "message-scroller-item": split("min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]"),
      "message-scroller-button": split(
        "absolute start-1/2 -translate-x-1/2 transition-[translate,scale,opacity] duration-200 data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[active=true]:translate-y-0 data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[direction=end]:bottom-4 data-[direction=end]:data-[active=false]:translate-y-full data-[direction=start]:top-4 data-[direction=start]:data-[active=false]:-translate-y-full rtl:translate-x-1/2 data-[direction=start]:[&_svg]:rotate-180",
      ),
    },
    button: { variant: "outline", size: "icon-sm" },
  };
}

// shadcn's message scroller on @shadcn/react: sticks to the newest message and offers a jump back.
export function renderMessageScroller(anatomy: Anatomy): string {
  const { slots, button } = messageScrollerPieces(anatomy);
  const c = (slot: keyof typeof slots) => classString(slots[slot]);
  return `import * as React from "react";
import { MessageScroller as MessageScrollerPrimitive, useMessageScroller, useMessageScrollerScrollable, useMessageScrollerVisibility } from "@shadcn/react/message-scroller";
import { ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function MessageScrollerProvider(props: React.ComponentProps<typeof MessageScrollerPrimitive.Provider>) {
  return <MessageScrollerPrimitive.Provider {...props} />;
}

function MessageScroller({ className, ...props }: React.ComponentProps<typeof MessageScrollerPrimitive.Root>) {
  return <MessageScrollerPrimitive.Root data-slot="message-scroller" className={cn(${c("message-scroller")}, className)} {...props} />;
}

function MessageScrollerViewport({ className, ...props }: React.ComponentProps<typeof MessageScrollerPrimitive.Viewport>) {
  return (
    <MessageScrollerPrimitive.Viewport
      data-slot="message-scroller-viewport"
      className={cn(${c("message-scroller-viewport")}, className)}
      {...props}
    />
  );
}

function MessageScrollerContent({ className, ...props }: React.ComponentProps<typeof MessageScrollerPrimitive.Content>) {
  return <MessageScrollerPrimitive.Content data-slot="message-scroller-content" className={cn(${c("message-scroller-content")}, className)} {...props} />;
}

// scrollAnchor keeps this item in view as newer ones arrive.
function MessageScrollerItem({ className, scrollAnchor = false, ...props }: React.ComponentProps<typeof MessageScrollerPrimitive.Item>) {
  return (
    <MessageScrollerPrimitive.Item
      data-slot="message-scroller-item"
      scrollAnchor={scrollAnchor}
      className={cn(${c("message-scroller-item")}, className)}
      {...props}
    />
  );
}

// Appears when you have scrolled away from the newest (or oldest) message.
function MessageScrollerButton({
  direction = "end",
  className,
  children,
  render,
  variant = "${button.variant}",
  size = "${button.size}",
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Button> & Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <MessageScrollerPrimitive.Button
      data-slot="message-scroller-button"
      data-direction={direction}
      direction={direction}
      className={cn(
        ${c("message-scroller-button")},
        className,
      )}
      render={render ?? <Button variant={variant} size={size} />}
      {...props}
    >
      {children ?? (
        <>
          <ArrowDownIcon />
          <span className="sr-only">{direction === "end" ? "Scroll to end" : "Scroll to start"}</span>
        </>
      )}
    </MessageScrollerPrimitive.Button>
  );
}

export {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
};
`;
}

// Questionnaire's classes, which every framework's shell prints from. A choice is a label around a
// hidden radio or checkbox, marked data-checked, data-invalid and data-type (radio or checkbox) as
// @shadcn/react marks it; its indicator reads those through the group/questionnaire-choice name.
// The four buttons are the system's Button (buttonVariants) placed in the actions' grid.
export function questionnairePieces(anatomy: Anatomy) {
  const choiceStates: StatePrefixes = { ...NATIVE_STATES, selected: ["data-checked:"], invalid: ["data-invalid:"], "focus-visible": ["has-[>input:focus-visible]:"] };
  const indicatorStates: StatePrefixes = { ...NATIVE_STATES, selected: ["group-data-checked/questionnaire-choice:"] };
  const inputStates: StatePrefixes = { ...NATIVE_STATES, invalid: ["aria-invalid:"] };
  const c = (part: string, extra: string[] = [], states: StatePrefixes = NATIVE_STATES) => flatClasses(anatomy, part, { states }, extra);
  const split = (classes: string) => classes.split(" ");
  const place = (col: string) => split(`${col} row-start-1 min-h-11 sm:min-h-0`);
  return {
    slots: {
      questionnaire: c("root", ["flex", "w-full", "min-w-0", "flex-col"]),
      "questionnaire-progress": c("progress", ["min-h-[1lh]", "w-fit", "min-w-[14ch]", "tabular-nums"]),
      "questionnaire-item": split("flex min-w-0 flex-col gap-5 border-0 p-0 outline-none"),
      "questionnaire-title": c("title", ["text-pretty", "[&:not(:has(~[data-slot=questionnaire-description]))]:mb-5"]),
      "questionnaire-description": c("description", ["text-pretty"]),
      "questionnaire-choices": c("choices", ["group/questionnaire-choices", "grid", "min-w-0"]),
      "questionnaire-choice": c(
        "choice",
        ["group/questionnaire-choice", "relative", "flex", "min-h-11", "cursor-pointer", "items-start", "text-start", "transition-colors", "outline-none", "select-none", "data-disabled:pointer-events-none", "data-disabled:cursor-not-allowed", "data-disabled:opacity-50"],
        choiceStates,
      ),
      "questionnaire-choice-input": split("absolute inset-0 z-10 size-full cursor-pointer opacity-0"),
      "questionnaire-choice-indicator": c("indicator", ["pointer-events-none", "relative", "flex", "shrink-0", "translate-y-0.5", "items-center", "justify-center", "group-data-[type=radio]/questionnaire-choice:rounded-full"], indicatorStates),
      "questionnaire-choice-indicator-dot": split("hidden size-2 rounded-full bg-current group-data-checked/questionnaire-choice:block group-data-[type=checkbox]/questionnaire-choice:hidden"),
      "questionnaire-choice-indicator-check": split("hidden size-3.5 group-data-checked/questionnaire-choice:block group-data-[type=radio]/questionnaire-choice:hidden"),
      "questionnaire-choice-label": split("flex min-w-0 flex-1 flex-col gap-1 leading-snug"),
      "questionnaire-choice-shortcut": c("shortcut", ["pointer-events-none", "ms-auto", "hidden", "size-5", "shrink-0", "translate-y-0.5", "items-center", "justify-center", "leading-none", "group-data-[shortcut]/questionnaire-choice:inline-flex"]),
      "questionnaire-choice-description": c("description"),
      "questionnaire-input-wrapper": split("group/questionnaire-input relative w-full min-w-0"),
      "questionnaire-input": c("input", ["w-full", "min-w-0", "bg-transparent", "outline-none", "transition-[color,box-shadow,background-color]", "disabled:pointer-events-none", "disabled:cursor-not-allowed", "disabled:opacity-50"], inputStates),
      "questionnaire-error": c("error"),
      "questionnaire-actions": c("actions", ["grid", "min-h-11", "w-full", "grid-cols-[minmax(0,1fr)_auto_auto]", "items-center", "sm:min-h-9"]),
      "questionnaire-previous": place("col-start-1 justify-self-start"),
      "questionnaire-skip": place("col-start-2 justify-self-end"),
      "questionnaire-next": place("col-start-3 justify-self-end"),
      "questionnaire-submit": place("col-start-3 justify-self-end"),
    },
    // Each button's part, the Button look it takes by default, and its label.
    buttons: [
      { part: "Previous", variant: "outline", label: "Previous" },
      { part: "Skip", variant: "outline", label: "Skip" },
      { part: "Next", variant: "default", label: "Next" },
      { part: "Submit", variant: "default", label: "Submit" },
    ],
  };
}

// shadcn's questionnaire on @shadcn/react: one question at a time, choices or free text.
export function renderQuestionnaire(anatomy: Anatomy): string {
  const { slots, buttons } = questionnairePieces(anatomy);
  const c = (slot: keyof typeof slots) => classString(slots[slot]);
  const button = ({ part, variant, label }: (typeof buttons)[number]) => `function Questionnaire${part}({ children, className, size = "default", variant = "${variant}", ...props }: React.ComponentProps<typeof QuestionnairePrimitive.${part}> & Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  return (
    <QuestionnairePrimitive.${part} data-slot="questionnaire-${part.toLowerCase()}" className={cn(buttonVariants({ size, variant }), ${c(`questionnaire-${part.toLowerCase()}` as keyof typeof slots)}, className)} {...props}>
      {label(children ?? "${label}")}
    </QuestionnairePrimitive.${part}>
  );
}`;
  return `import * as React from "react";
import { Questionnaire as QuestionnairePrimitive } from "@shadcn/react/questionnaire";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants, type Button } from "@/components/ui/button";

${TEXT_IN_SPAN}

function Questionnaire({ className, ...props }: React.ComponentProps<typeof QuestionnairePrimitive.Root>) {
  return <QuestionnairePrimitive.Root data-slot="questionnaire" className={cn(${c("questionnaire")}, className)} {...props} />;
}

// "2 of 5".
function QuestionnaireProgress({ className, ...props }: React.ComponentProps<typeof QuestionnairePrimitive.Progress>) {
  return <QuestionnairePrimitive.Progress data-slot="questionnaire-progress" className={cn(${c("questionnaire-progress")}, className)} {...props} />;
}

function QuestionnaireItem({ className, ...props }: React.ComponentProps<typeof QuestionnairePrimitive.Item>) {
  return <QuestionnairePrimitive.Item data-slot="questionnaire-item" className={cn(${c("questionnaire-item")}, className)} {...props} />;
}

function QuestionnaireTitle({ className, ...props }: React.ComponentProps<typeof QuestionnairePrimitive.Title>) {
  return <QuestionnairePrimitive.Title data-slot="questionnaire-title" className={cn(${c("questionnaire-title")}, className)} {...props} />;
}

function QuestionnaireDescription({ className, ...props }: React.ComponentProps<typeof QuestionnairePrimitive.Description>) {
  return <QuestionnairePrimitive.Description data-slot="questionnaire-description" className={cn(${c("questionnaire-description")}, className)} {...props} />;
}

function QuestionnaireChoices({ className, ...props }: React.ComponentProps<typeof QuestionnairePrimitive.Choices>) {
  return <QuestionnairePrimitive.Choices data-slot="questionnaire-choices" className={cn(${c("questionnaire-choices")}, className)} {...props} />;
}

// A radio or checkbox row, depending on the question; a shortcut key shows when set.
function QuestionnaireChoice({ children, className, ...props }: React.ComponentProps<typeof QuestionnairePrimitive.Choice>) {
  return (
    <QuestionnairePrimitive.Choice
      data-slot="questionnaire-choice"
      className={cn(
        ${c("questionnaire-choice")},
        className,
      )}
      {...props}
    >
      <QuestionnairePrimitive.ChoiceInput data-slot="questionnaire-choice-input" className=${c("questionnaire-choice-input")} />
      <span
        aria-hidden="true"
        data-slot="questionnaire-choice-indicator"
        className=${c("questionnaire-choice-indicator")}
      >
        <span data-slot="questionnaire-choice-indicator-dot" className=${c("questionnaire-choice-indicator-dot")} />
        <CheckIcon data-slot="questionnaire-choice-indicator-check" className=${c("questionnaire-choice-indicator-check")} />
      </span>
      <QuestionnairePrimitive.ChoiceLabel data-slot="questionnaire-choice-label" className=${c("questionnaire-choice-label")}>
        {children}
      </QuestionnairePrimitive.ChoiceLabel>
      <QuestionnairePrimitive.ChoiceShortcut
        data-slot="questionnaire-choice-shortcut"
        className=${c("questionnaire-choice-shortcut")}
      />
    </QuestionnairePrimitive.Choice>
  );
}

function QuestionnaireChoiceDescription({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="questionnaire-choice-description" className={cn(${c("questionnaire-choice-description")}, className)} {...props} />;
}

function QuestionnaireInput({ className, ...props }: React.ComponentProps<typeof QuestionnairePrimitive.Input>) {
  return (
    <div data-slot="questionnaire-input-wrapper" className=${c("questionnaire-input-wrapper")}>
      <QuestionnairePrimitive.Input
        data-slot="questionnaire-input"
        className={cn(${c("questionnaire-input")}, className)}
        {...props}
      />
    </div>
  );
}

function QuestionnaireError({ className, ...props }: React.ComponentProps<typeof QuestionnairePrimitive.Error>) {
  return <QuestionnairePrimitive.Error data-slot="questionnaire-error" className={cn(${c("questionnaire-error")}, className)} {...props} />;
}

function QuestionnaireActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="questionnaire-actions" className={cn(${c("questionnaire-actions")}, className)} {...props} />;
}

${buttons.map(button).join("\n\n")}

export {
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
};
`;
}
