import type { Anatomy } from "@tesserai/core";
import { questionnairePieces } from "../chat";
import { QUESTIONNAIRE_ENGINE } from "../chat-engines";
import { q } from "../codegen";
import type { GeneratedFile } from "../render";
import { elementPart } from "./elements";
import { indexFile, indexParts, lucideImport, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";

// The questionnaire, as shadcn-svelte ports it: no Svelte package has one, so its behaviour is a
// module in the folder (engine.ts, the same one the Vue folder gets), set as context by the root and
// each question (context.svelte.ts). The parts register their elements once mounted (as
// @shadcn/react's do in layout effects), write the attributes @shadcn/react's write, and follow
// Svelte's idioms: bind:item on the root, bind:checked on a choice, bind:value on a typed answer,
// onStatusChange on a question.

export function questionnaireFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, buttons } = questionnairePieces(anatomy);
  const s = (slot: keyof typeof slots) => quoted(slots[slot]);
  const context: GeneratedFile = {
    path: "questionnaire/context.svelte.ts",
    source: `import { getContext, hasContext, setContext } from "svelte";
import type { QuestionnaireEngine, QuestionnaireItemEngine } from "./engine.js";

const QUESTIONNAIRE = Symbol("QUESTIONNAIRE");
const QUESTIONNAIRE_ITEM = Symbol("QUESTIONNAIRE_ITEM");

// Counts an engine's changes: track() reads it, so a $derived around it re-reads the engine.
class Changes {
  count = $state(0);
}
const changes = new WeakMap<QuestionnaireEngine, Changes>();

export function setQuestionnaire(engine: QuestionnaireEngine) {
  const counter = new Changes();
  engine.change = () => {
    counter.count += 1;
  };
  changes.set(engine, counter);
  return setContext(QUESTIONNAIRE, engine);
}

export function getQuestionnaire(name = "This component"): QuestionnaireEngine {
  if (!hasContext(QUESTIONNAIRE)) throw new Error(\`\${name} must be used within a <Questionnaire.Root>\`);
  return getContext<QuestionnaireEngine>(QUESTIONNAIRE);
}

export function setQuestionnaireItem(item: QuestionnaireItemEngine) {
  return setContext(QUESTIONNAIRE_ITEM, item);
}

export function getQuestionnaireItem(name = "This component"): QuestionnaireItemEngine {
  if (!hasContext(QUESTIONNAIRE_ITEM)) throw new Error(\`\${name} must be used within a <Questionnaire.Item>\`);
  return getContext<QuestionnaireItemEngine>(QUESTIONNAIRE_ITEM);
}

// A value read from the engine, re-read (in a $derived) whenever it changes.
export function track<T>(engine: QuestionnaireEngine, read: () => T): T {
  void changes.get(engine)?.count;
  return read();
}
`,
  };
  const root = svelteFile("questionnaire/questionnaire.svelte", {
    script: `import type { HTMLFormAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { dataAttributes, QuestionnaireEngine, type QuestionnaireItemDefinition, type QuestionnaireShortcutMode } from "./engine.js";
import { setQuestionnaire, track } from "./context.svelte.js";

const classes = ${s("questionnaire")};

// items lists the questions (and their choices) in order; bind:item is the one shown;
// shortcuts="letters" or "numbers" gives every choice a key; noValidate={false} runs the browser's
// own checks too. The form submits (onsubmit) once every question is answered as it must be.
let {
  ref = $bindable(null),
  class: className,
  items,
  defaultItem,
  item = $bindable(),
  shortcuts,
  noValidate = true,
  onItemChange,
  onsubmit,
  onreset,
  onkeydown,
  children,
  ...restProps
}: WithElementRef<Omit<HTMLFormAttributes, "novalidate">, HTMLFormElement> & {
  items?: readonly QuestionnaireItemDefinition[];
  defaultItem?: string;
  item?: string;
  shortcuts?: QuestionnaireShortcutMode;
  noValidate?: boolean;
  onItemChange?: (item: string) => void;
} = $props();

const engine = new QuestionnaireEngine(() => ({ items, defaultItem, item, shortcuts, noValidate }));
engine.itemChange = (next) => {
  item = next;
  onItemChange?.(next);
};
setQuestionnaire(engine);
const data = $derived(track(engine, () => ({ ...dataAttributes(engine.state), "data-shortcuts": shortcuts })));
$effect(() => {
  engine.form = ref;
});

const handleSubmit: HTMLFormAttributes["onsubmit"] = (event) => {
  if (engine.submit(event)) onsubmit?.(event);
};
const handleReset: HTMLFormAttributes["onreset"] = (event) => {
  onreset?.(event);
  if (!event.defaultPrevented) engine.reset();
};
const handleKeyDown: HTMLFormAttributes["onkeydown"] = (event) => {
  onkeydown?.(event);
  engine.keydown(event);
};`,
    markup: `<form bind:this={ref} data-slot="questionnaire" {...data} novalidate={noValidate} class={cn(classes, className)} onsubmit={handleSubmit} onreset={handleReset} onkeydown={handleKeyDown} {...restProps}>
  {@render children?.()}
</form>`,
  });
  const progress = svelteFile("questionnaire/questionnaire-progress.svelte", {
    script: `import type { HTMLAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { dataAttributes } from "./engine.js";
import { getQuestionnaire, track } from "./context.svelte.js";

const classes = ${s("questionnaire-progress")};

// "Question 2 of 5", unless you give it words of your own.
let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

const engine = getQuestionnaire("Questionnaire.Progress");
const state = $derived(track(engine, () => engine.state));
const text = $derived(state.total ? "Question " + state.current + " of " + state.total : undefined);`,
    markup: `<div
  bind:this={ref}
  data-slot="questionnaire-progress"
  role="progressbar"
  aria-label="Questionnaire progress"
  aria-live="polite"
  aria-valuemax={state.total || undefined}
  aria-valuemin={state.total ? 1 : undefined}
  aria-valuenow={state.total ? state.current : undefined}
  aria-valuetext={text}
  {...dataAttributes(state)}
  class={cn(classes, className)}
  {...restProps}
>
  {#if children}{@render children()}{:else}{text}{/if}
</div>`,
  });
  const item = svelteFile("questionnaire/questionnaire-item.svelte", {
    script: `import type { HTMLFieldsetAttributes } from "svelte/elements";
import { onMount } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { QuestionnaireItemEngine, type QuestionnaireItemStatus } from "./engine.js";
import { getQuestionnaire, setQuestionnaireItem, track } from "./context.svelte.js";

const classes = ${s("questionnaire-item")};

// One question, a fieldset submitted under its name. required keeps it from being skipped;
// multiple makes its choices checkboxes; invalid marks it wrong from outside (after your own
// validation, say). Your aria-describedby and aria-keyshortcuts join the question's own.
let {
  ref = $bindable(null),
  class: className,
  name,
  required = false,
  multiple = false,
  disabled = false,
  invalid = false,
  onStatusChange,
  "aria-describedby": describedBy,
  "aria-keyshortcuts": keyShortcuts,
  children,
  ...restProps
}: WithElementRef<Omit<HTMLFieldsetAttributes, "name" | "disabled">, HTMLFieldSetElement> & {
  name: string;
  required?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  onStatusChange?: (status: QuestionnaireItemStatus) => void;
} = $props();

const engine = getQuestionnaire("Questionnaire.Item");
const item = new QuestionnaireItemEngine(engine, () => ({ name, required, multiple, disabled, invalid }));
item.statusChange = (status) => onStatusChange?.(status);
setQuestionnaireItem(item);
const attributes = $derived(track(engine, () => item.attributes(describedBy ?? undefined, keyShortcuts ?? undefined)));
onMount(() => {
  item.element = ref;
  return engine.registerItem(item);
});`,
    markup: `<fieldset bind:this={ref} data-slot="questionnaire-item" {...restProps} {...attributes} class={cn(classes, className)}>
  {@render children?.()}
</fieldset>`,
  });
  const description = svelteFile("questionnaire/questionnaire-description.svelte", {
    script: `import type { HTMLAttributes } from "svelte/elements";
import { onMount } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getQuestionnaireItem } from "./context.svelte.js";

const classes = ${s("questionnaire-description")};

// Describes the question to assistive technology as well as on screen.
let { ref = $bindable(null), class: className, id: ownId, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLParagraphElement>> = $props();

const item = getQuestionnaireItem("Questionnaire.Description");
const generated = $props.id();
const id = $derived(ownId ?? generated);
onMount(() => item.registerDescription(id));`,
    markup: `<p bind:this={ref} {id} data-slot="questionnaire-description" class={cn(classes, className)} {...restProps}>
  {@render children?.()}
</p>`,
  });
  const choices = svelteFile("questionnaire/questionnaire-choices.svelte", {
    script: `import type { HTMLAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getQuestionnaire, getQuestionnaireItem } from "./context.svelte.js";

const classes = ${s("questionnaire-choices")};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

getQuestionnaireItem("Questionnaire.Choices");
const engine = getQuestionnaire("Questionnaire.Choices");`,
    markup: `<div bind:this={ref} data-slot="questionnaire-choices" data-shortcuts={engine.shortcuts ?? undefined} class={cn(classes, className)} {...restProps}>
  {@render children?.()}
</div>`,
  });
  const choice = svelteFile("questionnaire/questionnaire-choice.svelte", {
    script: `import type { HTMLLabelAttributes } from "svelte/elements";
import { onMount, untrack } from "svelte";
${lucideImport("CheckIcon")}
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { choiceState } from "./engine.js";
import { getQuestionnaireItem, track } from "./context.svelte.js";

const classes = ${s("questionnaire-choice")};
const inputClasses = ${s("questionnaire-choice-input")};
const indicatorClasses = ${s("questionnaire-choice-indicator")};
const dotClasses = ${s("questionnaire-choice-indicator-dot")};
const checkClasses = ${s("questionnaire-choice-indicator-check")};
const labelClasses = ${s("questionnaire-choice-label")};
const shortcutClasses = ${s("questionnaire-choice-shortcut")};

// A radio or checkbox row, depending on the question; a shortcut key shows when set. value is what
// it submits; bind:checked controls it, defaultChecked starts it checked.
let {
  ref = $bindable(null),
  class: className,
  value,
  checked = $bindable(),
  defaultChecked = false,
  disabled = false,
  onchange,
  children,
  ...restProps
}: WithElementRef<HTMLLabelAttributes> & {
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onchange?: (event: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
} = $props();

const item = getQuestionnaireItem("Questionnaire.Choice");
const id = $props.id();
const choice = $derived(track(item.root, () => choiceState(item, id, { value, checked, disabled })));
// Primitives, so the effects below run only when these change.
const answerDisabled = $derived(choice.state.disabled);
const resetVersion = $derived(track(item.root, () => item.resetVersion));
let input = $state<HTMLInputElement | null>(null);

onMount(() => item.registerSelection(id, untrack(() => defaultChecked)));
// As an answer of the question, registered again when it's enabled or disabled.
$effect(() => {
  const element = input;
  const answer = { id, type: "choice" as const, value, disabled: answerDisabled, ownDisabled: disabled };
  if (element === null) return;
  return untrack(() => item.registerAnswer({ ...answer, element }));
});
$effect(() => {
  const selected = defaultChecked;
  untrack(() => item.setDefault(id, selected));
});
// A controlled choice's value, and the form's reset, reach the question.
$effect(() => {
  const selected = checked;
  void resetVersion;
  if (selected !== undefined) untrack(() => item.syncControlled(id, selected));
});
// What a native form reset puts back.
$effect(() => {
  if (input !== null) input.defaultChecked = checked ?? defaultChecked;
});

function handleChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
  onchange?.(event);
  if (event.defaultPrevented) return;
  const next = event.currentTarget.checked;
  if (checked === undefined) {
    item.selectFromInteraction(id, next);
    return;
  }
  checked = next;
  // Choosing again what a skipped question had.
  if (item.status === "skipped") item.selectFromInteraction(id, next);
}`,
    markup: `<label bind:this={ref} data-slot="questionnaire-choice" {...restProps} {...choice.data} class={cn(classes, className)}>
  <input bind:this={input} data-slot="questionnaire-choice-input" {...choice.data} {...choice.input} class={inputClasses} onchange={handleChange} />
  <span aria-hidden="true" data-slot="questionnaire-choice-indicator" class={indicatorClasses}>
    <span data-slot="questionnaire-choice-indicator-dot" class={dotClasses}></span>
    <CheckIcon data-slot="questionnaire-choice-indicator-check" class={checkClasses} />
  </span>
  <span data-slot="questionnaire-choice-label" class={labelClasses}>
    {@render children?.()}
  </span>
  <span data-slot="questionnaire-choice-shortcut" aria-hidden="true" data-shortcut={choice.state.shortcut ?? undefined} hidden={choice.state.shortcut === null} class={shortcutClasses}>{choice.state.shortcut}</span>
</label>`,
  });
  const input = svelteFile("questionnaire/questionnaire-input.svelte", {
    script: `import type { HTMLInputAttributes } from "svelte/elements";
import { onMount, untrack } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { hasValue, inputState, type QuestionnaireInputType } from "./engine.js";
import { getQuestionnaireItem, track } from "./context.svelte.js";

const classes = ${s("questionnaire-input")};
const wrapperClasses = ${s("questionnaire-input-wrapper")};

// A typed answer: bind:value controls it, defaultValue starts it. It joins the form (and has a name)
// once there's something in it, so an empty one is neither submitted nor checked.
let {
  ref = $bindable(null),
  class: className,
  value = $bindable(),
  defaultValue,
  disabled = false,
  type = "text",
  oninput,
  ...restProps
}: WithElementRef<Omit<HTMLInputAttributes, "type" | "value" | "defaultValue" | "form" | "name" | "disabled">, HTMLInputElement> & {
  value?: string | number;
  defaultValue?: string | number;
  disabled?: boolean;
  type?: QuestionnaireInputType;
} = $props();

const item = getQuestionnaireItem("Questionnaire.Input");
const id = $props.id();
// An uncontrolled answer's text, and whether it has any.
let text = $state(untrack(() => String(defaultValue ?? "")));
let filled = $state(untrack(() => hasValue(defaultValue)));
const answer = $derived(track(item.root, () => inputState(item, id, { value, disabled, type }, filled)));
const answerDisabled = $derived(answer.input.disabled);
const resetVersion = $derived(track(item.root, () => item.resetVersion));

onMount(() => item.registerSelection(id, untrack(() => hasValue(defaultValue))));
$effect(() => {
  const selected = hasValue(defaultValue);
  untrack(() => item.setDefault(id, selected));
});
$effect(() => {
  const element = ref;
  const answer = { id, type: "input" as const, value: "", disabled: answerDisabled, ownDisabled: disabled };
  if (element === null) return;
  return untrack(() => item.registerAnswer({ ...answer, element }));
});
// A controlled value reaches the question.
$effect(() => {
  const current = value;
  if (current !== undefined) untrack(() => item.syncControlled(id, hasValue(current)));
});
// The form's reset puts an uncontrolled answer's default back.
let seenReset = 0;
$effect(() => {
  if (resetVersion === seenReset) return;
  seenReset = resetVersion;
  untrack(() => {
    if (value !== undefined) return;
    text = String(defaultValue ?? "");
    filled = hasValue(defaultValue);
  });
});

const handleInput: HTMLInputAttributes["oninput"] = (event) => {
  oninput?.(event);
  const next = event.currentTarget.value;
  if (value !== undefined) {
    value = next;
    return;
  }
  text = next;
  filled = next.trim().length > 0;
  item.selectFromInteraction(id, filled);
};`,
    markup: `<div data-slot="questionnaire-input-wrapper" class={wrapperClasses}>
  <input bind:this={ref} data-slot="questionnaire-input" {...restProps} {...answer.data} {...answer.input} value={value ?? text} class={cn(classes, className)} oninput={handleInput} />
</div>`,
  });
  const error = svelteFile("questionnaire/questionnaire-error.svelte", {
    script: `import type { HTMLAttributes } from "svelte/elements";
import { onMount } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getQuestionnaireItem, track } from "./context.svelte.js";

const classes = ${s("questionnaire-error")};

// Shown when the question can't be left as it is; says so in words of its own unless you give some.
let { ref = $bindable(null), class: className, id: ownId, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLParagraphElement>> = $props();

const item = getQuestionnaireItem("Questionnaire.Error");
const generated = $props.id();
const id = $derived(ownId ?? generated);
const invalid = $derived(track(item.root, () => item.invalid));
onMount(() => item.registerError(id));`,
    markup: `<p bind:this={ref} {id} data-slot="questionnaire-error" data-invalid={invalid ? "" : undefined} hidden={!invalid} role={invalid ? "alert" : undefined} class={cn(classes, className)} {...restProps}>
  {#if children}{@render children()}{:else}{item.required ? "Choose an answer to continue." : "Choose an answer or skip this question."}{/if}
</p>`,
  });
  const title = svelteFile("questionnaire/questionnaire-title.svelte", {
    script: `import type { HTMLAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getQuestionnaireItem } from "./context.svelte.js";

const classes = ${s("questionnaire-title")};

// The question, as the fieldset's legend.
let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLLegendElement>> = $props();

getQuestionnaireItem("Questionnaire.Title");`,
    markup: `<legend bind:this={ref} data-slot="questionnaire-title" class={cn(classes, className)} {...restProps}>
  {@render children?.()}
</legend>`,
  });
  // Previous, Skip, Next and Submit: the system's Button look, shown only when they apply.
  const NAV: Record<string, { visible: string; shortcut: string; act?: string; type: string }> = {
    Previous: { visible: "engine.total > 1 && !engine.first", shortcut: "null", act: "engine.goPrevious()", type: "button" },
    Skip: { visible: "engine.activeRequired === false", shortcut: "null", act: "engine.skipCurrent()", type: "button" },
    Next: { visible: "engine.total > 1 && !engine.last", shortcut: '"Enter"', act: "engine.goNext()", type: "button" },
    Submit: { visible: "engine.total > 0 && engine.last", shortcut: '"Enter"', type: "submit" },
  };
  const nav = buttons.map(({ part, variant, label }) => {
    const n = NAV[part]!;
    const slot = `questionnaire-${part.toLowerCase()}` as keyof typeof slots;
    return svelteFile(`questionnaire/${slot}.svelte`, {
      script: `import type { HTMLButtonAttributes } from "svelte/elements";
${uiImport("button", ["buttonVariants", "type ButtonVariantProps"])}
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { navigationState } from "./engine.js";
import { getQuestionnaire, track } from "./context.svelte.js";

const classes = ${s(slot)};

let {
  ref = $bindable(null),
  class: className,
  variant = ${q(variant)},
  size = "default",
  disabled = false,
  type = ${q(n.type)},
  tabindex,
  onclick,
  children,
  ...restProps
}: WithElementRef<HTMLButtonAttributes> & { variant?: ButtonVariantProps["variant"]; size?: ButtonVariantProps["size"] } = $props();

const engine = getQuestionnaire("Questionnaire.${part}");
const attributes = $derived(track(engine, () => navigationState(${n.visible}, disabled ?? false, engine.activeStatus, ${n.shortcut}, tabindex ?? undefined)));
${
  n.act === undefined
    ? ""
    : `
// Your onclick runs first, and can stop it (preventDefault).
const handleClick: HTMLButtonAttributes["onclick"] = (event) => {
  onclick?.(event);
  if (!event.defaultPrevented) ${n.act};
};`
}`,
      markup: `<button bind:this={ref} data-slot="${slot}" {...restProps} {...attributes} {type} class={cn(buttonVariants({ variant, size }), classes, className)} onclick={${n.act === undefined ? "onclick" : "handleClick"}}>
  {#if children}{@render children()}{:else}<span>${label}</span>{/if}
</button>`,
    });
  });
  return [
    { path: "questionnaire/engine.ts", source: QUESTIONNAIRE_ENGINE },
    context,
    root,
    progress,
    item,
    title,
    description,
    choices,
    choice,
    elementPart("questionnaire/questionnaire-choice-description.svelte", "span", "questionnaire-choice-description", s("questionnaire-choice-description")),
    input,
    error,
    elementPart("questionnaire/questionnaire-actions.svelte", "div", "questionnaire-actions", s("questionnaire-actions")),
    ...nav,
    indexFile(
      "questionnaire/index.ts",
      indexParts([
        ["questionnaire.svelte", "Root", "Questionnaire"],
        ["questionnaire-progress.svelte", "Progress", "QuestionnaireProgress"],
        ["questionnaire-item.svelte", "Item", "QuestionnaireItem"],
        ["questionnaire-title.svelte", "Title", "QuestionnaireTitle"],
        ["questionnaire-description.svelte", "Description", "QuestionnaireDescription"],
        ["questionnaire-choices.svelte", "Choices", "QuestionnaireChoices"],
        ["questionnaire-choice.svelte", "Choice", "QuestionnaireChoice"],
        ["questionnaire-choice-description.svelte", "ChoiceDescription", "QuestionnaireChoiceDescription"],
        ["questionnaire-input.svelte", "Input", "QuestionnaireInput"],
        ["questionnaire-error.svelte", "Error", "QuestionnaireError"],
        ["questionnaire-actions.svelte", "Actions", "QuestionnaireActions"],
        ["questionnaire-previous.svelte", "Previous", "QuestionnairePrevious"],
        ["questionnaire-skip.svelte", "Skip", "QuestionnaireSkip"],
        ["questionnaire-next.svelte", "Next", "QuestionnaireNext"],
        ["questionnaire-submit.svelte", "Submit", "QuestionnaireSubmit"],
      ]),
      [
        {
          file: "engine.js",
          names: ["type QuestionnaireChoiceDefinition", "type QuestionnaireInputType", "type QuestionnaireItemDefinition", "type QuestionnaireItemStatus", "type QuestionnaireShortcutMode"],
        },
      ],
    ),
  ];
}
