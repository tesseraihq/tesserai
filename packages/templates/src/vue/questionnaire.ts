import type { Anatomy } from "@tesserai/core";
import { questionnairePieces } from "../chat";
import { QUESTIONNAIRE_ENGINE } from "../chat-engines";
import { q } from "../codegen";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, plain, staticClasses } from "./sfc";

// The questionnaire, as shadcn-vue ports it: no Vue package has one, so its behaviour is a module
// in the folder (engine.ts, the same one the Svelte folder gets), provided to the parts by the
// root and each question. The parts register their elements once mounted (as @shadcn/react's do in
// layout effects), write the attributes @shadcn/react's write, and follow Vue's idioms: v-model:item
// on the root, v-model:checked on a choice, v-model on a typed answer, @update:status on a question.

export function renderQuestionnaire(anatomy: Anatomy): GeneratedFile[] {
  const { slots, buttons } = questionnairePieces(anatomy);
  const f = folder("questionnaire");
  const c = (slot: keyof typeof slots) => classList(slots[slot]);
  const context: GeneratedFile = {
    path: "questionnaire/useQuestionnaire.ts",
    source: `import type { InjectionKey, Ref } from "vue";
import type { QuestionnaireEngine, QuestionnaireItemEngine } from "./engine";
import { computed, inject, provide, shallowRef } from "vue";

type QuestionnaireContext = { engine: QuestionnaireEngine; version: Ref<number> };
const ROOT: InjectionKey<QuestionnaireContext> = Symbol("Questionnaire");
const ITEM: InjectionKey<QuestionnaireItemEngine> = Symbol("QuestionnaireItem");
const versions = new WeakMap<QuestionnaireEngine, Ref<number>>();

// The root's engine, for its parts; version counts its changes, so a computed that reads it
// re-reads the engine.
export function provideQuestionnaire(engine: QuestionnaireEngine) {
  const version = shallowRef(0);
  engine.change = () => {
    version.value += 1;
  };
  versions.set(engine, version);
  provide(ROOT, { engine, version });
}

export function injectQuestionnaire(part: string): QuestionnaireContext {
  const context = inject(ROOT, null);
  if (context === null) throw new Error(part + " must be used within a <Questionnaire />");
  return context;
}

export function provideQuestionnaireItem(item: QuestionnaireItemEngine) {
  provide(ITEM, item);
}

export function injectQuestionnaireItem(part: string): QuestionnaireItemEngine {
  const item = inject(ITEM, null);
  if (item === null) throw new Error(part + " must be used within a <QuestionnaireItem />");
  return item;
}

// A value read from the engine, kept current.
export function useQuestionnaireState<T>(engine: QuestionnaireEngine, read: () => T) {
  const version = versions.get(engine);
  return computed(() => {
    void version?.value;
    return read();
  });
}
`,
  };
  const root = f.file(
    "Questionnaire",
    `import type { HTMLAttributes } from "vue";
import type { QuestionnaireItemDefinition, QuestionnaireShortcutMode } from "./engine";
import { cn } from "@/lib/utils";
import { dataAttributes, QuestionnaireEngine } from "./engine";
import { provideQuestionnaire, useQuestionnaireState } from "./useQuestionnaire";

// items lists the questions (and their choices) in order; v-model:item is the one shown;
// shortcuts="letters" or "numbers" gives every choice a key; :no-validate="false" runs the
// browser's own checks too. The form submits once every question is answered as it must be.
const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    items?: readonly QuestionnaireItemDefinition[];
    defaultItem?: string;
    item?: string;
    shortcuts?: QuestionnaireShortcutMode;
    noValidate?: boolean;
  }>(),
  { items: undefined, defaultItem: undefined, item: undefined, shortcuts: undefined, noValidate: true },
);
const emits = defineEmits<{ "update:item": [item: string]; submit: [event: SubmitEvent]; reset: [event: Event] }>();

const engine = new QuestionnaireEngine(() => props);
engine.itemChange = (item) => emits("update:item", item);
provideQuestionnaire(engine);
const data = useQuestionnaireState(engine, () => ({ ...dataAttributes(engine.state), "data-shortcuts": props.shortcuts }));
const setForm = (element: unknown) => {
  engine.form = element instanceof HTMLFormElement ? element : null;
};

function onSubmit(event: SubmitEvent) {
  if (engine.submit(event)) emits("submit", event);
}
function onReset(event: Event) {
  emits("reset", event);
  if (!event.defaultPrevented) engine.reset();
}`,
    `<form :ref="setForm" data-slot="questionnaire" v-bind="data" :novalidate="noValidate" :class="cn(${c("questionnaire")}, props.class)" @submit="onSubmit" @reset="onReset" @keydown="engine.keydown">
  <slot />
</form>`,
  );
  const progress = f.file(
    "QuestionnaireProgress",
    `import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { dataAttributes } from "./engine";
import { injectQuestionnaire, useQuestionnaireState } from "./useQuestionnaire";

// "Question 2 of 5", unless you give it words of your own.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const { engine } = injectQuestionnaire("QuestionnaireProgress");
const state = useQuestionnaireState(engine, () => engine.state);
const text = computed(() => (state.value.total ? "Question " + state.value.current + " of " + state.value.total : undefined));`,
    `<div
  data-slot="questionnaire-progress"
  role="progressbar"
  aria-label="Questionnaire progress"
  aria-live="polite"
  :aria-valuemax="state.total || undefined"
  :aria-valuemin="state.total ? 1 : undefined"
  :aria-valuenow="state.total ? state.current : undefined"
  :aria-valuetext="text"
  v-bind="dataAttributes(state)"
  :class="cn(${c("questionnaire-progress")}, props.class)"
>
  <slot>{{ text }}</slot>
</div>`,
  );
  const item = f.file(
    "QuestionnaireItem",
    `import type { HTMLAttributes } from "vue";
import type { QuestionnaireItemStatus } from "./engine";
import { onBeforeUnmount, onMounted, useAttrs } from "vue";
import { cn } from "@/lib/utils";
import { QuestionnaireItemEngine } from "./engine";
import { injectQuestionnaire, provideQuestionnaireItem, useQuestionnaireState } from "./useQuestionnaire";

defineOptions({ inheritAttrs: false });

// One question, a fieldset submitted under its name. required keeps it from being skipped;
// multiple makes its choices checkboxes; invalid marks it wrong from outside (after your own
// validation, say).
const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; name: string; required?: boolean; multiple?: boolean; disabled?: boolean; invalid?: boolean }>(), {
  required: false,
  multiple: false,
  disabled: false,
  invalid: false,
});
const emits = defineEmits<{ "update:status": [status: QuestionnaireItemStatus] }>();
const attrs = useAttrs();

const { engine } = injectQuestionnaire("QuestionnaireItem");
const item = new QuestionnaireItemEngine(engine, () => props);
item.statusChange = (status) => emits("update:status", status);
provideQuestionnaireItem(item);
// Your aria-describedby and aria-keyshortcuts join the question's own.
const attributes = useQuestionnaireState(engine, () => item.attributes(attrs["aria-describedby"] as string | undefined, attrs["aria-keyshortcuts"] as string | undefined));

const setItem = (element: unknown) => {
  item.element = element instanceof HTMLFieldSetElement ? element : null;
};
let unregister = () => {};
onMounted(() => {
  unregister = engine.registerItem(item);
});
onBeforeUnmount(() => unregister());`,
    `<fieldset :ref="setItem" data-slot="questionnaire-item" v-bind="{ ...$attrs, ...attributes }" :class="cn(${c("questionnaire-item")}, props.class)">
  <slot />
</fieldset>`,
  );
  const description = f.file(
    "QuestionnaireDescription",
    `import type { HTMLAttributes } from "vue";
import { onBeforeUnmount, onMounted, useId } from "vue";
import { cn } from "@/lib/utils";
import { injectQuestionnaireItem } from "./useQuestionnaire";

// Describes the question to assistive technology as well as on screen.
const props = defineProps<{ class?: HTMLAttributes["class"]; id?: string }>();
const item = injectQuestionnaireItem("QuestionnaireDescription");
const id = props.id ?? useId();
let unregister = () => {};
onMounted(() => {
  unregister = item.registerDescription(id);
});
onBeforeUnmount(() => unregister());`,
    `<p :id="id" data-slot="questionnaire-description" :class="cn(${c("questionnaire-description")}, props.class)">
  <slot />
</p>`,
  );
  const choices = f.file(
    "QuestionnaireChoices",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { injectQuestionnaire, injectQuestionnaireItem } from "./useQuestionnaire";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
injectQuestionnaireItem("QuestionnaireChoices");
const { engine } = injectQuestionnaire("QuestionnaireChoices");`,
    `<div data-slot="questionnaire-choices" :data-shortcuts="engine.shortcuts ?? undefined" :class="cn(${c("questionnaire-choices")}, props.class)">
  <slot />
</div>`,
  );
  const choice = f.file(
    "QuestionnaireChoice",
    `import type { HTMLAttributes } from "vue";
import { CheckIcon } from "@lucide/vue";
import { onBeforeUnmount, onMounted, useId, watch, watchEffect } from "vue";
import { cn } from "@/lib/utils";
import { choiceState } from "./engine";
import { injectQuestionnaireItem, useQuestionnaireState } from "./useQuestionnaire";

// A radio or checkbox row, depending on the question; a shortcut key shows when set. value is
// what it submits; v-model:checked controls it, default-checked starts it checked.
const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; value: string; checked?: boolean; defaultChecked?: boolean; disabled?: boolean }>(), {
  // Left undefined, the choice keeps its own state (Vue would otherwise read an absent boolean as false).
  checked: undefined,
  defaultChecked: false,
  disabled: false,
});
const emits = defineEmits<{ "update:checked": [checked: boolean]; change: [event: Event] }>();

const item = injectQuestionnaireItem("QuestionnaireChoice");
const id = useId();
const choice = useQuestionnaireState(item.root, () => choiceState(item, id, props));
const resetVersion = useQuestionnaireState(item.root, () => item.resetVersion);

let input: HTMLInputElement | null = null;
const setInput = (element: unknown) => {
  input = element instanceof HTMLInputElement ? element : null;
};
const stops: (() => void)[] = [];
let unregisterAnswer = () => {};
onMounted(() => {
  stops.push(item.registerSelection(id, props.defaultChecked));
  // As an answer of the question, re-registered when it's enabled or disabled.
  watch(
    [() => choice.value.state.disabled, () => props.disabled, () => props.value],
    ([disabled, ownDisabled, value]) => {
      unregisterAnswer();
      unregisterAnswer = input === null ? () => {} : item.registerAnswer({ id, type: "choice", element: input, value, disabled, ownDisabled });
    },
    { immediate: true },
  );
  watch(
    () => props.defaultChecked,
    (checked) => item.setDefault(id, checked),
    { immediate: true },
  );
  // A controlled choice's value, and the form's reset, reach the question.
  watch(
    [() => props.checked, resetVersion],
    ([checked]) => {
      if (checked !== undefined) item.syncControlled(id, checked);
    },
    { immediate: true },
  );
  // What a native form reset puts back.
  watchEffect(() => {
    if (input !== null) input.defaultChecked = props.checked ?? props.defaultChecked;
  });
});
onBeforeUnmount(() => {
  unregisterAnswer();
  for (const stop of stops) stop();
});

function onChange(event: Event) {
  emits("change", event);
  if (event.defaultPrevented) return;
  const checked = (event.target as HTMLInputElement).checked;
  if (props.checked === undefined) {
    item.selectFromInteraction(id, checked);
    return;
  }
  emits("update:checked", checked);
  // Choosing again what a skipped question had.
  if (item.status === "skipped" && props.checked === checked) item.selectFromInteraction(id, checked);
}`,
    `<label data-slot="questionnaire-choice" v-bind="choice.data" :class="cn(${c("questionnaire-choice")}, props.class)">
  <input :ref="setInput" data-slot="questionnaire-choice-input" v-bind="{ ...choice.data, ...choice.input }" ${staticClasses(slots["questionnaire-choice-input"])} @change="onChange" />
  <span aria-hidden="true" data-slot="questionnaire-choice-indicator" ${staticClasses(slots["questionnaire-choice-indicator"])}>
    <span data-slot="questionnaire-choice-indicator-dot" ${staticClasses(slots["questionnaire-choice-indicator-dot"])} />
    <CheckIcon data-slot="questionnaire-choice-indicator-check" ${staticClasses(slots["questionnaire-choice-indicator-check"])} />
  </span>
  <span data-slot="questionnaire-choice-label" ${staticClasses(slots["questionnaire-choice-label"])}>
    <slot />
  </span>
  <span
    data-slot="questionnaire-choice-shortcut"
    aria-hidden="true"
    :data-shortcut="choice.state.shortcut ?? undefined"
    :hidden="choice.state.shortcut === null"
    ${staticClasses(slots["questionnaire-choice-shortcut"])}
  >{{ choice.state.shortcut }}</span>
</label>`,
  );
  const input = f.file(
    "QuestionnaireInput",
    `import type { HTMLAttributes } from "vue";
import type { QuestionnaireInputType } from "./engine";
import { onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { cn } from "@/lib/utils";
import { hasValue, inputState } from "./engine";
import { injectQuestionnaireItem, useQuestionnaireState } from "./useQuestionnaire";

// A typed answer: v-model controls it, default-value starts it. It joins the form (and has a name)
// once there's something in it, so an empty one is neither submitted nor checked.
const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; defaultValue?: string | number; modelValue?: string | number; disabled?: boolean; type?: QuestionnaireInputType }>(), {
  defaultValue: undefined,
  modelValue: undefined,
  disabled: false,
  type: "text",
});
const emits = defineEmits<{ "update:modelValue": [value: string] }>();

const item = injectQuestionnaireItem("QuestionnaireInput");
const id = useId();
// An uncontrolled answer's text, and whether it has any.
const text = ref(String(props.defaultValue ?? ""));
const filled = ref(hasValue(props.defaultValue));
const answer = useQuestionnaireState(item.root, () => inputState(item, id, { value: props.modelValue, disabled: props.disabled, type: props.type }, filled.value));
const resetVersion = useQuestionnaireState(item.root, () => item.resetVersion);

let input: HTMLInputElement | null = null;
const setInput = (element: unknown) => {
  input = element instanceof HTMLInputElement ? element : null;
};
const stops: (() => void)[] = [];
let unregisterAnswer = () => {};
onMounted(() => {
  stops.push(item.registerSelection(id, hasValue(props.defaultValue)));
  watch(
    () => props.defaultValue,
    (value) => item.setDefault(id, hasValue(value)),
    { immediate: true },
  );
  watch(
    () => answer.value.input.disabled,
    (disabled) => {
      unregisterAnswer();
      unregisterAnswer = input === null ? () => {} : item.registerAnswer({ id, type: "input", element: input, value: "", disabled, ownDisabled: props.disabled });
    },
    { immediate: true },
  );
  // A controlled value reaches the question; the form's reset puts an uncontrolled one's default back.
  watch(
    () => props.modelValue,
    (value) => {
      if (value !== undefined) item.syncControlled(id, hasValue(value));
    },
    { immediate: true },
  );
  watch(resetVersion, () => {
    if (props.modelValue !== undefined) {
      item.syncControlled(id, hasValue(props.modelValue));
      return;
    }
    text.value = String(props.defaultValue ?? "");
    filled.value = hasValue(props.defaultValue);
  });
});
onBeforeUnmount(() => {
  unregisterAnswer();
  for (const stop of stops) stop();
});

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emits("update:modelValue", value);
  if (props.modelValue !== undefined) return;
  text.value = value;
  filled.value = value.trim().length > 0;
  item.selectFromInteraction(id, filled.value);
}`,
    `<div data-slot="questionnaire-input-wrapper" ${staticClasses(slots["questionnaire-input-wrapper"])}>
  <input
    :ref="setInput"
    data-slot="questionnaire-input"
    v-bind="{ ...answer.data, ...answer.input }"
    :value="modelValue ?? text"
    :class="cn(${c("questionnaire-input")}, props.class)"
    @input="onInput"
  />
</div>`,
  );
  const error = f.file(
    "QuestionnaireError",
    `import type { HTMLAttributes } from "vue";
import { onBeforeUnmount, onMounted, useId } from "vue";
import { cn } from "@/lib/utils";
import { injectQuestionnaireItem, useQuestionnaireState } from "./useQuestionnaire";

// Shown when the question can't be left as it is; says so in words of its own unless you give some.
const props = defineProps<{ class?: HTMLAttributes["class"]; id?: string }>();
const item = injectQuestionnaireItem("QuestionnaireError");
const id = props.id ?? useId();
const invalid = useQuestionnaireState(item.root, () => item.invalid);
let unregister = () => {};
onMounted(() => {
  unregister = item.registerError(id);
});
onBeforeUnmount(() => unregister());`,
    `<p :id="id" data-slot="questionnaire-error" :data-invalid="invalid ? '' : undefined" :hidden="!invalid" :role="invalid ? 'alert' : undefined" :class="cn(${c("questionnaire-error")}, props.class)">
  <slot>{{ item.required ? "Choose an answer to continue." : "Choose an answer or skip this question." }}</slot>
</p>`,
  );
  const title = f.file(
    "QuestionnaireTitle",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { injectQuestionnaireItem } from "./useQuestionnaire";

// The question, as the fieldset's legend.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
injectQuestionnaireItem("QuestionnaireTitle");`,
    `<legend data-slot="questionnaire-title" :class="cn(${c("questionnaire-title")}, props.class)">
  <slot />
</legend>`,
  );
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
    return f.file(
      `Questionnaire${part}`,
      `import type { HTMLAttributes } from "vue";
import type { ButtonVariantProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { navigationState } from "./engine";
import { injectQuestionnaire, useQuestionnaireState } from "./useQuestionnaire";

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    variant?: ButtonVariantProps["variant"];
    size?: ButtonVariantProps["size"];
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    tabindex?: number;
  }>(),
  { variant: ${q(variant)}, size: "default", disabled: false, type: ${q(n.type)}, tabindex: undefined },
);
${n.act === undefined ? "" : `const emits = defineEmits<{ click: [event: MouseEvent] }>();\n`}const { engine } = injectQuestionnaire("Questionnaire${part}");
const attributes = useQuestionnaireState(engine, () => navigationState(${n.visible}, props.disabled, engine.activeStatus, ${n.shortcut}, props.tabindex));
${
  n.act === undefined
    ? ""
    : `
// Your click handler runs first, and can stop it (preventDefault).
function onClick(event: MouseEvent) {
  emits("click", event);
  if (!event.defaultPrevented) ${n.act};
}`
}`,
      `<button data-slot="${slot}" v-bind="attributes" :type="type" :class="cn(buttonVariants({ variant, size }), ${c(slot)}, props.class)"${n.act === undefined ? "" : ` @click="onClick"`}>
  <slot><span>${label}</span></slot>
</button>`,
    );
  });
  const index = `export type {
  QuestionnaireChoiceDefinition,
  QuestionnaireInputType,
  QuestionnaireItemDefinition,
  QuestionnaireItemStatus,
  QuestionnaireShortcutMode,
} from "./engine";`;
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
    plain(f, "QuestionnaireChoiceDescription", "span", "questionnaire-choice-description", c("questionnaire-choice-description")),
    input,
    error,
    plain(f, "QuestionnaireActions", "div", "questionnaire-actions", c("questionnaire-actions")),
    ...nav,
    barrel(
      "questionnaire",
      [
        "Questionnaire",
        "QuestionnaireActions",
        "QuestionnaireChoice",
        "QuestionnaireChoiceDescription",
        "QuestionnaireChoices",
        "QuestionnaireDescription",
        "QuestionnaireError",
        "QuestionnaireInput",
        "QuestionnaireItem",
        "QuestionnaireNext",
        "QuestionnairePrevious",
        "QuestionnaireProgress",
        "QuestionnaireSkip",
        "QuestionnaireSubmit",
        "QuestionnaireTitle",
      ],
      index,
    ),
  ];
}
