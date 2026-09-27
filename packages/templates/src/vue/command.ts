import type { Anatomy } from "@tesserai/core";
import { mapStates } from "../classes";
import { commandPieces, type CommandFlavor } from "../command";
import { LUCIDE_PACKAGES } from "../icons";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, plain, staticClasses } from "./sfc";

// Reka's Listbox marks the row the keyboard or pointer is on data-highlighted, and a disabled one
// data-disabled, where cmdk says data-selected="true" and data-disabled="true". A group's heading
// carries cmdk's marker (cmdk-group-heading), which the group's classes style it through, as in React.
export const REKA_COMMAND: CommandFlavor = {
  item: { ...mapStates(() => []), highlighted: ["data-highlighted:"], disabled: ["data-disabled:"] },
  heading: "**:[[cmdk-group-heading]]:",
};

// Command on Reka's Listbox, filtered as you type with Reka's useFilter, as shadcn-vue builds it:
// the root keeps every row's text and each group's rows, and hides what doesn't match the search.
export function renderCommand(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = commandPieces(anatomy, REKA_COMMAND);
  const f = folder("command");

  const root = f.file(
    "Command",
    `import type { ListboxRootEmits, ListboxRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ListboxRoot, useFilter, useForwardPropsEmits } from "reka-ui";
import { reactive, ref, watch } from "vue";
import { cn } from "@/lib/utils";
import { provideCommandContext } from ".";

const props = withDefaults(defineProps<ListboxRootProps & { class?: HTMLAttributes["class"] }>(), { modelValue: "", highlightOnHover: true });
const emits = defineEmits<ListboxRootEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

// Every row's text by its id, and each group's rows, as the rows mount.
const allItems = ref<Map<string, string>>(new Map());
const allGroups = ref<Map<string, Set<string>>>(new Map());

const { contains } = useFilter({ sensitivity: "base" });
const filterState = reactive({
  search: "",
  filtered: { count: 0, items: new Map<string, number>(), groups: new Set<string>() },
});

// The rows a search leaves, counted as they mount (none yet on the server), as cmdk counts them.
function filterItems() {
  if (!filterState.search) {
    filterState.filtered.count = allItems.value.size;
    return;
  }
  filterState.filtered.groups = new Set();
  let count = 0;
  for (const [id, text] of allItems.value) {
    const match = contains(text, filterState.search);
    filterState.filtered.items.set(id, match ? 1 : 0);
    if (match) count++;
  }
  for (const [groupId, items] of allGroups.value) {
    for (const itemId of items) {
      if (filterState.filtered.items.get(itemId)! > 0) {
        filterState.filtered.groups.add(groupId);
        break;
      }
    }
  }
  filterState.filtered.count = count;
}

watch(() => [filterState.search, allItems.value.size], filterItems, { immediate: true });

provideCommandContext({ allItems, allGroups, filterState });`,
    `<ListboxRoot data-slot="command" v-bind="forwarded" :class="cn(${classList(slots.command)}, props.class)">
  <slot />
</ListboxRoot>`,
  );

  // A placeholder is not a label: the field is named after it unless given its own.
  const input = f.file(
    "CommandInput",
    `import type { ListboxFilterProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { SearchIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { ListboxFilter, useForwardProps } from "reka-ui";
import { useAttrs } from "vue";
import { cn } from "@/lib/utils";
import { useCommand } from ".";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<ListboxFilterProps & { class?: HTMLAttributes["class"] }>(), { autoFocus: true });
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);
const attrs = useAttrs();
const { filterState } = useCommand();`,
    `<div data-slot="command-input-wrapper" ${staticClasses(slots["command-input-wrapper"])}>
  <SearchIcon />
  <ListboxFilter
    v-bind="{ ...forwarded, ...$attrs }"
    v-model="filterState.search"
    data-slot="command-input"
    :aria-label="attrs['aria-label'] ?? attrs.placeholder ?? 'Search'"
    :class="cn(${classList(slots["command-input"])}, props.class)"
  />
</div>`,
  );

  const list = f.file(
    "CommandList",
    `import type { ListboxContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ListboxContent, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<ListboxContentProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);`,
    `<ListboxContent data-slot="command-list" v-bind="forwarded" :class="cn(${classList(slots["command-list"])}, props.class)">
  <slot />
</ListboxContent>`,
  );

  // Shown while no row shows, as cmdk's is: a search matches nothing (or, rendered on the server,
  // no row has mounted to be counted).
  const empty = f.file(
    "CommandEmpty",
    `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { Primitive } from "reka-ui";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { useCommand } from ".";

const props = defineProps<PrimitiveProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");
const { filterState } = useCommand();
const shown = computed(() => filterState.filtered.count === 0);`,
    `<Primitive v-if="shown" data-slot="command-empty" v-bind="delegatedProps" :class="cn(${classList(slots["command-empty"])}, props.class)">
  <slot />
</Primitive>`,
  );

  const group = f.file(
    "CommandGroup",
    `import type { ListboxGroupProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ListboxGroup, ListboxGroupLabel, useId } from "reka-ui";
import { computed, onMounted, onUnmounted } from "vue";
import { cn } from "@/lib/utils";
import { provideCommandGroupContext, useCommand } from ".";

const props = defineProps<ListboxGroupProps & { class?: HTMLAttributes["class"]; heading?: string }>();
const delegatedProps = reactiveOmit(props, "class", "heading");
const { allGroups, filterState } = useCommand();
const id = useId();
// Hidden while a search matches none of its rows.
const shown = computed(() => !filterState.search || filterState.filtered.groups.has(id));

provideCommandGroupContext({ id });
onMounted(() => {
  if (!allGroups.value.has(id)) allGroups.value.set(id, new Set());
});
onUnmounted(() => {
  allGroups.value.delete(id);
});`,
    `<ListboxGroup :id="id" data-slot="command-group" v-bind="delegatedProps" :hidden="shown ? undefined : true" :class="cn(${classList(slots["command-group"])}, props.class)">
  <ListboxGroupLabel v-if="heading" cmdk-group-heading="">{{ heading }}</ListboxGroupLabel>
  <slot />
</ListboxGroup>`,
  );

  // Decorative (a listbox may hold no separator role), and hidden while searching unless
  // always-render is set, as cmdk's is.
  const separator = f.file(
    "CommandSeparator",
    `import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { useCommand } from ".";

const props = defineProps<{ class?: HTMLAttributes["class"]; alwaysRender?: boolean }>();
const { filterState } = useCommand();
const shown = computed(() => props.alwaysRender || !filterState.search);`,
    `<div v-if="shown" data-slot="command-separator" aria-hidden="true" :class="cn(${classList(slots["command-separator"])}, props.class)" />`,
  );

  // A row: its value is its own id unless given one; its text is what the search matches.
  const item = f.file(
    "CommandItem",
    `import type { AcceptableValue, ListboxItemEmits, ListboxItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit, useCurrentElement } from "@vueuse/core";
import { ListboxItem, useForwardPropsEmits, useId } from "reka-ui";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { cn } from "@/lib/utils";
import { useCommand, useCommandGroup } from ".";

const props = defineProps<Omit<ListboxItemProps, "value"> & { value?: AcceptableValue; class?: HTMLAttributes["class"] }>();
const emits = defineEmits<ListboxItemEmits>();
const delegatedProps = reactiveOmit(props, "class", "value");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const id = useId();
const { filterState, allItems, allGroups } = useCommand();
const groupContext = useCommandGroup(null);

const shown = computed(() => {
  if (!filterState.search) return true;
  const score = filterState.filtered.items.get(id);
  // Not measured yet: shown, so it mounts and is.
  return score === undefined || score > 0;
});

const itemRef = ref();
const element = useCurrentElement(itemRef);
onMounted(() => {
  if (!(element.value instanceof HTMLElement)) return;
  allItems.value.set(id, element.value.textContent ?? String(props.value ?? ""));
  const groupId = groupContext?.id;
  if (groupId !== undefined) {
    if (!allGroups.value.has(groupId)) allGroups.value.set(groupId, new Set([id]));
    else allGroups.value.get(groupId)?.add(id);
  }
});
onUnmounted(() => {
  allItems.value.delete(id);
});`,
    `<ListboxItem
  v-if="shown"
  :id="id"
  ref="itemRef"
  data-slot="command-item"
  v-bind="forwarded"
  :value="props.value ?? id"
  :class="cn(${classList(slots["command-item"])}, props.class)"
  @select="filterState.search = ''"
>
  <slot />
</ListboxItem>`,
  );

  // A command palette in the system's own Dialog.
  const dialog = f.file(
    "CommandDialog",
    `import type { DialogRootEmits, DialogRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const props = withDefaults(
  defineProps<DialogRootProps & { title?: string; description?: string; class?: HTMLAttributes["class"]; showCloseButton?: boolean }>(),
  { title: "Command Palette", description: "Search for a command to run...", showCloseButton: false },
);
const emits = defineEmits<DialogRootEmits>();
const delegatedProps = reactiveOmit(props, "title", "description", "class", "showCloseButton");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<Dialog v-slot="slotProps" v-bind="forwarded">
  <DialogHeader class="sr-only">
    <DialogTitle>{{ title }}</DialogTitle>
    <DialogDescription>{{ description }}</DialogDescription>
  </DialogHeader>
  <DialogContent :class="cn('overflow-hidden p-0', props.class)" :show-close-button="showCloseButton">
    <slot v-bind="slotProps" />
  </DialogContent>
</Dialog>`,
  );

  return [
    root,
    dialog,
    input,
    list,
    empty,
    group,
    separator,
    item,
    plain(f, "CommandShortcut", "span", "command-shortcut", classList(slots["command-shortcut"])),
    barrel(
      "command",
      ["Command", "CommandDialog", "CommandEmpty", "CommandGroup", "CommandInput", "CommandItem", "CommandList", "CommandSeparator", "CommandShortcut"],
      `import type { Ref } from "vue";
import { createContext } from "reka-ui";

// What the rows and groups share with the root: the text of each, and the search.
export const [useCommand, provideCommandContext] = createContext<{
  allItems: Ref<Map<string, string>>;
  allGroups: Ref<Map<string, Set<string>>>;
  filterState: { search: string; filtered: { count: number; items: Map<string, number>; groups: Set<string> } };
}>("Command");

export const [useCommandGroup, provideCommandGroupContext] = createContext<{ id?: string }>("CommandGroup");`,
    ),
  ];
}
