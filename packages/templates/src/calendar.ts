import type { Anatomy, Base } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

// How a calendar marks a day's state, which differs by library: react-day-picker writes data-*=true
// attributes on the day button and on its cell (and state class lists on the cell), React Aria its
// own render props, Reka and Bits data attributes of their own (vue/states.ts, svelte/states.ts).
// Each field is the prefix a class takes to apply in that state; the classes themselves, and what
// they mean, are the same everywhere.
export type CalendarStates = {
  // A day's focus ring.
  dayFocus: string;
  // What makes a day look selected: a single day, or a range's first and last.
  selected: string[];
  // A day between a range's ends; a range's first and last day (their rounded ends). Null for a
  // calendar that picks no ranges.
  rangeMiddle: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  // A day outside the month (its text color).
  dayOutside: string;
  // A cell holding a selected day, as a variant (today's cell) and inside an arbitrary selector
  // (a week's first and last selected day round their outer corners): "data-[selected=true]:" and
  // "[data-selected=true]" on react-day-picker's cells.
  cellSelected: string;
  cellSelectedAttribute: string;
  // A previous or next month button that can't be used.
  navDisabled: string;
};

// react-day-picker 9 (Base UI and Radix): the day button reads its cell's focus and month through
// the cell's group/day name, and its own range attributes; the cell gets today's and the other
// state class lists from react-day-picker.
export const RDP_CALENDAR_STATES: CalendarStates = {
  dayFocus: "group-data-[focused=true]/day:",
  selected: ["data-[selected-single=true]:", "data-[range-start=true]:", "data-[range-end=true]:"],
  rangeMiddle: "data-[range-middle=true]:",
  rangeStart: "data-[range-start=true]:",
  rangeEnd: "data-[range-end=true]:",
  dayOutside: "group-data-[outside=true]/day:",
  cellSelected: "data-[selected=true]:",
  cellSelectedAttribute: "[data-selected=true]",
  navDisabled: "aria-disabled:",
};

// React Aria's cell marks focus and the month through render props, as data-focus-visible and
// data-outside-month; its day div takes the same range attributes as react-day-picker's button.
const ARIA_CALENDAR_STATES: CalendarStates = { ...RDP_CALENDAR_STATES, dayFocus: "group-data-focus-visible/day:", dayOutside: "group-data-outside-month/day:" };

const prefixed = (prefix: string, classes: string[]) => classes.map((c) => `${prefix}${c}`);

// Calendar's classes, which every framework's shell prints from, by part. React's calendar writes
// most of them into react-day-picker's classNames (keys after its parts: months, nav, month_caption…);
// only its root has a data-slot. --cell-size and --cell-radius (shadcn's names) come from the
// calendar's tokens.
export function calendarPieces(anatomy: Anatomy, states: CalendarStates = RDP_CALENDAR_STATES) {
  // A day shows focus through its states' prefix (its cell's on react-day-picker, its own elsewhere).
  const dayFocus: StatePrefixes = { ...NATIVE_STATES, "focus-visible": [states.dayFocus] };
  const c = (part: string, prefix?: string, partStates: StatePrefixes = NATIVE_STATES) => flatClasses(anatomy, part, prefix === undefined ? { states: partStates } : { states: partStates, prefix });
  const split = (classes: string) => classes.split(" ");

  const caption = [...c("caption"), "select-none"];
  const weekday = [...c("weekday"), "flex-1", "rounded-(--cell-radius)", "font-normal", "select-none"];
  const day = [
    "relative",
    "isolate",
    "z-10",
    "flex",
    "aspect-square",
    "size-auto",
    "w-full",
    "min-w-(--cell-size)",
    "flex-col",
    "gap-1",
    "border-0",
    "leading-none",
    "font-normal",
    "[&>span]:text-xs",
    "[&>span]:opacity-70",
    ...c("day", undefined, dayFocus),
    ...states.selected.flatMap((prefix) => c("selected", prefix)),
    ...(states.rangeMiddle === null ? [] : c("range", states.rangeMiddle)),
    // The day's own button colors itself from its cell: outside the month.
    ...c("outside", states.dayOutside).filter((x) => x.includes(":text-")),
    ...(states.rangeStart === null ? [] : [`${states.rangeStart}rounded-(--cell-radius)`, `${states.rangeStart}rounded-s-(--cell-radius)`]),
    ...(states.rangeEnd === null ? [] : [`${states.rangeEnd}rounded-(--cell-radius)`, `${states.rangeEnd}rounded-e-(--cell-radius)`]),
    ...(states.rangeMiddle === null ? [] : [`${states.rangeMiddle}rounded-none`]),
  ];
  // The cell behind a range's first and last day carries the range color out to its neighbours.
  const rangeCell = (edge: "start" | "end") => [
    "relative",
    "isolate",
    "z-0",
    edge === "start" ? "rounded-s-(--cell-radius)" : "rounded-e-(--cell-radius)",
    ...c("range").filter((x) => x.startsWith("bg-")),
    "after:absolute",
    "after:inset-y-0",
    edge === "start" ? "after:end-0" : "after:start-0",
    "after:w-4",
    ...c("range", "after:").filter((x) => x.startsWith("after:bg-")),
  ];
  const selectedDay = (edge: "first" | "last") =>
    edge === "last" ? `[&:last-child${states.cellSelectedAttribute}_button]:rounded-e-(--cell-radius)` : `[&:first-child${states.cellSelectedAttribute}_button]:rounded-s-(--cell-radius)`;

  return {
    slots: {
      calendar: [
        ...c("root"),
        "group/calendar",
        "w-fit",
        "[--cell-size:var(--calendar-cell-size)]",
        "[--cell-radius:var(--calendar-cell-radius)]",
        "in-data-[slot=card-content]:bg-transparent",
        "in-data-[slot=popover-content]:bg-transparent",
      ],
      "calendar:months": split("relative flex flex-col gap-4 md:flex-row"),
      "calendar:nav": split("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1"),
      // Previous and next: the system's Button (buttonVariant, ghost by default), a cell square.
      "calendar:nav-button": ["size-(--cell-size)", "p-0", "select-none", `${states.navDisabled}opacity-50`],
      "calendar:chevron": split("size-4 rtl:rotate-180"),
      "calendar:chevron-down": ["size-4"],
      "calendar:month": split("flex w-full flex-col gap-4"),
      "calendar:month-caption": split("flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)"),
      "calendar:caption": caption,
      // The month and year dropdowns (with the caption's type): a native select, transparent, over its label.
      "calendar:dropdowns": split("flex h-(--cell-size) w-full items-center justify-center gap-1.5"),
      "calendar:dropdown-root": flatClasses(anatomy, "dropdown", { states: { ...NATIVE_STATES, "focus-visible": ["has-focus-visible:"] } }, ["relative"]),
      "calendar:dropdown": split("absolute inset-0 opacity-0"),
      "calendar:dropdown-label": split("flex h-8 items-center gap-1 rounded-(--cell-radius) ps-2 pe-1 [&>svg]:size-3.5 [&>svg]:opacity-60"),
      "calendar:grid": split("w-full border-collapse"),
      "calendar:weekdays": ["flex"],
      "calendar:weekday": weekday,
      "calendar:week": split("mt-2 flex w-full"),
      "calendar:week-number-header": split("w-(--cell-size) select-none"),
      "calendar:week-number-inner": split("flex size-(--cell-size) items-center justify-center text-center"),
      // A day's cell (a td), and the classes it takes in each state.
      "calendar:cell": [...split("group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none"), selectedDay("last")],
      "calendar:cell-first": [selectedDay("first")],
      "calendar:cell-first-numbered": [`[&:nth-child(2)${states.cellSelectedAttribute}_button]:rounded-s-(--cell-radius)`],
      "calendar:range-start": rangeCell("start"),
      "calendar:range-middle": ["rounded-none"],
      "calendar:range-end": rangeCell("end"),
      "calendar:today": [...c("today"), "rounded-(--cell-radius)", `${states.cellSelected}rounded-none`],
      "calendar:outside": [...c("outside"), ...c("outside", "aria-selected:")],
      "calendar:disabled": ["opacity-50"],
      "calendar:hidden": ["invisible"],
      // The day: the system's ghost icon Button, filling its cell.
      "calendar:day": day,
    },
    dayButton: { variant: "ghost", size: "icon" },
    navVariant: "ghost",
  };
}

// A framework's day cell: its classes, and each state's, under the prefixes that say the state on
// that library's cell (has-data-today: where the state is on the day inside it).
export type CalendarCellStates = {
  today: string;
  outside: string;
  disabled: string;
  // For a range calendar.
  rangeStart: string;
  rangeMiddle: string;
  rangeEnd: string;
};

export function calendarCellClasses(slots: ReturnType<typeof calendarPieces>["slots"], cell: CalendarCellStates, range: boolean): string[] {
  return [
    ...slots["calendar:cell"],
    ...slots["calendar:cell-first"],
    ...prefixed(cell.today, slots["calendar:today"]),
    ...prefixed(cell.outside, slots["calendar:outside"]),
    ...prefixed(cell.disabled, slots["calendar:disabled"]),
    ...(range ? [...prefixed(cell.rangeStart, slots["calendar:range-start"]), ...prefixed(cell.rangeMiddle, slots["calendar:range-middle"]), ...prefixed(cell.rangeEnd, slots["calendar:range-end"])] : []),
  ];
}

// Calendar as in shadcn: react-day-picker on Base UI and Radix, React Aria's Calendar and
// RangeCalendar on React Aria. Days are the system's ghost buttons; the parts say how a day looks
// when selected, in a range, today or outside the month.
export function calendarTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const aria = base === "react-aria";
    const { slots } = calendarPieces(anatomy, aria ? ARIA_CALENDAR_STATES : RDP_CALENDAR_STATES);
    const s = (slot: keyof typeof slots) => classString(slots[slot]);
    const root = slots.calendar;
    const caption = slots["calendar:caption"];
    const weekday = slots["calendar:weekday"];
    const day = slots["calendar:day"];
    const rangeCell = (edge: "start" | "end") => slots[edge === "start" ? "calendar:range-start" : "calendar:range-end"];
    const today = slots["calendar:today"];
    const outside = slots["calendar:outside"];
    const dropdown = slots["calendar:dropdown-root"];

    if (aria) return ariaCalendar({ root, caption, weekday, day, rangeCell, today, outside });

    return `import * as React from "react";
import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from "react-day-picker";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

// mode="single" | "multiple" | "range", selected / onSelect; captionLayout="dropdown" adds month
// and year pickers.
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & { buttonVariant?: React.ComponentProps<typeof Button>["variant"] }) {
  const defaultClassNames = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(${classString(root)}, className)}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{ formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: "short" }), ...formatters }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(${s("calendar:months")}, defaultClassNames.months),
        month: cn(${s("calendar:month")}, defaultClassNames.month),
        nav: cn(${s("calendar:nav")}, defaultClassNames.nav),
        button_previous: cn(buttonVariants({ variant: buttonVariant }), ${s("calendar:nav-button")}, defaultClassNames.button_previous),
        button_next: cn(buttonVariants({ variant: buttonVariant }), ${s("calendar:nav-button")}, defaultClassNames.button_next),
        month_caption: cn(${s("calendar:month-caption")}, defaultClassNames.month_caption),
        dropdowns: cn(${s("calendar:dropdowns")}, ${classString(caption)}, defaultClassNames.dropdowns),
        dropdown_root: cn(${classString(dropdown)}, defaultClassNames.dropdown_root),
        dropdown: cn(${s("calendar:dropdown")}, defaultClassNames.dropdown),
        caption_label: cn(
          ${classString(caption)},
          captionLayout === "label" ? "" : ${s("calendar:dropdown-label")},
          defaultClassNames.caption_label,
        ),
        month_grid: cn(${s("calendar:grid")}, defaultClassNames.month_grid),
        weekdays: cn(${s("calendar:weekdays")}, defaultClassNames.weekdays),
        weekday: cn(${classString(weekday)}, defaultClassNames.weekday),
        week: cn(${s("calendar:week")}, defaultClassNames.week),
        week_number_header: cn(${s("calendar:week-number-header")}, defaultClassNames.week_number_header),
        week_number: cn(${classString(weekday)}, defaultClassNames.week_number),
        day: cn(
          ${s("calendar:cell")},
          props.showWeekNumber ? ${s("calendar:cell-first-numbered")} : ${s("calendar:cell-first")},
          defaultClassNames.day,
        ),
        range_start: cn(${classString(rangeCell("start"))}, defaultClassNames.range_start),
        range_middle: cn(${s("calendar:range-middle")}, defaultClassNames.range_middle),
        range_end: cn(${classString(rangeCell("end"))}, defaultClassNames.range_end),
        today: cn(${classString(today)}, defaultClassNames.today),
        outside: cn(${classString(outside)}, defaultClassNames.outside),
        disabled: cn(${s("calendar:disabled")}, defaultClassNames.disabled),
        hidden: cn(${s("calendar:hidden")}, defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />,
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") return <ChevronLeftIcon className={cn(${s("calendar:chevron")}, className)} {...props} />;
          if (orientation === "right") return <ChevronRightIcon className={cn(${s("calendar:chevron")}, className)} {...props} />;
          return <ChevronDownIcon className={cn(${s("calendar:chevron-down")}, className)} {...props} />;
        },
        DayButton: ({ ...props }) => <CalendarDayButton locale={locale} {...props} />,
        WeekNumber: ({ children, ...props }) => (
          <td {...props}>
            <div className=${s("calendar:week-number-inner")}>{children}</div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({ className, day, modifiers, locale, ...props }: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> | undefined }) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(${classString(day)}, defaultClassNames.day, className)}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
`;
  };
}

type AriaClasses = { root: string[]; caption: string[]; weekday: string[]; day: string[]; rangeCell: (edge: "start" | "end") => string[]; today: string[]; outside: string[] };

function ariaCalendar(k: AriaClasses): string {
  return `import * as React from "react";
import { cva } from "class-variance-authority";
import {
  Calendar as CalendarPrimitive,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarHeading,
  CalendarMonthPicker,
  CalendarYearPicker,
  RangeCalendar as RangeCalendarPrimitive,
  type CalendarCellRenderProps,
  type CalendarProps,
  type DateValue,
  type RangeCalendarProps,
} from "react-aria-components";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const cellVariants = cva("group/day relative mt-2 aspect-square h-full w-full cursor-default rounded-(--cell-radius) p-0 text-center select-none [&:is(:last-child>[data-selected=true])>div]:rounded-e-(--cell-radius)", {
  variants: {
    showWeekNumber: {
      false: "[&:is(:first-child>[data-selected=true])>div]:rounded-s-(--cell-radius)",
      true: "[&:is(:nth-child(2)>[data-selected=true])>div]:rounded-s-(--cell-radius)",
    },
    isToday: { true: ${classString(k.today)} },
    isSelectionStart: { true: ${classString(k.rangeCell("start"))} },
    isSelectionEnd: { true: ${classString(k.rangeCell("end"))} },
    isUnavailable: { true: "opacity-50 [&>div]:line-through" },
    isDisabled: { true: "opacity-50" },
    isOutsideMonth: { true: ${classString(k.outside)} },
  },
});

// What React Aria's heading can show: day, month, year and era.
type HeaderFormat = {
  day?: "numeric" | "2-digit";
  month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
  year?: "numeric" | "2-digit";
  era?: "long" | "short" | "narrow";
};

type Extra = {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  captionLayout?: "label" | "dropdown";
  numberOfMonths?: number;
  showWeekNumber?: boolean;
  headerFormat?: HeaderFormat;
  renderCell?: (renderProps: CalendarCellRenderProps & { defaultChildren: React.ReactNode }) => React.ReactNode;
};

// value / defaultValue are @internationalized/date values (today(getLocalTimeZone()), parseDate("2026-09-23")).
function Calendar<T extends DateValue>({ className, ...props }: Omit<CalendarProps<T>, "visibleDuration"> & Extra) {
  return (
    <CalendarPrimitive {...props} data-slot="calendar" visibleDuration={{ months: props.numberOfMonths ?? 1 }} className={cn(${classString(k.root)}, className)}>
      <CalendarInner {...props} />
    </CalendarPrimitive>
  );
}

function RangeCalendar<T extends DateValue>({ className, ...props }: Omit<RangeCalendarProps<T>, "visibleDuration"> & Extra) {
  return (
    <RangeCalendarPrimitive {...props} data-slot="calendar" visibleDuration={{ months: props.numberOfMonths ?? 1 }} className={cn(${classString(k.root)}, className)}>
      <CalendarInner {...props} isRange />
    </RangeCalendarPrimitive>
  );
}

function CalendarInner({ captionLayout = "label", buttonVariant = "ghost", numberOfMonths = 1, showWeekNumber = false, headerFormat, renderCell, isRange = false }: Extra & { isRange?: boolean }) {
  return (
    <div className="relative flex flex-col gap-4 md:flex-row">
      <header className="absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1">
        <Button variant={buttonVariant} slot="previous" className="size-(--cell-size) p-0 select-none data-disabled:opacity-50">
          <ChevronLeftIcon className="size-4 rtl:rotate-180" />
        </Button>
        <Button variant={buttonVariant} slot="next" className="size-(--cell-size) p-0 select-none data-disabled:opacity-50">
          <ChevronRightIcon className="size-4 rtl:rotate-180" />
        </Button>
      </header>
      {Array.from({ length: numberOfMonths }, (_, i) => (
        <div key={i} className="flex w-full flex-col gap-4">
          <div className="flex h-(--cell-size) w-full items-center justify-center gap-1 px-(--cell-size)">
            {captionLayout === "dropdown" ? (
              <>
                <MonthDropdown {...(headerFormat?.month === undefined ? {} : { format: headerFormat.month })} />
                <YearDropdown {...(headerFormat === undefined ? {} : { format: headerFormat })} />
              </>
            ) : (
              <CalendarHeading offset={{ months: i }} {...(headerFormat === undefined ? {} : { format: headerFormat })} className=${classString(k.caption)} />
            )}
          </div>
          <CalendarGrid className="w-full border-collapse" offset={{ months: i }}>
            <CalendarGridHeader>{(day) => <CalendarHeaderCell className=${classString(k.weekday)}>{day}</CalendarHeaderCell>}</CalendarGridHeader>
            <CalendarGridBody>
              {(date) => (
                <CalendarCell date={date} className={(renderProps) => cellVariants({ ...renderProps, showWeekNumber })}>
                  {(renderProps) => (
                    <div
                      data-selected-single={renderProps.isSelected && !isRange}
                      data-range-start={renderProps.isSelectionStart && isRange}
                      data-range-end={renderProps.isSelectionEnd && isRange}
                      data-range-middle={renderProps.isSelected && !renderProps.isSelectionStart && !renderProps.isSelectionEnd && isRange}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), ${classString(k.day.filter((x) => x !== "size-auto"))}, "h-full")}
                    >
                      {renderCell ? renderCell(renderProps) : renderProps.defaultChildren}
                    </div>
                  )}
                </CalendarCell>
              )}
            </CalendarGridBody>
          </CalendarGrid>
        </div>
      ))}
    </div>
  );
}

function MonthDropdown({ format }: { format?: HeaderFormat["month"] }) {
  return (
    <CalendarMonthPicker {...(format === undefined ? {} : { format })}>
      {(props) => (
        <Select {...props} aria-label="Month" className="relative">
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-0">
            {props.items.map((item) => (
              <SelectItem key={item.id} id={item.id}>
                {item.formatted}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </CalendarMonthPicker>
  );
}

function YearDropdown({ format }: { format?: HeaderFormat }) {
  const yearFormat: Pick<HeaderFormat, "year" | "era"> = {};
  if (format?.year !== undefined) yearFormat.year = format.year;
  if (format?.era !== undefined) yearFormat.era = format.era;
  return (
    <CalendarYearPicker format={yearFormat}>
      {(props) => (
        <Select {...props} aria-label="Year" className="relative">
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="min-w-0">
            {props.items.map((item) => (
              <SelectItem key={item.id} id={item.id}>
                {item.formatted}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </CalendarYearPicker>
  );
}

export { Calendar, RangeCalendar };
`;
}
