import type { Anatomy, Base } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString, cvaSource, q, unionType } from "./codegen";
import { factorClasses, flatClasses, type CvaConfig } from "./factor";

// Folds another part's classes (under a selector prefix) into a cva config, axis by axis, so a
// child's per-variant or per-intent look can ride on its parent (Alert's title and description).
export function mergeInto(target: CvaConfig, source: CvaConfig) {
  target.base.push(...source.base);
  for (const [name, values] of Object.entries(source.variants)) {
    const axis = name as keyof CvaConfig["variants"];
    const into = (target.variants[axis] ??= {});
    for (const [value, classes] of Object.entries(values ?? {})) into[value] = [...(into[value] ?? []), ...classes];
  }
  target.compoundVariants.push(...source.compoundVariants);
}

// Polymorphism in each library's idiom: Base UI's render prop (via useRender), Radix's asChild,
// or a render function (shadcn's React Aria components).
type Poly = { imports: string; props: (tag: string) => string; destructure: string; body: (tag: string, slot: string, className: string, attrs?: string) => string };
export function poly(base: Base): Poly {
  if (base === "base-ui") {
    return {
      imports: `import { mergeProps } from "@base-ui/react/merge-props";\nimport { useRender } from "@base-ui/react/use-render";`,
      props: (tag) => `useRender.ComponentProps<"${tag}">`,
      destructure: "render, ",
      body: (tag, slot, className, attrs = "") => `return useRender({
    defaultTagName: "${tag}",
    props: mergeProps<"${tag}">({ className: ${className} }, props),
    render,
    state: { slot: "${slot}"${attrs} },
  });`,
    };
  }
  if (base === "radix") {
    return {
      imports: `import { Slot } from "radix-ui";`,
      props: (tag) => `React.ComponentProps<"${tag}"> & { asChild?: boolean }`,
      destructure: "asChild = false, ",
      body: (tag, slot, className, attrs = "") => `const Comp = asChild ? Slot.Root : "${tag}";
  return <Comp data-slot="${slot}"${attrs ? ` {...{ ${attrs.replace(/^, /, "")} }}` : ""} className={${className}} {...props} />;`,
    };
  }
  return {
    imports: "",
    props: (tag) => `React.ComponentProps<"${tag}"> & { render?: (props: React.HTMLAttributes<HTMLElement>) => React.ReactNode }`,
    destructure: "render, ",
    body: (tag, slot, className, attrs = "") => `const merged = { "data-slot": "${slot}"${attrs ? `, ${attrs.replace(/^, /, "")}` : ""}, className: ${className}, ...props };
  return render ? render(merged) : <${tag} {...merged} />;`,
  };
}

// Radix and Base UI use state as data attributes; the render-function form needs them spelled out.
export const polyAttrs = (base: Base, pairs: Record<string, string>) =>
  base === "base-ui"
    ? Object.entries(pairs).map(([k, v]) => `, ${k}: ${v}`).join("")
    : Object.entries(pairs).map(([k, v]) => `, "data-${k}": ${v}`).join("");

// A rule drawn from a part's background and height, across or down.
export function ruleClasses(anatomy: Anatomy, part: string, orientation: "data" | "aria" = "data", states: StatePrefixes = NATIVE_STATES): string[] {
  const own = flatClasses(anatomy, part, { states });
  const h = orientation === "data" ? "data-[orientation=horizontal]:" : "aria-[orientation=horizontal]:";
  const v = orientation === "data" ? "data-[orientation=vertical]:" : "aria-[orientation=vertical]:";
  return [
    "shrink-0",
    ...own.flatMap((c) => (c.startsWith("h-") ? [`${h}${c}`, `${h}w-full`, `${v}w-${c.slice(2)}`, `${v}self-stretch`] : [c])),
  ];
}

// Separator's classes, which every framework's shell prints from. They read data-orientation, which
// the separator must carry.
export function separatorPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  return { slots: { separator: ruleClasses(anatomy, "root", "data", states) } };
}

export function separatorTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const classes = classString(separatorPieces(anatomy).slots.separator);
    if (base === "react-aria") {
      return `import * as React from "react";
import { Separator as SeparatorPrimitive, type SeparatorProps } from "react-aria-components";
import { cn } from "@/lib/utils";

function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
  return <SeparatorPrimitive data-slot="separator" data-orientation={orientation} orientation={orientation} className={cn("block border-0", ${classes}, className)} {...props} />;
}

export { Separator };
`;
    }
    if (base === "radix") {
      return `import * as React from "react";
import { Separator as SeparatorPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// Decorative by default, as in shadcn; decorative={false} announces it.
function Separator({ className, orientation = "horizontal", decorative = true, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return <SeparatorPrimitive.Root data-slot="separator" decorative={decorative} orientation={orientation} className={cn(${classes}, className)} {...props} />;
}

export { Separator };
`;
    }
    return `import * as React from "react";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "@/lib/utils";

function Separator({ className, orientation = "horizontal", ...props }: Omit<React.ComponentProps<typeof SeparatorPrimitive>, "className"> & { className?: string }) {
  return <SeparatorPrimitive data-slot="separator" orientation={orientation} className={cn(${classes}, className)} {...props} />;
}

export { Separator };
`;
  };
}

// Skeleton's classes, which every framework's shell prints from.
export function skeletonPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  return { slots: { skeleton: flatClasses(anatomy, "root", { states }, ["animate-pulse", "motion-reduce:animate-none"]) } };
}

export function renderSkeleton(anatomy: Anatomy): string {
  const { slots } = skeletonPieces(anatomy);
  return `import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn(${classString(slots.skeleton)}, className)} {...props} />;
}

export { Skeleton };
`;
}

// Spinner's classes, which every framework's shell prints from. The spinner is the Loader2 icon itself.
export function spinnerPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  return { slots: { spinner: flatClasses(anatomy, "root", { states }, ["animate-spin", "motion-reduce:[animation-duration:1.5s]"]) } };
}

export function renderSpinner(anatomy: Anatomy): string {
  const { slots } = spinnerPieces(anatomy);
  return `import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2Icon>) {
  return <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn(${classString(slots.spinner)}, className)} {...props} />;
}

export { Spinner };
`;
}

// Kbd's classes, which every framework's shell prints from.
export function kbdPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  return {
    slots: {
      kbd: flatClasses(anatomy, "root", { states }, [
        "pointer-events-none",
        "inline-flex",
        "w-fit",
        "items-center",
        "justify-center",
        "select-none",
        "font-sans",
        "[&_svg]:size-3",
        // Inside a tooltip, a key takes the tooltip's colors.
        "in-data-[slot=tooltip-content]:bg-current/20",
        "in-data-[slot=tooltip-content]:text-current",
      ]),
      "kbd-group": flatClasses(anatomy, "group", { states }, ["inline-flex", "items-center"]),
    },
  };
}

export function renderKbd(anatomy: Anatomy): string {
  const { slots } = kbdPieces(anatomy);
  return `import * as React from "react";
import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="kbd" className={cn(${classString(slots.kbd)}, className)} {...props} />;
}

function KbdGroup({ className, ...props }: React.ComponentProps<"kbd">) {
  return <kbd data-slot="kbd-group" className={cn(${classString(slots["kbd-group"])}, className)} {...props} />;
}

export { Kbd, KbdGroup };
`;
}

// Radix's AspectRatio, and Reka's and Bits' after it, keep the shape with an inline padding and
// take no classes of their own.
export function aspectRatioPieces() {
  return { slots: {} };
}

export function aspectRatioTemplate(base: Base) {
  return (): string => {
    if (base === "radix") {
      return `import * as React from "react";
import { AspectRatio as AspectRatioPrimitive } from "radix-ui";

function AspectRatio(props: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
`;
    }
    return `import * as React from "react";
import { cn } from "@/lib/utils";

// ratio is width / height, e.g. 16 / 9.
function AspectRatio({ ratio, className, style, ...props }: React.ComponentProps<"div"> & { ratio: number }) {
  return <div data-slot="aspect-ratio" style={{ "--ratio": ratio, ...style } as React.CSSProperties} className={cn("relative aspect-(--ratio)", className)} {...props} />;
}

export { AspectRatio };
`;
  };
}

// Alert: variant and intent, with shadcn's names (default, destructive) as aliases. The icon,
// title and description take the alert's intent, so their looks ride on the root.
const ALERT_ALIASES: Record<string, { variant: string; intent: string }> = {
  default: { variant: "outline", intent: "neutral" },
  destructive: { variant: "outline", intent: "danger" },
};

// Alert's classes and axes, which every framework's shell prints from. The icon's, title's and
// description's looks ride on the root; their own elements keep only layout.
export function alertPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  const opts = { states };
  const root = factorClasses(anatomy, "root", opts, [
    "group/alert",
    "relative",
    "grid",
    "w-full",
    "text-start",
    "has-[>svg]:grid-cols-[auto_1fr]",
    "*:[svg]:row-span-2",
    "*:[svg]:translate-y-0.5",
    "has-data-[slot=alert-action]:pe-18",
  ]);
  mergeInto(root, factorClasses(anatomy, "icon", { ...opts, prefix: "*:[svg]:" }));
  mergeInto(root, factorClasses(anatomy, "title", { ...opts, prefix: "*:data-[slot=alert-title]:" }));
  mergeInto(root, factorClasses(anatomy, "description", { ...opts, prefix: "*:data-[slot=alert-description]:" }));
  // The recipe's gap spaces the icon from the text; title and description sit close. Last, so it wins.
  root.base.push("gap-y-0.5");
  const variants = anatomy.axes.variant?.enabled ?? [];
  const intents = anatomy.axes.intent?.enabled ?? [];
  const aliases = Object.entries(ALERT_ALIASES).filter(([name, a]) => !variants.includes(name) && variants.includes(a.variant) && intents.includes(a.intent));
  return {
    slots: {
      alert: root,
      "alert-title": ["group-has-[>svg]/alert:col-start-2", "[&_a]:underline", "[&_a]:underline-offset-3"],
      "alert-description": ["group-has-[>svg]/alert:col-start-2", "text-balance", "md:text-pretty", "[&_a]:underline", "[&_a]:underline-offset-3", "[&_p:not(:last-child)]:mb-4"],
      "alert-action": flatClasses(anatomy, "action", opts, ["absolute", "top-2.5", "end-3"]),
    },
    variants: [...variants],
    intents: [...intents],
    defaultVariant: anatomy.axes.variant?.default ?? variants[0] ?? "outline",
    defaultIntent: anatomy.axes.intent?.default ?? intents[0] ?? "neutral",
    // shadcn names the system doesn't use itself, and the variant + intent pair each stands for.
    aliases: aliases.map(([name, a]): [string, { variant: string; intent: string }] => [name, { variant: a.variant, intent: a.intent }]),
  };
}

export function renderAlert(anatomy: Anatomy): string {
  const { slots, variants, intents, defaultVariant, defaultIntent, aliases } = alertPieces(anatomy);
  return `import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

${cvaSource("alertVariants", slots.alert)}

type Variant = ${unionType(variants)};
type Intent = ${unionType(intents)};

// shadcn's names keep working.
const aliases = {
${aliases.map(([name, a]) => `  ${q(name)}: { variant: ${q(a.variant)}, intent: ${q(a.intent)} },`).join("\n")}
} as const satisfies Record<string, { variant: Variant; intent: Intent }>;
type Alias = keyof typeof aliases;

function resolveAxes(variant: Variant | Alias | undefined, intent: Intent | undefined) {
  if (variant !== undefined && variant in aliases) {
    const alias = aliases[variant as Alias];
    return { variant: alias.variant, intent: intent ?? alias.intent };
  }
  return { variant: (variant as Variant | undefined) ?? ${q(defaultVariant)}, intent: intent ?? ${q(defaultIntent)} };
}

function Alert({ className, variant, intent, ...props }: React.ComponentProps<"div"> & { variant?: Variant | Alias | undefined; intent?: Intent | undefined }) {
  const axes = resolveAxes(variant, intent);
  return <div data-slot="alert" role="alert" data-variant={axes.variant} data-intent={axes.intent} className={cn(alertVariants(axes), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn(${classString(slots["alert-title"])}, className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn(${classString(slots["alert-description"])}, className)} {...props} />;
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-action" className={cn(${classString(slots["alert-action"])}, className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants };
export type AlertVariants = VariantProps<typeof alertVariants>;
`;
}

// Avatar's classes and sizes, which every framework's shell prints from. The frame and the
// fallback's look ride on the avatar; the badge and group count read the avatar's data-size.
export function avatarPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  const opts = { states };
  const sizes = anatomy.axes.size?.enabled ?? [];
  const defaultSize = anatomy.axes.size?.default ?? sizes[0] ?? "md";
  const root = factorClasses(anatomy, "root", opts, ["group/avatar", "relative", "flex", "shrink-0", "select-none", "after:absolute", "after:inset-0", "after:mix-blend-darken", "dark:after:mix-blend-lighten"]);
  mergeInto(root, factorClasses(anatomy, "frame", { ...opts, prefix: "after:" }));
  mergeInto(root, factorClasses(anatomy, "fallback", { ...opts, prefix: "*:data-[slot=avatar-fallback]:" }));
  // Avatars in a group overlap, each ringed in the page color like the count.
  const ring = flatClasses(anatomy, "group-count", opts).filter((c) => c.startsWith("ring-"));
  return {
    slots: {
      avatar: root,
      "avatar-image": flatClasses(anatomy, "image", opts, ["aspect-square", "size-full", "object-cover"]),
      // Initials, clipped to the avatar when they're longer than it: centered while they fit, from
      // their start when they don't (justify-center-safe).
      "avatar-fallback": ["flex", "size-full", "items-center", "justify-center-safe", "overflow-hidden"],
      "avatar-badge": flatClasses(anatomy, "badge", opts, [
        "absolute",
        "end-0",
        "bottom-0",
        "z-10",
        "inline-flex",
        "items-center",
        "justify-center",
        "select-none",
        "group-data-[size=sm]/avatar:size-2",
        "group-data-[size=sm]/avatar:[&>svg]:hidden",
        "size-2.5",
        "[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3",
      ]),
      "avatar-group": ["group/avatar-group", "flex", "-space-x-2", ...ring.map((c) => `*:data-[slot=avatar]:${c}`)],
      "avatar-group-count": flatClasses(anatomy, "group-count", opts, [
        "relative",
        "flex",
        "shrink-0",
        "items-center",
        "justify-center",
        "[&>svg]:size-4",
        ...sizes.map((s) => (s === defaultSize ? `size-(--avatar-size-${s})` : `group-has-data-[size=${s}]/avatar-group:size-(--avatar-size-${s})`)),
      ]),
    },
    sizes: [...sizes],
    defaultSize,
  };
}

export function avatarTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots, sizes, defaultSize } = avatarPieces(anatomy);
    const image = slots["avatar-image"];
    const fallback = slots["avatar-fallback"];
    const badge = slots["avatar-badge"];
    const count = slots["avatar-group-count"];
    const group = slots["avatar-group"];

    const header = `${cvaSource("avatarVariants", slots.avatar)}

type Size = ${unionType(sizes)};

function resolveSize(size: Size | "default"): Size {
  return size === "default" ? ${q(defaultSize)} : size;
}`;
    const shared = `// A dot at the bottom corner: online status, a count.
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="avatar-badge" className={cn(${classString(badge)}, className)} {...props} />;
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="avatar-group" className={cn(${classString(group)}, className)} {...props} />;
}

// "+3": how many more are in the group.
function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="avatar-group-count" className={cn(${classString(count)}, className)} {...props} />;
}`;
    const exports = `export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarBadge };`;

    if (base === "react-aria") {
      return `import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

${header}

function Avatar({ className, size = "default", ...props }: React.ComponentProps<"div"> & { size?: Size | "default" }) {
  const resolved = resolveSize(size);
  return <div data-slot="avatar" data-size={resolved} className={cn(avatarVariants({ size: resolved }), className)} {...props} />;
}

type ImageState = "loading" | "loaded" | "error";

// Hides itself if the picture fails, and the fallback after it shows instead.
function AvatarImage({ className, ...props }: React.ComponentProps<"img">) {
  const [state, setState] = React.useState<ImageState>(props.src ? "loading" : "error");
  return (
    <img
      data-slot="avatar-image"
      alt={props.alt ?? ""}
      data-state={state}
      onLoad={() => setState("loaded")}
      onError={() => setState("error")}
      className={cn("peer data-[state=error]:hidden", ${classString(image)}, className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="avatar-fallback" className={cn(${classString(fallback)}, "peer-[*]:hidden peer-data-[state=error]:flex", className)} {...props} />;
}

${shared}

${exports}
`;
    }
    const radix = base === "radix";
    const props = (part: string) => (radix ? `React.ComponentProps<typeof AvatarPrimitive.${part}>` : `Omit<React.ComponentProps<typeof AvatarPrimitive.${part}>, "className"> & { className?: string }`);
    return `import * as React from "react";
${radix ? `import { Avatar as AvatarPrimitive } from "radix-ui";` : `import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";`}
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

${header}

function Avatar({ className, size = "default", ...props }: ${props("Root")} & { size?: Size | "default" }) {
  const resolved = resolveSize(size);
  return <AvatarPrimitive.Root data-slot="avatar" data-size={resolved} className={cn(avatarVariants({ size: resolved }), className)} {...props} />;
}

function AvatarImage({ className, ...props }: ${props("Image")}) {
  return <AvatarPrimitive.Image data-slot="avatar-image" className={cn(${classString(image)}, className)} {...props} />;
}

// Shown until the picture loads, or instead of it: initials, an icon.
function AvatarFallback({ className, ...props }: ${props("Fallback")}) {
  return <AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn(${classString(fallback)}, className)} {...props} />;
}

${shared}

${exports}
`;
  };
}

const progressTrack = (anatomy: Anatomy, states: StatePrefixes) => flatClasses(anatomy, "track", { states }, ["relative", "flex", "w-full", "items-center", "overflow-x-hidden"]);
const progressIndicator = (anatomy: Anatomy, states: StatePrefixes) => flatClasses(anatomy, "indicator", { states }, ["h-full", "transition-all"]);

// Progress's classes as Radix draws it, which every framework's shell prints from: the root is the
// track, and the indicator fills it and is slid into place with an inline translateX of
// -(100 - value)%.
export function progressPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  return { slots: { progress: progressTrack(anatomy, states), "progress-indicator": ["size-full", "flex-1", ...progressIndicator(anatomy, states)] } };
}

export function progressTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const opts = { states: NATIVE_STATES };
    const track = progressTrack(anatomy, NATIVE_STATES);
    const indicator = progressIndicator(anatomy, NATIVE_STATES);
    const label = flatClasses(anatomy, "label", opts);
    const value = flatClasses(anatomy, "value", opts, ["ms-auto", "tabular-nums"]);
    const root = ["flex", "flex-wrap", "gap-3"];

    if (base === "radix") {
      const { slots } = progressPieces(anatomy);
      return `import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// value is 0-100.
function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn(${classString(slots.progress)}, className)} value={value} {...props}>
      <ProgressPrimitive.Indicator data-slot="progress-indicator" className=${classString(slots["progress-indicator"])} style={{ transform: \`translateX(-\${100 - (value ?? 0)}%)\` }} />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
`;
    }
    if (base === "react-aria") {
      return `import * as React from "react";
import { Label as LabelPrimitive, ProgressBar as ProgressPrimitive, type LabelProps, type ProgressBarProps } from "react-aria-components";
import { cn } from "@/lib/utils";

type ProgressState = { percentage?: number | undefined; isIndeterminate: boolean; valueText?: string | undefined };

const ProgressContext = React.createContext<ProgressState | null>(null);

function useProgress(): ProgressState {
  const context = React.useContext(ProgressContext);
  if (!context) throw new Error("useProgress must be used within a Progress.");
  return context;
}

// value between minValue and maxValue (0-100 by default); children go before the bar (a label, a value).
function Progress({ className, children, ...props }: Omit<ProgressBarProps, "children" | "className"> & { children?: React.ReactNode; className?: string }) {
  return (
    <ProgressPrimitive data-slot="progress" className={cn(${classString(root)}, className)} {...props}>
      {({ percentage, valueText, isIndeterminate }) => (
        <ProgressContext value={{ percentage, valueText, isIndeterminate }}>
          {children}
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </ProgressContext>
      )}
    </ProgressPrimitive>
  );
}

function ProgressTrack({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="progress-track" className={cn(${classString(track)}, className)} {...props} />;
}

function ProgressIndicator({ className, style, ...props }: React.ComponentProps<"span">) {
  const { percentage, isIndeterminate } = useProgress();
  return <span data-slot="progress-indicator" className={cn(${classString(indicator)}, className)} style={{ ...style, width: \`\${isIndeterminate ? 100 : (percentage ?? 0)}%\` }} {...props} />;
}

function ProgressLabel({ className, ...props }: LabelProps) {
  return <LabelPrimitive data-slot="progress-label" className={cn(${classString(label)}, className)} {...props} />;
}

function ProgressValue({ className, children, ...props }: Omit<React.ComponentProps<"span">, "children"> & { children?: (value: string) => React.ReactNode }) {
  const { valueText } = useProgress();
  return (
    <span data-slot="progress-value" className={cn(${classString(value)}, className)} {...props}>
      {children && valueText != null ? children(valueText) : valueText}
    </span>
  );
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue };
`;
    }
    const props = (part: string) => `Omit<React.ComponentProps<typeof ProgressPrimitive.${part}>, "className"> & { className?: string }`;
    return `import * as React from "react";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "@/lib/utils";

// value is 0-100 (null for indeterminate); children go before the bar (a label, a value).
function Progress({ className, children, value, ...props }: ${props("Root")}) {
  return (
    <ProgressPrimitive.Root value={value} data-slot="progress" className={cn(${classString(root)}, className)} {...props}>
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

function ProgressTrack({ className, ...props }: ${props("Track")}) {
  return <ProgressPrimitive.Track data-slot="progress-track" className={cn(${classString(track)}, className)} {...props} />;
}

function ProgressIndicator({ className, ...props }: ${props("Indicator")}) {
  return <ProgressPrimitive.Indicator data-slot="progress-indicator" className={cn(${classString(indicator)}, className)} {...props} />;
}

function ProgressLabel({ className, ...props }: ${props("Label")}) {
  return <ProgressPrimitive.Label data-slot="progress-label" className={cn(${classString(label)}, className)} {...props} />;
}

function ProgressValue({ className, ...props }: ${props("Value")}) {
  return <ProgressPrimitive.Value data-slot="progress-value" className={cn(${classString(value)}, className)} {...props} />;
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue };
`;
  };
}

// A cva whose axis isn't one of the system's (an orientation, an alignment, a media kind): the
// shape pieces functions give one in, which every framework's shell prints as it's written.
export type LocalCva = { base: string[]; variants: Record<string, Record<string, string[]>>; compoundVariants: []; defaultVariants: Record<string, string> };

// Empty's classes, which every framework's shell prints from. The media is a tile when it holds an
// icon (variant="icon").
export function emptyPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  const opts = { states };
  const media: LocalCva = {
    base: ["mb-2", "flex", "shrink-0", "items-center", "justify-center", "[&_svg]:pointer-events-none", "[&_svg]:shrink-0"],
    variants: { variant: { default: ["bg-transparent"], icon: flatClasses(anatomy, "media", opts, ["[&_svg]:size-6"]) } },
    compoundVariants: [],
    defaultVariants: { variant: "default" },
  };
  return {
    slots: {
      empty: flatClasses(anatomy, "root", opts, ["flex", "w-full", "min-w-0", "flex-1", "flex-col", "items-center", "justify-center", "text-center", "text-balance"]),
      "empty-header": flatClasses(anatomy, "header", opts, ["flex", "max-w-sm", "flex-col", "items-center"]),
      "empty-icon": media,
      "empty-title": flatClasses(anatomy, "title", opts),
      "empty-description": flatClasses(anatomy, "description", opts, ["[&>a]:underline", "[&>a]:underline-offset-4"]),
      "empty-content": flatClasses(anatomy, "content", opts, ["flex", "w-full", "max-w-sm", "min-w-0", "flex-col", "items-center", "text-balance"]),
    },
  };
}

export function renderEmpty(anatomy: Anatomy): string {
  const { slots } = emptyPieces(anatomy);
  const root = slots.empty;
  const header = slots["empty-header"];
  const media = slots["empty-icon"].variants["variant"]!["icon"]!;
  const title = slots["empty-title"];
  const description = slots["empty-description"];
  const content = slots["empty-content"];
  return `import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty" className={cn(${classString(root)}, className)} {...props} />;
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-header" className={cn(${classString(header)}, className)} {...props} />;
}

// variant="icon" puts the icon on a tile.
const emptyMediaVariants = cva(${classString(slots["empty-icon"].base)}, {
  variants: { variant: { default: ${classString(slots["empty-icon"].variants["variant"]!["default"]!)}, icon: ${classString(media)} } },
  defaultVariants: { variant: "default" },
});

function EmptyMedia({ className, variant = "default", ...props }: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return <div data-slot="empty-icon" data-variant={variant} className={cn(emptyMediaVariants({ variant }), className)} {...props} />;
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-title" className={cn(${classString(title)}, className)} {...props} />;
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-description" className={cn(${classString(description)}, className)} {...props} />;
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="empty-content" className={cn(${classString(content)}, className)} {...props} />;
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia };
`;
}

// Item hovers only when it is a link, as in shadcn.
const LINK_STATES: StatePrefixes = { ...NATIVE_STATES, hover: ["[a&]:hover:"] };
const ITEM_ALIASES: Record<string, string> = { default: "plain" };

// Item's classes and axes, which every framework's shell prints from: the row is a cva by variant
// and size; its media a cva by what it holds (an icon, an image).
export function itemPieces(anatomy: Anatomy, states: StatePrefixes = LINK_STATES) {
  const opts = { states };
  const variants = anatomy.axes.variant?.enabled ?? [];
  const sizes = anatomy.axes.size?.enabled ?? [];
  const media: LocalCva = {
    base: flatClasses(anatomy, "media", opts, ["flex", "shrink-0", "items-center", "justify-center", "[&_svg]:pointer-events-none", "group-has-data-[slot=item-description]/item:translate-y-0.5", "group-has-data-[slot=item-description]/item:self-start"]),
    variants: {
      variant: {
        default: ["bg-transparent"],
        icon: ["[&_svg]:size-4"],
        image: ["size-10", "overflow-hidden", "rounded-(--radius-sm)", "group-data-[size=sm]/item:size-8", "group-data-[size=xs]/item:size-6", "[&_img]:size-full", "[&_img]:object-cover"],
      },
    },
    compoundVariants: [],
    defaultVariants: { variant: "default" },
  };
  const edge = ["flex", "basis-full", "items-center", "justify-between", "gap-2"];
  return {
    slots: {
      item: factorClasses(anatomy, "root", opts, ["group/item", "flex", "w-full", "flex-wrap", "items-center", "outline-none", "transition-colors"]),
      "item-media": media,
      "item-content": flatClasses(anatomy, "content", opts, ["flex", "flex-1", "flex-col", "[&+[data-slot=item-content]]:flex-none", "group-data-[size=xs]/item:gap-0"]),
      "item-title": flatClasses(anatomy, "title", opts, ["line-clamp-1", "flex", "w-fit", "items-center", "leading-snug", "underline-offset-4"]),
      "item-description": flatClasses(anatomy, "description", opts, ["line-clamp-2", "text-start", "leading-normal", "font-normal", "[&>a]:underline", "[&>a]:underline-offset-4"]),
      "item-actions": flatClasses(anatomy, "actions", opts, ["flex", "min-w-0", "items-center"]),
      "item-separator": ["my-2", ...ruleClasses(anatomy, "separator")],
      "item-group": flatClasses(anatomy, "group", opts, ["group/item-group", "flex", "w-full", "flex-col"]),
      "item-header": edge,
      "item-footer": edge,
    },
    variants,
    sizes,
    defaultVariant: anatomy.axes.variant?.default ?? variants[0] ?? "plain",
    defaultSize: anatomy.axes.size?.default ?? sizes[0] ?? "md",
    // shadcn's names for the variants, where the system has what they stand for.
    aliases: Object.entries(ITEM_ALIASES).filter(([name, v]) => !variants.includes(name) && variants.includes(v)),
  };
}

export function itemTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots, variants, sizes, defaultVariant, defaultSize, aliases } = itemPieces(anatomy);
    const root = slots.item;
    const mediaCva = slots["item-media"];
    const media = mediaCva.base;
    const content = slots["item-content"];
    const title = slots["item-title"];
    const description = slots["item-description"];
    const actions = slots["item-actions"];
    const separator = slots["item-separator"].slice(1);
    const group = slots["item-group"];
    const mediaVariant = (name: string) => classString(mediaCva.variants["variant"]![name]!);
    const p = poly(base);
    return `import * as React from "react";
${p.imports}
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// A group is a list, so the items in it are list items.
const ItemGroupContext = React.createContext(false);

function ItemGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <ItemGroupContext value={true}>
      <div role="list" data-slot="item-group" className={cn(${classString(group)}, className)} {...props} />
    </ItemGroupContext>
  );
}

// Decorative: it sits between list items, where only items belong.
function ItemSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div role="none" data-orientation="horizontal" data-slot="item-separator" className={cn("my-2", ${classString(separator)}, className)} {...props} />;
}

${cvaSource("itemVariants", root)}

type Variant = ${unionType(variants)};
type Size = ${unionType(sizes)};
const aliases = { ${aliases.map(([n, v]) => `${q(n)}: ${q(v)}`).join(", ")} } as const;
type Alias = keyof typeof aliases;

function resolve(variant: Variant | Alias | undefined, size: Size | "default" | undefined) {
  const v = variant === undefined ? ${q(defaultVariant)} : variant in aliases ? aliases[variant as Alias] : (variant as Variant);
  return { variant: v, size: size === undefined || size === "default" ? ${q(defaultSize)} : size };
}

// Renders as a div; as a link it hovers.
function Item({ className, variant, size, ${p.destructure}...rest }: ${p.props("div")} & { variant?: Variant | Alias | undefined; size?: Size | "default" | undefined }) {
  const axes = resolve(variant, size);
  const props = React.useContext(ItemGroupContext) ? { role: "listitem", ...rest } : rest;
  ${p.body("div", "item", "cn(itemVariants(axes), className)", polyAttrs(base, { variant: "axes.variant", size: "axes.size" }))}
}

// variant="icon" sizes an icon; variant="image" crops a picture to a square.
const itemMediaVariants = cva(${classString(media)}, {
  variants: {
    variant: {
      default: ${mediaVariant("default")},
      icon: ${mediaVariant("icon")},
      image: ${mediaVariant("image")},
    },
  },
  defaultVariants: { variant: "default" },
});

function ItemMedia({ className, variant = "default", ...props }: React.ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>) {
  return <div data-slot="item-media" data-variant={variant} className={cn(itemMediaVariants({ variant }), className)} {...props} />;
}

function ItemContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-content" className={cn(${classString(content)}, className)} {...props} />;
}

function ItemTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-title" className={cn(${classString(title)}, className)} {...props} />;
}

function ItemDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="item-description" className={cn(${classString(description)}, className)} {...props} />;
}

function ItemActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-actions" className={cn(${classString(actions)}, className)} {...props} />;
}

function ItemHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-header" className={cn(${classString(slots["item-header"])}, className)} {...props} />;
}

function ItemFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="item-footer" className={cn(${classString(slots["item-footer"])}, className)} {...props} />;
}

export { Item, ItemMedia, ItemContent, ItemActions, ItemGroup, ItemSeparator, ItemTitle, ItemDescription, ItemHeader, ItemFooter, itemVariants };
export type ItemVariants = VariantProps<typeof itemVariants>;
`;
  };
}

// Button Group's classes, which every framework's shell prints from. Joined edges: every control
// but the last loses its end corners, every one but the first its start corners and start border.
// Outer corners keep the controls' own radius. `deep` looks past a wrapper around a control (React
// Aria wraps a Select).
export function buttonGroupPieces(anatomy: Anatomy, { states = NATIVE_STATES, deep = false }: { states?: StatePrefixes; deep?: boolean } = {}) {
  const opts = { states };
  const child = deep ? "[&_[data-slot]" : "[&>[data-slot]";
  const group: LocalCva = {
    base: ["flex", "w-fit", "min-w-0", "max-w-full", "items-stretch", "*:focus-visible:relative", "*:focus-visible:z-10", "has-[>[data-slot=button-group]]:gap-2", "[&>input]:flex-1"],
    variants: {
      orientation: {
        horizontal: [`${child}:has(~[data-slot])]:rounded-e-none`, `${child}~[data-slot]]:rounded-s-none`, `${child}~[data-slot]]:border-s-0`],
        // Stacked, a pill radius curves each button's whole side into one lozenge: the outer
        // corners are held to the system's large radius (a smaller one is kept as it is). A button
        // alone in the group has nothing to join, and keeps its own shape.
        vertical: [
          "flex-col",
          `${child}:has(~[data-slot])]:rounded-b-none`,
          `${child}~[data-slot]]:rounded-t-none`,
          `${child}~[data-slot]]:border-t-0`,
          `${child}:first-child:not(:last-child)]:rounded-t-[min(var(--button-radius),var(--radius-lg))]`,
          `${child}:last-child:not(:first-child)]:rounded-b-[min(var(--button-radius),var(--radius-lg))]`,
        ],
      },
    },
    compoundVariants: [],
    defaultVariants: { orientation: "horizontal" },
  };
  return {
    slots: {
      "button-group": group,
      "button-group-text": flatClasses(anatomy, "text", opts, ["flex", "items-center", "[&_svg]:pointer-events-none", "[&_svg]:size-4"]),
      "button-group-separator": flatClasses(anatomy, "separator", opts, ["relative", "shrink-0", "self-stretch", "data-[orientation=vertical]:w-(--border-width)", "data-[orientation=horizontal]:h-(--border-width)"]),
    },
  };
}

export function buttonGroupTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots } = buttonGroupPieces(anatomy, { deep: base === "react-aria" });
    const text = slots["button-group-text"];
    const sep = slots["button-group-separator"];
    const { horizontal, vertical } = slots["button-group"].variants["orientation"]!;
    const p = poly(base);
    return `import * as React from "react";
${p.imports}
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonGroupVariants = cva(${classString(slots["button-group"].base)}, {
  variants: {
    orientation: {
      horizontal: ${classString(horizontal!)},
      vertical: ${classString(vertical!)},
    },
  },
  defaultVariants: { orientation: "horizontal" },
});

function ButtonGroup({ className, orientation = "horizontal", ...props }: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return <div role="group" data-slot="button-group" data-orientation={orientation} className={cn(buttonGroupVariants({ orientation }), className)} {...props} />;
}

// Text or an icon in the group, e.g. "https://" before an input.
function ButtonGroupText({ className, ${p.destructure}...props }: ${p.props("div")}) {
  ${p.body("div", "button-group-text", `cn(${classString(text)}, className)`)}
}

function ButtonGroupSeparator({ className, orientation = "vertical", ...props }: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  return <div role="separator" aria-orientation={orientation} data-orientation={orientation} data-slot="button-group-separator" className={cn(${classString(sep)}, className)} {...props} />;
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
`;
  };
}

// The typography components: name, element and anatomy part, in the order they're written.
const TYPOGRAPHY = [
  ["TypographyH1", "h1", "h1"],
  ["TypographyH2", "h2", "h2"],
  ["TypographyH3", "h3", "h3"],
  ["TypographyH4", "h4", "h4"],
  ["TypographyP", "p", "p"],
  ["TypographyLead", "p", "lead"],
  ["TypographyLarge", "div", "large"],
  ["TypographySmall", "small", "small"],
  ["TypographyMuted", "p", "muted"],
  ["TypographyBlockquote", "blockquote", "blockquote"],
  ["TypographyList", "ul", "list"],
  ["TypographyInlineCode", "code", "code"],
] as const;

type TypographyPart = (typeof TYPOGRAPHY)[number][2];

// Typography's classes, which every framework's shell prints from. Every element shares the
// data-slot "typography", so each is keyed "typography:<part>"; elements lists each component's
// name, tag and key.
export function typographyPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  // Text blocks break a word longer than their line (wrap-break-word) rather than running past it.
  const c = (part: string, extra: string[] = [], borderSides: "all" | "bottom" = "all") => flatClasses(anatomy, part, { states, borderSides }, part === "code" ? extra : ["wrap-break-word", ...extra]);
  const slots: Record<`typography:${TypographyPart}`, string[]> = {
    "typography:h1": c("h1", ["scroll-m-20", "text-balance"]),
    "typography:h2": c("h2", ["scroll-m-20", "pt-0", "first:mt-0"], "bottom"),
    "typography:h3": c("h3", ["scroll-m-20"]),
    "typography:h4": c("h4", ["scroll-m-20"]),
    "typography:p": c("p", ["[&:not(:first-child)]:mt-6"]),
    "typography:lead": c("lead"),
    "typography:large": c("large"),
    "typography:small": c("small", ["leading-none"]),
    "typography:muted": c("muted"),
    // The blockquote's rule runs down its start edge.
    "typography:blockquote": c("blockquote", ["mt-6"]).map((x) => (x.startsWith("border-(length:") ? x.replace("border-(length:", "border-s-(length:") : x)),
    "typography:list": c("list", ["my-6", "ms-6", "flex", "list-disc", "flex-col"]),
    "typography:code": c("code", ["relative", "py-[0.2rem]"]),
  };
  return { slots, elements: TYPOGRAPHY.map(([name, tag, part]) => ({ name, tag, slot: `typography:${part}` as const })) };
}

// shadcn's typography recipes as components.
export function renderTypography(anatomy: Anatomy): string {
  const { slots, elements } = typographyPieces(anatomy);
  const el = ({ name, tag, slot }: (typeof elements)[number]) => `function ${name}({ className, ...props }: React.ComponentProps<"${tag}">) {
  return <${tag} data-slot="typography" className={cn(${classString(slots[slot])}, className)} {...props} />;
}`;
  return `import * as React from "react";
import { cn } from "@/lib/utils";

${elements.map(el).join("\n\n")}

export {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyLead,
  TypographyLarge,
  TypographySmall,
  TypographyMuted,
  TypographyBlockquote,
  TypographyList,
  TypographyInlineCode,
};
`;
}
