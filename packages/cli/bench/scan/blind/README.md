# Blind scan fixtures

Three fixture projects written without reading the scanner (`scan.ts`, `tags.ts`, `overrides.ts`),
graded against the "shadcn" preset by the same `grade.ts` as `../fixtures`. Each has a `truth.json`
in the same schema. Every truth line was checked against its file (the line holds the opening `<` of
the named tag), every option axis sums to the component's uses, and a scan that says exactly what
the truth says scores 100 with `grade.ts`.

Only components whose axes are known are used: button, badge, card, input, alert, tabs, dialog,
avatar. Dialog has no axes, so it has no `options` entry.

## Rules applied everywhere

- **Use**: an element of the component's own export: `<Button>`, `<Card>`, `<Dialog>`, and through
  a namespace or alias `<Card.Root>`, `<Btn.Root>`, `<CardRoot>` (from `import { Root as CardRoot }`),
  `<StatusPill>` (from `Badge as StatusPill`), `<NavButton>` (a default import of `button/Button.vue`).
  Counted once per place in the source: one element inside `.map()`, `v-for` or `{#each}` is 1; each
  branch of a ternary, `v-if`/`v-else-if`/`v-else` or `{#if}/{:else if}/{:else}` is 1.
- **Not a use**: parts (`<CardHeader>`, `<Dialog.Content>`, `<Avatar.Fallback>`); wrappers
  (`<PrimaryAction>`, `<AppButton>`, `<SubmitButton>`); look-alike local components (`<ButtonRow>`,
  `<ButtonGroup>`); a same-named component from somewhere else (`Card` from
  `components/marketing/FeatureCard`); `<Button` in comments, JSDoc, JSX `{/* */}` comments,
  HTML `<!-- -->` comments, strings, template literals, `{"<Button>"}`, `{{ "<Button>" }}`; TypeScript
  generics (`useState<Metric[]>`, `Array<Invoice>`, `useRef<HTMLInputElement>`, `<T,>(…) =>`);
  comparisons (`seats<MAX_SEATS`, `a[sort] < b[sort]`, `i < limit`).
- **Files**: files that import the component. A file with only `import type { ButtonProps }` doesn't
  import the component (`react-app/src/types.ts` is not counted); `import { Button, type ButtonProps }`
  does. Several imports from one component's folder (Vue `card/Card.vue`, `card/CardHeader.vue`) count
  as one file.
- **Options**: no prop means the default. A spread (`{...props}`, `v-bind="attrs"`, `{...restProps}`)
  isn't read: the axes it might carry count as the default. Literal: `variant="ghost"`,
  `variant={"ghost"}`, `:size="'sm'"`, `v-bind:variant="'ghost'"`. Dynamic (`~dynamic`): a variable,
  a ternary, a call, an index (`tone[inv.status]`), Svelte's `{variant}` shorthand and Vue 3.4's
  `:variant` same-name shorthand (both mean `variant={variant}`), even when the variable is a const.
- **Override site**: the element's opening line. Its kinds are the union over every class it could
  get (every branch of a ternary, every key of a `clsx`/`cn`/`twMerge` object, every string in a
  `:class`/`class={[…]}` array), plus `style`/`:style`/`sx` properties by what they change
  (`borderRadius` radius, `borderColor` color, `height` size, `boxShadow` shadow, `fontSize`
  typography, `padding`/`py` spacing; `margin*`, `width` placement). A value that can't be read
  (`styles.pill`, `$style.restore`, `surface("danger")`, a computed `fieldClass`,
  `{data.cardClass}` inside a class string) adds `unknown`. The component's own class prop passed
  through (`cn("rounded-full", className)`, `props.class`, `"… {className}"`) adds nothing.
- **Kind of a class**: prefixes (`hover:`, `md:`, `dark:`, `data-[state=active]:`) and `!` (leading or
  trailing) don't change it. Arbitrary values go by their value: `text-[13px]` typography,
  `text-[#1a1a1a]` color, `rounded-[6px]` radius, `p-[13px]` spacing, `h-[38px]` size,
  `min-w-[120px]`/`sm:max-w-[425px]` placement. `ring-2` is border, `border-dashed`/`border-l-4`/
  `divide-y` border, `border-amber-500`/`border-transparent` color, `capitalize`/`uppercase`/
  `tracking-*`/`leading-*`/`text-left`/`font-mono` typography, `scale-105`/`transition-*`/`cursor-*`/
  `opacity-*` effects.
- **Placement only** (a site, but not an override): margins (incl. `-top-1`-style insets), widths,
  `relative`/`absolute`, `self-*`, `shrink-0`, `md:col-span-3`, `overflow-hidden`, and `style`
  margins/width. A site mixing placement with a design class is an override of the design kinds only.
- **Suggestions**: a design class (with its prefixes, exactly as written) on 3+ override sites of one
  component, parts included; placement classes never. A class at one site counts once even if it
  appears in both branches of a ternary.

## react-app

- `src/components/PrimaryAction.tsx`: the wrapper's own `<Button size="lg" className={cn("rounded-full", className)} {...props} />` is a use (size lg, other axes default despite the spread) with a radius override; its JSDoc mentions `<PrimaryAction>` and `<Button variant="solid" size="lg">`. `<PrimaryAction>` in pages is never a button use.
- `src/types.ts`: only `import type { ButtonProps }`, so not a button file.
- `src/App.tsx`: a `<Button>` inside a JSX attribute (`fallback={<Button …>}`), on a line after a multi-line `<Suspense`; `opacity-100 cursor-wait` is effects.
- `Dashboard.tsx`: a multi-line `<Card` in `.map()` with `size="sm"` and `className={cn("gap-2", cond && "ring-2")}` (line = the `<Card` line); a `// TODO: bring back <Badge …>` comment; `useState<"7d" | "30d">`, `useState<Metric[]>`, `useMemo<Metric[]>`, `Array<Invoice>`; a Badge whose variant and intent are ternaries (both `~dynamic`); `aria-label="Pin >"` and `onClick={() => …}` in one tag; `seats<MAX_SEATS && <Button …>` with no spaces, and a template-literal className with `${cond ? "bg-amber-100 text-amber-900" : ""}` (size, spacing, color); placement-only `md:col-span-3` Card, `w-full sm:w-auto` TabsList and `mt-4` Button; `data-[state=active]:` prefixed classes on a TabsTrigger (color, shadow).
- `Billing.tsx`: `<Button intent=\"danger\">` inside a double-quoted string with escaped quotes; a JSDoc `@example` with `<Billing …>` and `<Button …>`; a comparison `a[sort] < b[sort]`; `Badge as StatusPill` with `intent={tone[inv.status]}` (`~dynamic`) and `className={styles.pill}` (unknown); `rounded-[6px] border-l-4 border-amber-500` (radius, border, color); `text-[13px] leading-5` on AlertDescription (typography, a part); a multi-line Button whose `onClick` has a block body and whose `cn("w-full sm:w-auto", { "border-2": pastDue })` is border only; `DialogContent` `sm:max-w-md p-0 overflow-hidden` is spacing only; `$` + `{…}` in JSX text.
- `Team.tsx`: `Input as TextField`; a local `ButtonRow` component; `<T,>(xs: T[]) =>` generic arrow; `ChangeEvent<HTMLInputElement>` inside a prop's arrow; `size={cond ? "lg" : "md"}` on Avatar (`~dynamic`); `bg-[#ff0000]` on AvatarFallback; `twMerge("text-muted-foreground", cond && "cursor-not-allowed opacity-40")`; `clsx("h-10", { "border-destructive": … })` on an Input; Tailwind v4 `rounded-none!` next to placement `w-full`; `ml-auto w-64` Input is placement only.
- `Settings.tsx`: `React.useState<Section>`, `React.useRef<HTMLInputElement>`, `Array<{ id: Section; label: string }>`; `sx={{ py: 1, mt: 2 }}` (spacing), `style={{ marginBottom: 16 }}` (placement only), `style={{ borderColor: brand, height: 44 }}` (color, size), `style={{ boxShadow: "none" }}` (shadow); `className={surface("danger")}` (unknown); `{...inputProps}` spread with `size="lg"`; `variant={error ? "outline" : "solid"}` (`~dynamic`) with only placement classes; a TabsList with five kinds at once.
- `Landing.tsx`: a marketing `Card` with `rounded-3xl p-10` that isn't the design system's; a template literal holding `<Button … className="rounded-none">`; `{/* <Button variant="link"> */}`; `{"<Button>"}` in text.
- **Suggestion**: `button rounded-full` × 3 (PrimaryAction, the Dashboard pin button, Landing). Badge's `rounded-full` is another component.
- **Near misses** (2 sites each): `button text-muted-foreground`, `tabs rounded-none` (Button's `rounded-none!` is a different class and component), `card pt-6`, `card gap-4`, `dialog px-6`. `w-full` is on two button override sites and one placement-only site: placement, never a suggestion.
- **Edited**: `tesserai/manifest.json` lists six files with hashes of their installed content. `badge.tsx` (base class changed) and `card.tsx` (`shadow-sm` to `shadow-none`) were edited after hashing; `button.tsx`, `input.tsx`, `tabs.tsx` match; `tooltip.tsx` was deleted (not edited). `avatar.tsx`, `dialog.tsx`, `alert.tsx` exist but aren't in the manifest (not edited).

## vue-app

- `src/components/AppButton.vue`: wrapper, `<Button size="lg" :class="cn('rounded-full', props.class)">` is a use with radius; `<AppButton class="mr-2">` elsewhere is not. A comment says `<Button>`.
- `src/components/ButtonGroup.vue`: a local component whose name starts with `Button`, used in `Projects.vue`; not a use.
- `src/components/ProjectPicker.vue`: `<script setup generic="T extends { id: string; name: string }">`; a multi-line Button with `v-if="i < limit"` and `:intent` ternary (`~dynamic`), `class="w-full"` (placement); a Badge with `ml-auto` (placement).
- `src/App.vue`: `import NavButton from "@/components/ui/button/Button.vue"` (a default import, renamed); a multi-line `v-for` NavButton (one use) with `h-8 px-2 text-left`; `:style="{ fontSize: '11px' }"` on AvatarFallback (typography); `v-if`/`v-else` Avatars (two uses), one with `:size="'sm'"` (literal); `{{ "<Button>" }}` in a mustache.
- `src/views/Projects.vue`: default imports of `card/Card.vue` (the use) and `card/CardHeader.vue`, `CardTitle.vue`, `CardContent.vue` (parts); `ref<Project[]>`, `computed<Array<Project>>`; a script string with `<Badge>` and `<Button>`; an HTML comment with a Button; `v-bind:variant="'ghost'"` (literal) with `:class="{ 'bg-accent': … }"`; a multi-line `v-for` Card with `:size` ternary and a `:class` array holding a string and an object (effects, shadow); `{{ p.seats<MAX_SEATS ? … }}` (with a template literal inside); `v-if`/`v-else-if`/`v-else` Buttons: placement-only `w-full`, `:class="$style.restore"` (unknown, CSS module), and `style="border-radius: 0; margin-left: auto"` (radius).
- `src/views/Settings.vue`: `Button as UiButton`; `import type { AlertVariants }` in a file that also imports Alert; `<Tabs :variant>` same-name shorthand (`~dynamic`) with placement-only classes; `:class="[cond && 'bg-transparent', 'w-full']"` on TabsList (color); `v-bind:variant="'soft'"` with a ternary `:intent`; `:class="fieldClass"` (unknown); `:style="{ borderColor: accent, width: '100%' }"` (color only); `v-bind="buttonAttrs"` with `min-w-[120px] h-[38px]` (size); `rounded-[6px] border-2 p-[13px]`; `!font-bold` (leading `!`); `DialogContent` with placement class and `style="padding: 32px"` (spacing).
- `src/views/Billing.vue`: `Record<Invoice["status"], …>` generic; `<tr v-for>` rows holding a Badge with `:intent="intentFor[inv.status]"`; `@click="() => { upgrading = !upgrading }"`.
- **Suggestion**: `button tracking-wide` × 3, written three ways: static `class`, a `:class` array, a `:class` object key.
- **Near miss**: `button hover:bg-red-800` × 2; the third site has `bg-red-800` without the prefix, a different class.

## svelte-app

- `src/lib/components/SubmitButton.svelte`: wrapper, `<Button … class="uppercase min-w-24 {className}" {...restProps}>`: a use, typography only (`{className}` is its own prop passed through). `<SubmitButton>` is not a use.
- `src/lib/components/MemberList.svelte`: `<script lang="ts" generics="T extends …">`, `Snippet<[T]>`; `<Avatar.Root size="sm" class="size-7">` (size); `{#each}…{:else}`; a Badge with a call for `intent` (`~dynamic`).
- `src/routes/+layout.svelte`: `import * as Btn from …/button` so `<Btn.Root>` is a button use (placement-only `relative`); `class:bg-muted={…}` on a plain `<a>`, not a site (Svelte rejects `class:` on components, so a directive can only sit on elements; if one did sit on a component it would be read as that class being applied); a Badge with `absolute -top-1 -right-1 h-4 min-w-4 px-1` (size, spacing); `<svelte:head>`.
- `src/routes/+page.svelte`: `$state<string | null>`, `$state<"monthly" | "yearly">`, `a.price < b.price`; a script string with a Button; `variant={billing === "monthly" ? "solid" : "ghost"}` (`~dynamic`) and `variant={"ghost"}` (literal); a class ternary with `font-semibold` in both branches (one class at that site); an HTML comment holding `<Card.Root>`; a multi-line `{#each}` `<Card.Root>` with a Svelte 5 class array (effects, color, border); an inline `{#if}<Badge …>{/if}`; `${discount(plan)}` and `{#if i < 1}` in markup; `{#if}/{:else if plan.price < …}/{:else}` Buttons: `<Button {variant}>` shorthand (`~dynamic`, placement only), `border-dashed`, and `style="border-radius: 9999px"`; `{"<Button>"}` in text.
- `src/routes/settings/+page.svelte`: namespaces for tabs, alert, dialog; `import { Root as CardRoot, Content as CardContent }` so `<CardRoot>` is the card use; `bind:value`, `bind:open`; Tailwind v4 `data-[state=active]:bg-white!`; `style="border-color: {accent}; margin-bottom: 1rem"` (color); `class="mt-4 {data.cardClass}"` (unknown); `size={fieldSize}` (`~dynamic`); a Svelte 5 class object with a placement key (`"w-full": true`) and a color key; a Button inside `{#snippet}` (one use); `<Button {...props} …>` inside a `child` snippet; `rounded-[4px]` on `Dialog.Content`; `h-[42px] px-[18px]`.
- `src/routes/billing/+page.svelte`: Svelte 4 syntax (`export let`, `$:`, `on:click`), imports without `/index.js`; `dark:bg-amber-950`; `class:opacity-50` on a `<tr>` (not a site); `href="/billing/{inv.id}.pdf"`; `disabled={applying || coupon.length < 4}`; `overflow-hidden` Card (placement only); `style="width: 100%; margin-top: 1.5rem"` (placement only).
- **Suggestion**: `button font-semibold` × 3 (a ternary's both branches, a static class, a static class in another file). `alert` has `font-semibold` too, on another component.
- **Near miss**: `uppercase` is on three override sites, but one each of button, badge and input: no suggestion.
