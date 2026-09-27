import type { Anatomy } from "@tesserai/core";
import { calendarCellClasses, calendarPieces } from "../calendar";
import { q } from "../codegen";
import { datePickerPieces } from "../date-picker";
import type { GeneratedFile } from "../render";
import { bitsImport, indexFile, indexParts, lucideImport, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";
import { BITS_CALENDAR_STATES } from "./states";

// Calendar and RangeCalendar on Bits UI (dates are @internationalized/date values, as in
// shadcn-svelte), laid out as react-day-picker lays out the React calendar, so the same classes land
// on the same parts: months, a nav with previous and next, per month a caption (a label, or month
// and year dropdowns) and a grid of weeks whose cells hold the system's ghost icon Buttons. Bits
// marks a day's state on the day and its cell (svelte/states.ts); the classes say the same.
export function calendarFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = calendarPieces(anatomy, BITS_CALENDAR_STATES.single);
  const range = calendarPieces(anatomy, BITS_CALENDAR_STATES.range);

  const dayButton = svelteFile("calendar/calendar-day-button.svelte", {
    script: `${uiImport("button", ["Button", "type ButtonProps"])}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["calendar:day"])};
const rangeClasses = ${quoted(range.slots["calendar:day"])};

// A day: the system's ghost icon Button filling its cell, as Bits' day renders it (its child
// snippet). range: a range calendar's day, whose ends and middle look selected.
let { ref = $bindable(null), class: className, range = false, ...restProps }: ButtonProps & { range?: boolean } = $props();`,
    markup: `<Button bind:ref variant="ghost" size="icon" class={cn(range ? rangeClasses : classes, className)} {...restProps} />`,
  });

  // The two calendars differ only in Bits' namespace and the cell's states.
  const calendar = (kind: "Calendar" | "RangeCalendar") => {
    const ns = `${kind}Primitive`;
    const single = kind === "Calendar";
    const constants: Record<string, string[]> = {
      classes: slots.calendar,
      monthsClasses: slots["calendar:months"],
      navClasses: slots["calendar:nav"],
      navButtonClasses: slots["calendar:nav-button"],
      chevronClasses: slots["calendar:chevron"],
      chevronDownClasses: slots["calendar:chevron-down"],
      monthClasses: slots["calendar:month"],
      monthCaptionClasses: slots["calendar:month-caption"],
      captionClasses: slots["calendar:caption"],
      dropdownsClasses: [...slots["calendar:dropdowns"], ...slots["calendar:caption"]],
      dropdownRootClasses: slots["calendar:dropdown-root"],
      dropdownClasses: slots["calendar:dropdown"],
      dropdownLabelClasses: [...slots["calendar:caption"], ...slots["calendar:dropdown-label"]],
      gridClasses: slots["calendar:grid"],
      weekdaysClasses: slots["calendar:weekdays"],
      weekdayClasses: slots["calendar:weekday"],
      weekClasses: slots["calendar:week"],
      cellClasses: calendarCellClasses(slots, BITS_CALENDAR_STATES.cell, !single),
    };
    return svelteFile(`calendar/${single ? "calendar" : "range-calendar"}.svelte`, {
      script: `${bitsImport(kind)}
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
${lucideImport("ChevronDownIcon")}
${lucideImport("ChevronLeftIcon")}
${lucideImport("ChevronRightIcon")}
${uiImport("button", ["buttonVariants", "type ButtonVariant"])}
${UTILS_IMPORT(["cn", "type WithoutChildrenOrChild"])}
import CalendarDayButton from "./calendar-day-button.svelte";

${Object.entries(constants)
  .map(([name, classes]) => `const ${name} = ${quoted(classes)};`)
  .join("\n")}

// Bits' props, with value and placeholder also taking undefined, so state that's empty until a
// date is picked can be bound (${single ? "for each type of calendar" : "the range calendar's"}).
type Props<T> = T extends unknown
  ? Omit<T, "value" | "placeholder"> & { value?: (T extends { value?: infer V } ? V : never) | undefined; placeholder?: DateValue | undefined }
  : never;

// ${single ? "value is a date (type=\"single\") or dates (type=\"multiple\")" : "value is a range, { start, end },"} as @internationalized/date values;
// captionLayout adds month and year dropdowns.
let {
  ref = $bindable(null),
  value = $bindable(),
  placeholder = $bindable(),
  class: className,
  buttonVariant = "ghost",
  captionLayout = "label",
  locale = "en-US",
  weekdayFormat = "short",
  // Days of the months either side can be picked, as in the React calendar (and shadcn-svelte's).
  disableDaysOutsideMonth = false,
  years,
  ...restProps
}: Props<WithoutChildrenOrChild<${ns}.RootProps>> & {
  buttonVariant?: ButtonVariant;
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
  // The years the year dropdown offers: a hundred back and ten on by default.
  years?: number[];
} = $props();

// Month and year labels in the locale, as react-day-picker writes them.
const format = (date: DateValue, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date.toDate("UTC"));
const shown = $derived(placeholder ?? today(getLocalTimeZone()));
const yearOptions = $derived(years ?? Array.from({ length: 111 }, (_, i) => shown.year - 100 + i));
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

// The dropdowns pick for the first month shown; a later month moves the first back to match.
function pick(field: "month" | "year", event: Event & { currentTarget: HTMLSelectElement }, index: number) {
  const next = Number(event.currentTarget.value);
  placeholder = shown.set({ day: 1 }).add({ months: index }).set(field === "month" ? { month: next } : { year: next }).subtract({ months: index });
}`,
      markup: `<${ns}.Root
  bind:ref
  bind:value={value as never}
  bind:placeholder={placeholder as never}
  {locale}
  {weekdayFormat}
  {disableDaysOutsideMonth}
  data-slot="calendar"
  class={cn(classes, className)}
  {...restProps}
>
  {#snippet children({ months, weekdays })}
    <div class={monthsClasses}>
      <nav class={navClasses} aria-label="Navigation bar">
        <${ns}.PrevButton class={cn(buttonVariants({ variant: buttonVariant }), navButtonClasses)}>
          <ChevronLeftIcon class={chevronClasses} />
        </${ns}.PrevButton>
        <${ns}.NextButton class={cn(buttonVariants({ variant: buttonVariant }), navButtonClasses)}>
          <ChevronRightIcon class={chevronClasses} />
        </${ns}.NextButton>
      </nav>
      {#each months as month, index (month)}
        <div class={monthClasses}>
          <div class={monthCaptionClasses}>
            {#if captionLayout === "label"}
              <span class={captionClasses} role="status" aria-live="polite">{format(month.value, { month: "long", year: "numeric" })}</span>
            {:else}
              <div class={dropdownsClasses}>
                {#if captionLayout !== "dropdown-years"}
                  <span class={dropdownRootClasses}>
                    <select class={dropdownClasses} aria-label="Choose the Month" value={month.value.month} onchange={(event) => pick("month", event, index)}>
                      {#each monthOptions as option (option)}
                        <option value={option}>{format(month.value.set({ month: option, day: 1 }), { month: "short" })}</option>
                      {/each}
                    </select>
                    <span class={dropdownLabelClasses} aria-hidden="true">{format(month.value, { month: "short" })}<ChevronDownIcon class={chevronDownClasses} /></span>
                  </span>
                {:else}
                  {format(month.value, { month: "short" })}
                {/if}
                {#if captionLayout !== "dropdown-months"}
                  <span class={dropdownRootClasses}>
                    <select class={dropdownClasses} aria-label="Choose the Year" value={month.value.year} onchange={(event) => pick("year", event, index)}>
                      {#each yearOptions as option (option)}
                        <option value={option}>{option}</option>
                      {/each}
                    </select>
                    <span class={dropdownLabelClasses} aria-hidden="true">{format(month.value, { year: "numeric" })}<ChevronDownIcon class={chevronDownClasses} /></span>
                  </span>
                {:else}
                  {format(month.value, { year: "numeric" })}
                {/if}
              </div>
            {/if}
          </div>
          <${ns}.Grid class={gridClasses}>
            <${ns}.GridHead>
              <${ns}.GridRow class={weekdaysClasses}>
                {#each weekdays as weekday, i (i)}
                  <${ns}.HeadCell class={weekdayClasses}>{weekday.slice(0, 2)}</${ns}.HeadCell>
                {/each}
              </${ns}.GridRow>
            </${ns}.GridHead>
            <${ns}.GridBody>
              {#each month.weeks as week, i (i)}
                <${ns}.GridRow class={weekClasses}>
                  {#each week as date (date)}
                    <${ns}.Cell {date} month={month.value} class={cellClasses}>
                      <${ns}.Day>
                        {#snippet child({ props })}
                          <CalendarDayButton {...props}${single ? "" : " range"}>{date.day}</CalendarDayButton>
                        {/snippet}
                      </${ns}.Day>
                    </${ns}.Cell>
                  {/each}
                </${ns}.GridRow>
              {/each}
            </${ns}.GridBody>
          </${ns}.Grid>
        </div>
      {/each}
    </div>
  {/snippet}
</${ns}.Root>`,
    });
  };

  return [
    calendar("Calendar"),
    calendar("RangeCalendar"),
    dayButton,
    indexFile(
      "calendar/index.ts",
      indexParts([
        ["calendar.svelte", "Root", "Calendar"],
        ["range-calendar.svelte", "Range", "RangeCalendar"],
        ["calendar-day-button.svelte", "DayButton", "CalendarDayButton"],
      ]),
    ),
  ];
}

// DatePicker and DateRangePicker: the system's outline Button opens the Calendar in the Popover,
// and closes once a date (or both ends of a range) is chosen, as the React components do.
export function datePickerFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, trigger, rangeMonths } = datePickerPieces(anatomy);
  const picker = (kind: "DatePicker" | "DateRangePicker") => {
    const range = kind === "DateRangePicker";
    return svelteFile(`date-picker/${range ? "date-range-picker" : "date-picker"}.svelte`, {
      script: `import { getLocalTimeZone, type DateValue } from "@internationalized/date";
${range ? `import type { DateRange } from "bits-ui";\n` : ""}${lucideImport("CalendarIcon")}
${uiImport("button", ["Button"])}
${uiImport("calendar", [range ? "RangeCalendar" : "Calendar"])}
import * as Popover from "$UI$/popover/index.js";
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["date-picker"])};
const popoverClasses = ${quoted(slots["date-picker:popover"])};
const textClasses = ${quoted(slots["date-picker:label"])};

// value is ${range ? "a range, { start, end }," : "a date,"} as an @internationalized/date value.
let {
  value = $bindable(),
  placeholder = ${q(range ? "Pick dates" : "Pick a date")},
  class: className,
}: { value?: ${range ? "DateRange" : "DateValue"} | undefined; placeholder?: string; class?: string | undefined } = $props();

let open = $state(false);
const label = (date: DateValue) => date.toDate(getLocalTimeZone()).toLocaleDateString(undefined, { dateStyle: "long" });
${
  range
    ? `const text = $derived(value?.start ? (value.end ? \`\${label(value.start)} – \${label(value.end)}\` : label(value.start)) : undefined);
// Closes once both ends are chosen.
function choose(next: DateRange | undefined) {
  if (next?.start && next.end && next.start.compare(next.end) !== 0) open = false;
}`
    : `const text = $derived(value ? label(value) : undefined);
function choose() {
  open = false;
}`
}`,
      markup: `<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} data-slot="date-picker" variant="${trigger.variant}" data-empty={${range ? "value?.start === undefined" : "value === undefined"}} class={cn(classes, className)}>
        <span title={text} class={textClasses}>{text ?? placeholder}</span>
        <CalendarIcon data-icon="inline-end" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class={popoverClasses} align="start">
    ${range ? `<RangeCalendar bind:value={value as never} numberOfMonths={${rangeMonths}} onValueChange={choose} />` : `<Calendar type="single" bind:value={value as never} onValueChange={choose} />`}
  </Popover.Content>
</Popover.Root>`,
    });
  };
  return [
    picker("DatePicker"),
    picker("DateRangePicker"),
    indexFile(
      "date-picker/index.ts",
      indexParts([
        ["date-picker.svelte", "Root", "DatePicker"],
        ["date-range-picker.svelte", "Range", "DateRangePicker"],
      ]),
    ),
  ];
}
