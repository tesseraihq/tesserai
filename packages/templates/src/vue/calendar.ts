import type { Anatomy } from "@tesserai/core";
import { calendarCellClasses, calendarPieces } from "../calendar";
import { datePickerPieces } from "../date-picker";
import { LUCIDE_PACKAGES } from "../icons";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, staticClasses } from "./sfc";
import { REKA_CALENDAR_STATES } from "./states";

// Calendar on Reka UI's Calendar and RangeCalendar (dates are @internationalized/date values, as
// in shadcn-vue), laid out as react-day-picker lays out the React calendar, so the same classes
// land on the same parts: months, a nav with previous and next, per month a caption (a label, or
// month and year dropdowns) and a grid of weeks whose cells hold the system's ghost icon Buttons.
// Reka marks a day's state on the day, not its cell (vue/states.ts); the classes say the same.
export function renderCalendar(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = calendarPieces(anatomy, REKA_CALENDAR_STATES.single);
  const range = calendarPieces(anatomy, REKA_CALENDAR_STATES.range);
  const f = folder("calendar");
  const s = (slot: keyof typeof slots) => classList(slots[slot]);
  const c = (slot: keyof typeof slots) => staticClasses(slots[slot]);

  const index = `import type { DateValue } from "reka-ui";

// How a month is captioned: its name (the default), or dropdowns to pick the month, the year or both.
export type CalendarLayout = "month-and-year" | "month-only" | "year-only" | undefined;

// Month and year labels in a locale, as react-day-picker writes them.
export function formatDate(date: DateValue, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date.toDate("UTC"));
}`;

  const dayButton = f.file(
    "CalendarDayButton",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// A day: the system's ghost icon Button filling its cell, as Reka's cell trigger renders it
// (as-child). range: a range calendar's day, whose ends and middle look selected.
const props = defineProps<{ class?: HTMLAttributes["class"]; range?: boolean }>();`,
    `<Button variant="ghost" size="icon" :class="cn(range ? ${classList(range.slots["calendar:day"])} : ${s("calendar:day")}, props.class)">
  <slot />
</Button>`,
  );

  // The two calendars differ only in Reka's parts (Calendar*, RangeCalendar*) and the cell's states.
  const calendar = (kind: "Calendar" | "RangeCalendar") => {
    const p = (part: string) => `${kind}${part}`;
    const cells = classList(calendarCellClasses(slots, REKA_CALENDAR_STATES.cell, kind === "RangeCalendar"));
    const parts = ["Root", "Prev", "Next", "Grid", "GridHead", "GridBody", "GridRow", "HeadCell", "Cell", "CellTrigger"].map(p);
    const model = kind === "Calendar" ? "CalendarRoot" : "RangeCalendarRoot";
    return f.file(
      kind,
      `import type { ${model}Emits, ${model}Props, DateValue } from "reka-ui";
import type { HTMLAttributes, Ref } from "vue";
import type { ButtonVariantProps } from "@/components/ui/button";
import type { CalendarLayout } from ".";
import { getLocalTimeZone, today } from "@internationalized/date";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit, useVModel } from "@vueuse/core";
import { ${[...parts].sort().join(", ")}, useForwardPropsEmits } from "reka-ui";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from ".";
import CalendarDayButton from "./CalendarDayButton.vue";

${kind === "Calendar" ? "// v-model is a date (or dates, with multiple), as @internationalized/date values: today(getLocalTimeZone())." : "// v-model is a range, { start, end }, as @internationalized/date values."}
const props = withDefaults(
  defineProps<${model}Props & { class?: HTMLAttributes["class"]; layout?: CalendarLayout; buttonVariant?: ButtonVariantProps["variant"]; yearRange?: DateValue[] }>(),
  { modelValue: undefined, layout: undefined, buttonVariant: "ghost", weekdayFormat: "short", locale: "en-US", yearRange: undefined },
);
const emits = defineEmits<${model}Emits>();

const delegatedProps = reactiveOmit(props, "class", "layout", "buttonVariant", "yearRange", "placeholder");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

// The month shown starts at the selection unless explicitly supplied.
const selection = props.modelValue ?? props.defaultValue;
const initialDate = ${kind === "Calendar" ? "Array.isArray(selection) ? selection[0] : selection" : "selection?.start"};
const placeholder = useVModel(props, "placeholder", emits, { passive: true, defaultValue: props.defaultPlaceholder ?? initialDate ?? today(getLocalTimeZone()) }) as Ref<DateValue>;

// The years the year dropdown offers: the given range, or a hundred years back and ten on.
const years = computed(() => {
  if (props.yearRange) return props.yearRange;
  const from = props.minValue ?? placeholder.value.cycle("year", -100);
  const to = props.maxValue ?? placeholder.value.cycle("year", 10);
  return Array.from({ length: to.year - from.year + 1 }, (_, i) => from.set({ year: from.year + i, month: 1, day: 1 }));
});
const month = (date: DateValue) => formatDate(date, props.locale, { month: "short" });
const year = (date: DateValue) => formatDate(date, props.locale, { year: "numeric" });
// The dropdown picks for the first month shown; a later month moves the first back to match.
const pick = (field: "month" | "year", value: number, index: number) => {
  placeholder.value = placeholder.value.set({ day: 1 }).add({ months: index }).set(field === "month" ? { month: value } : { year: value }).subtract({ months: index });
};`,
      `<${p("Root")} v-slot="{ grid, weekDays }" v-bind="forwarded" v-model:placeholder="placeholder" data-slot="calendar" :class="cn(${s("calendar")}, props.class)">
  <div ${c("calendar:months")}>
    <nav ${c("calendar:nav")} aria-label="Navigation bar">
      <${p("Prev")} :class="cn(buttonVariants({ variant: buttonVariant }), ${s("calendar:nav-button")})">
        <ChevronLeftIcon ${c("calendar:chevron")} />
      </${p("Prev")}>
      <${p("Next")} :class="cn(buttonVariants({ variant: buttonVariant }), ${s("calendar:nav-button")})">
        <ChevronRightIcon ${c("calendar:chevron")} />
      </${p("Next")}>
    </nav>
    <div v-for="(shown, index) in grid" :key="shown.value.toString()" ${c("calendar:month")}>
      <div ${c("calendar:month-caption")}>
        <span v-if="layout === undefined" ${staticClasses(slots["calendar:caption"])} role="status" aria-live="polite">{{ formatDate(shown.value, locale, { month: "long", year: "numeric" }) }}</span>
        <div v-else ${staticClasses([...slots["calendar:dropdowns"], ...slots["calendar:caption"]])}>
          <span v-if="layout !== 'year-only'" ${c("calendar:dropdown-root")}>
            <select ${c("calendar:dropdown")} aria-label="Choose the Month" :value="shown.value.month" @change="pick('month', Number(($event.target as HTMLSelectElement).value), index)">
              <option v-for="m in 12" :key="m" :value="m">{{ month(shown.value.set({ month: m, day: 1 })) }}</option>
            </select>
            <span ${staticClasses([...slots["calendar:caption"], ...slots["calendar:dropdown-label"]])} aria-hidden="true">{{ month(shown.value) }}<ChevronDownIcon ${c("calendar:chevron-down")} /></span>
          </span>
          <template v-else>{{ month(shown.value) }}</template>
          <span v-if="layout !== 'month-only'" ${c("calendar:dropdown-root")}>
            <select ${c("calendar:dropdown")} aria-label="Choose the Year" :value="shown.value.year" @change="pick('year', Number(($event.target as HTMLSelectElement).value), index)">
              <option v-for="y in years" :key="y.year" :value="y.year">{{ year(y) }}</option>
            </select>
            <span ${staticClasses([...slots["calendar:caption"], ...slots["calendar:dropdown-label"]])} aria-hidden="true">{{ year(shown.value) }}<ChevronDownIcon ${c("calendar:chevron-down")} /></span>
          </span>
          <template v-else>{{ year(shown.value) }}</template>
        </div>
      </div>
      <${p("Grid")} ${c("calendar:grid")}>
        <${p("GridHead")}>
          <${p("GridRow")} ${c("calendar:weekdays")}>
            <${p("HeadCell")} v-for="day in weekDays" :key="day" ${c("calendar:weekday")}>{{ day.slice(0, 2) }}</${p("HeadCell")}>
          </${p("GridRow")}>
        </${p("GridHead")}>
        <${p("GridBody")}>
          <${p("GridRow")} v-for="(week, i) in shown.rows" :key="i" ${c("calendar:week")}>
            <${p("Cell")} v-for="date in week" :key="date.toString()" :date="date" :class="${cells}">
              <${p("CellTrigger")} v-slot="{ dayValue }" as-child :day="date" :month="shown.value">
                <CalendarDayButton${kind === "RangeCalendar" ? " range" : ""}>{{ dayValue }}</CalendarDayButton>
              </${p("CellTrigger")}>
            </${p("Cell")}>
          </${p("GridRow")}>
        </${p("GridBody")}>
      </${p("Grid")}>
    </div>
  </div>
</${p("Root")}>`,
    );
  };

  return [calendar("Calendar"), calendar("RangeCalendar"), dayButton, barrel("calendar", ["Calendar", "CalendarDayButton", "RangeCalendar"], index)];
}

// DatePicker and DateRangePicker: the system's outline Button opens the Calendar in the Popover,
// and closes once a date (or both ends of a range) is chosen, as the React components do.
export function renderDatePicker(anatomy: Anatomy): GeneratedFile[] {
  const { slots, trigger, rangeMonths } = datePickerPieces(anatomy);
  const f = folder("date-picker");
  const picker = (kind: "DatePicker" | "DateRangePicker") => {
    const range = kind === "DateRangePicker";
    const type = range ? "DateRange" : "DateValue";
    return f.file(
      kind,
      `import type { ${range ? "DateRange, DateValue" : "DateValue"} } from "reka-ui";
import type { HTMLAttributes, Ref } from "vue";
import { getLocalTimeZone } from "@internationalized/date";
import { CalendarIcon } from "${LUCIDE_PACKAGES.vue}";
import { useVModel } from "@vueuse/core";
import { computed, ref } from "vue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ${range ? "RangeCalendar" : "Calendar"} } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// The popover renders no element of its own, so attributes (id, name, aria-*) go on the button.
defineOptions({ inheritAttrs: false });

// v-model is ${range ? "a range, { start, end }," : "a date,"} as @internationalized/date values.
const props = withDefaults(defineProps<{ modelValue?: ${type}; defaultValue?: ${type}; placeholder?: string; class?: HTMLAttributes["class"] }>(), {
  modelValue: undefined,
  defaultValue: undefined,
  placeholder: "${range ? "Pick dates" : "Pick a date"}",
});
const emits = defineEmits<{ (e: "update:modelValue", value: ${type} | undefined): void }>();
// Dates are classes: the ref holds them as they are, not unwrapped.
const current = useVModel(props, "modelValue", emits, { passive: true, defaultValue: props.defaultValue }) as Ref<${type} | undefined>;
const open = ref(false);

const label = (value: DateValue) => value.toDate(getLocalTimeZone()).toLocaleDateString(undefined, { dateStyle: "long" });
${
  range
    ? `const text = computed(() => (current.value?.start ? (current.value.end ? \`\${label(current.value.start)} – \${label(current.value.end)}\` : label(current.value.start)) : undefined));
const empty = computed(() => current.value?.start === undefined);
// Closes once both ends are chosen.
const choose = (next: DateRange) => {
  current.value = next;
  if (next.start && next.end && next.start.compare(next.end) !== 0) open.value = false;
};`
    : `const text = computed(() => (current.value ? label(current.value) : undefined));
const empty = computed(() => current.value === undefined);
const choose = (next: DateValue | DateValue[] | undefined) => {
  if (Array.isArray(next)) return;
  current.value = next;
  open.value = false;
};`
}`,
      `<Popover v-model:open="open">
  <PopoverTrigger as-child>
    <Button v-bind="$attrs" data-slot="date-picker" variant="${trigger.variant}" :data-empty="empty" :class="cn(${classList(slots["date-picker"])}, props.class)">
      <span :title="text" ${staticClasses(slots["date-picker:label"])}>{{ text ?? placeholder }}</span>
      <CalendarIcon data-icon="inline-end" />
    </Button>
  </PopoverTrigger>
  <PopoverContent ${staticClasses(slots["date-picker:popover"])} align="start">
    <${range ? `RangeCalendar :number-of-months="${rangeMonths}"` : "Calendar"} :model-value="current" ${range ? `:default-placeholder="current?.start"` : `:default-placeholder="current"`} @update:model-value="choose" />
  </PopoverContent>
</Popover>`,
    );
  };
  return [picker("DatePicker"), picker("DateRangePicker"), barrel("date-picker", ["DatePicker", "DateRangePicker"])];
}
