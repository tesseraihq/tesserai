import type { Anatomy, Base } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

// DatePicker's classes, which every framework's shell prints from: its trigger, the system's
// outline Button showing the date (or, while empty, the placeholder's color: data-empty="true"),
// the date's text, and the popover the calendar opens in. The text is a span that ends in an
// ellipsis when the trigger is narrower than the date (a long range), with the whole date in its
// title; the trigger never widens to fit a particular date.
export function datePickerPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  return {
    slots: {
      "date-picker": [
        // The trigger is the Button at its default size: a wrapped date grows it from that height.
        ...flatClasses(anatomy, "trigger", { states, label: { height: "--button-height-md" } }),
        "justify-between",
        "text-start",
        "font-normal",
        ...flatClasses(anatomy, "placeholder", { states, prefix: "data-[empty=true]:" }),
      ],
      "date-picker:label": ["min-w-0", "truncate"],
      "date-picker:popover": ["w-auto", "p-0"],
    },
    trigger: { variant: "outline" },
    // A range shows two months.
    rangeMonths: 2,
  };
}

// DatePicker and DateRangePicker: the system's Button opens its Calendar in its Popover, as in
// shadcn's date picker examples, and closes once a date (or both ends of a range) is chosen.
export function datePickerTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots } = datePickerPieces(anatomy);
    const trigger = classString(slots["date-picker"]);
    const popover = classString(slots["date-picker:popover"]);
    const textClasses = classString(slots["date-picker:label"]);

    if (base === "react-aria") {
      return `import * as React from "react";
import { getLocalTimeZone, type DateValue } from "@internationalized/date";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar, RangeCalendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger } from "@/components/ui/popover";

const label = (value: DateValue) => value.toDate(getLocalTimeZone()).toLocaleDateString(undefined, { dateStyle: "long" });

// value / defaultValue are @internationalized/date values, as on React Aria's Calendar.
function DatePicker({
  value,
  defaultValue,
  onChange,
  placeholder = "Pick a date",
  className,
}: { value?: DateValue | null; defaultValue?: DateValue | null; onChange?: (value: DateValue | null) => void; placeholder?: string; className?: string }) {
  const [own, setOwn] = React.useState<DateValue | null>(defaultValue ?? null);
  const [open, setOpen] = React.useState(false);
  const current = value === undefined ? own : value;
  const text = current ? label(current) : undefined;
  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button data-slot="date-picker" variant="outline" data-empty={current === null} className={cn(${trigger}, className)}>
        <span title={text} className=${textClasses}>{text ?? placeholder}</span>
        <CalendarIcon data-icon="inline-end" />
      </Button>
      <Popover className=${popover} placement="bottom start">
        <Calendar
          aria-label={placeholder}
          value={current}
          onChange={(next: DateValue) => {
            setOwn(next);
            onChange?.(next);
            setOpen(false);
          }}
        />
      </Popover>
    </PopoverTrigger>
  );
}

type Range = { start: DateValue; end: DateValue };

function DateRangePicker({
  value,
  defaultValue,
  onChange,
  placeholder = "Pick dates",
  className,
}: { value?: Range | null; defaultValue?: Range | null; onChange?: (value: Range | null) => void; placeholder?: string; className?: string }) {
  const [own, setOwn] = React.useState<Range | null>(defaultValue ?? null);
  const [open, setOpen] = React.useState(false);
  const current = value === undefined ? own : value;
  const text = current ? \`\${label(current.start)} – \${label(current.end)}\` : undefined;
  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <Button data-slot="date-picker" variant="outline" data-empty={current === null} className={cn(${trigger}, className)}>
        <span title={text} className=${textClasses}>{text ?? placeholder}</span>
        <CalendarIcon data-icon="inline-end" />
      </Button>
      <Popover className=${popover} placement="bottom start">
        <RangeCalendar
          aria-label={placeholder}
          numberOfMonths={2}
          value={current}
          onChange={(next: Range) => {
            setOwn(next);
            onChange?.(next);
            setOpen(false);
          }}
        />
      </Popover>
    </PopoverTrigger>
  );
}

export { DatePicker, DateRangePicker };
`;
    }

    const triggerOpen =
      base === "base-ui"
        ? (inner: string) => `<PopoverTrigger render={<Button data-slot="date-picker" variant="outline" data-empty={__EMPTY__} className={cn(${trigger}, className)} />}>
        ${inner}
      </PopoverTrigger>`
        : (inner: string) => `<PopoverTrigger asChild>
        <Button data-slot="date-picker" variant="outline" data-empty={__EMPTY__} className={cn(${trigger}, className)}>
          ${inner}
        </Button>
      </PopoverTrigger>`;
    const single = triggerOpen(`<span title={text} className=${textClasses}>{text ?? placeholder}</span>
        <CalendarIcon data-icon="inline-end" />`).replace("__EMPTY__", "current === undefined");
    const range = triggerOpen(`<span title={text} className=${textClasses}>{text ?? placeholder}</span>
        <CalendarIcon data-icon="inline-end" />`).replace("__EMPTY__", "current?.from === undefined");

    return `import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const label = (date: Date) => date.toLocaleDateString(undefined, { dateStyle: "long" });

function DatePicker({
  value,
  defaultValue,
  onChange,
  placeholder = "Pick a date",
  className,
}: { value?: Date | undefined; defaultValue?: Date; onChange?: (value: Date | undefined) => void; placeholder?: string; className?: string }) {
  const [own, setOwn] = React.useState<Date | undefined>(defaultValue);
  const [open, setOpen] = React.useState(false);
  const current = value === undefined ? own : value;
  const text = current ? label(current) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      ${single}
      <PopoverContent className=${popover} align="start">
        <Calendar
          mode="single"
          {...(current === undefined ? {} : { selected: current, defaultMonth: current })}
          onSelect={(next) => {
            setOwn(next);
            onChange?.(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

// Closes once both ends are chosen.
function DateRangePicker({
  value,
  defaultValue,
  onChange,
  placeholder = "Pick dates",
  className,
}: { value?: DateRange | undefined; defaultValue?: DateRange; onChange?: (value: DateRange | undefined) => void; placeholder?: string; className?: string }) {
  const [own, setOwn] = React.useState<DateRange | undefined>(defaultValue);
  const [open, setOpen] = React.useState(false);
  const current = value === undefined ? own : value;
  const text = current?.from ? (current.to ? \`\${label(current.from)} – \${label(current.to)}\` : label(current.from)) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      ${range}
      <PopoverContent className=${popover} align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          {...(current === undefined ? {} : { selected: current })}
          {...(current?.from === undefined ? {} : { defaultMonth: current.from })}
          onSelect={(next) => {
            setOwn(next);
            onChange?.(next);
            if (next?.from && next.to && next.from.getTime() !== next.to.getTime()) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker, DateRangePicker };
`;
  };
}
