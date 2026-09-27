import { Window } from "happy-dom";

// Calendar parity by meaning. React's calendar is react-day-picker's; Reka's (and Bits') mark a
// day's state with attributes of their own, so the same class is written behind another state
// prefix (data-[selected-single=true]: there, data-selected: here), and a state react-day-picker
// puts on the cell as a class list (today's) is a prefix on the cell here (has-data-today:). So
// the calendars are compared by what applies: each part's classes with their state prefixes
// resolved against the element as rendered (kept if the state holds, dropped if not), merged as
// cn merges them, part by part.

// Variants that say the same thing in both, written differently, each with why.
export const EQUIVALENT_VARIANTS: Record<string, { as: string; why: string }> = {
  "group-data-[focused=true]/day": {
    as: "focus-visible",
    why: "react-day-picker marks the cell of the day that has keyboard focus data-focused; Reka's and Bits' days are the focused buttons themselves",
  },
};
// Attribute selectors inside arbitrary variants ([&:last-child[data-selected=true]_button]:) that
// select the same cells.
export const EQUIVALENT_SELECTORS: Record<string, { as: string; why: string }> = {
  "[data-selected=true]": {
    as: "[aria-selected=true]",
    why: "a cell holding a selected day: react-day-picker says data-selected=true, Reka and Bits (and react-day-picker too) aria-selected=true",
  },
};

// Splits a class into its variants and utility, at colons outside brackets and parentheses.
function parts(token: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i++) {
    const ch = token[i];
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (ch === ":" && depth === 0) {
      out.push(token.slice(start, i));
      start = i + 1;
    }
  }
  out.push(token.slice(start));
  return out;
}

const attribute = (el: Element, name: string) => el.getAttribute(name);

// Whether a state variant holds on an element: true or false; undefined for a variant that isn't
// about the element's state (hover:, focus-visible:, after:, md:, an arbitrary selector…).
function holds(variant: string, el: Element): boolean | undefined {
  if (variant.startsWith("not-")) {
    const inner = holds(variant.slice(4), el);
    return inner === undefined ? undefined : !inner;
  }
  if (variant.startsWith("has-")) {
    const inner = variant.slice(4);
    return [...el.querySelectorAll("*")].some((d) => holds(inner, d) === true);
  }
  const group = /^group-(.+)\/(\w+)$/.exec(variant);
  if (group) {
    let at = el.parentElement;
    while (at !== null && !(at.getAttribute("class") ?? "").split(/\s+/).includes(`group/${group[2]}`)) at = at.parentElement;
    return at === null ? false : holds(group[1]!, at);
  }
  const data = /^data-\[([a-z-]+)=([^\]]+)\]$/.exec(variant);
  if (data) return attribute(el, `data-${data[1]}`) === data[2];
  const bare = /^data-([a-z-]+)$/.exec(variant);
  if (bare) return el.hasAttribute(`data-${bare[1]}`);
  const aria = /^aria-(selected|disabled)$/.exec(variant);
  if (aria) return attribute(el, `aria-${aria[1]}`) === "true";
  return undefined;
}

// The classes that apply to an element: state prefixes resolved, react-day-picker's own rdp-*
// class names (for its stylesheet, which isn't used) dropped, merged by the project's cn.
export function applied(el: Element, cn: (...classes: string[]) => string): string[] {
  const kept: string[] = [];
  for (const token of (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean)) {
    if (token.startsWith("rdp-")) continue;
    const list = parts(token);
    const utility = list.pop()!;
    let dropped = false;
    const variants: string[] = [];
    for (const raw of list) {
      let variant = EQUIVALENT_VARIANTS[raw]?.as ?? raw;
      for (const [from, to] of Object.entries(EQUIVALENT_SELECTORS)) variant = variant.replaceAll(from, to.as);
      const state = holds(variant, el);
      if (state === false) dropped = true;
      else if (state === undefined) variants.push(variant);
    }
    if (!dropped) kept.push([...variants, utility].join(":"));
  }
  return cn(...kept).split(/\s+/).filter(Boolean).sort();
}

export type Part = { name: string; el: Element | null };

// The parts of a rendered calendar, found the same way in each (react-day-picker's DOM, which the
// Reka and Bits calendars are laid out after): root, months, nav and its buttons, the first month
// and its caption, the grid, a weekday, a week, and the cells and days of the given dates (ISO).
export function calendarParts(root: Element, dates: Record<string, string>): Part[] {
  // Reka's range calendar puts a visually hidden heading first (for screen readers): months is the nav's parent.
  const nav = root.querySelector("nav");
  const months = nav?.parentElement ?? null;
  const month = months?.children[1] ?? null;
  const caption = month?.firstElementChild ?? null;
  const dropdowns = caption?.querySelector("div") ?? null;
  const out: Part[] = [
    { name: "root", el: root },
    { name: "months", el: months },
    { name: "nav", el: nav },
    { name: "previous", el: nav?.children[0] ?? null },
    { name: "next", el: nav?.children[1] ?? null },
    { name: "chevron", el: nav?.querySelector("svg") ?? null },
    { name: "month", el: month },
    { name: "month caption", el: caption },
    { name: "grid", el: root.querySelector("table") },
    { name: "weekdays", el: root.querySelector("thead tr") },
    { name: "weekday", el: root.querySelector("thead th") },
    { name: "week", el: root.querySelector("tbody tr") },
  ];
  if (dropdowns === null) out.push({ name: "caption", el: caption?.firstElementChild ?? null });
  else
    out.push(
      { name: "dropdowns", el: dropdowns },
      { name: "dropdown root", el: dropdowns.querySelector("span") },
      { name: "dropdown", el: dropdowns.querySelector("select") },
      { name: "dropdown label", el: dropdowns.querySelector("span > span") },
      { name: "dropdown chevron", el: dropdowns.querySelector("svg") },
    );
  for (const [name, iso] of Object.entries(dates)) {
    // react-day-picker writes the cell's date (data-day); Reka and Bits the day's (data-value).
    const cell = root.querySelector(`td[data-day="${iso}"]`) ?? root.querySelector(`button[data-value="${iso}"]`)?.closest("td") ?? null;
    out.push({ name: `${name} cell`, el: cell }, { name: `${name} day`, el: cell?.querySelector("button") ?? null });
  }
  return out;
}

// Each part's applied classes, and its text where it's short (a caption, a weekday, a day).
export function describe(html: string, dates: Record<string, string>, cn: (...classes: string[]) => string) {
  const window = new Window();
  window.document.body.innerHTML = html;
  const root = window.document.querySelector("[data-slot=calendar]") as unknown as Element;
  const out = calendarParts(root, dates).map(({ name, el }) => {
    const text = (el?.textContent ?? "").replace(/\s+/g, "");
    return { name, tag: el?.tagName.toLowerCase() ?? null, classes: el === null ? null : applied(el, cn), ...(text.length <= 16 && !["nav", "months", "month", "grid", "week", "weekdays"].includes(name) ? { text } : {}) };
  });
  void window.happyDOM.close();
  return out;
}

// The dates the calendars are rendered around: this month (today is marked by each library from
// the clock), a selected day that isn't today, a range of four days from it, and a plain day.
export function scenario(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const pick = now.getDate() === 15 || now.getDate() === 16 ? 5 : 15;
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const first = new Date(y, m, 1);
  // The grid's first cell: the Sunday on or before the 1st (outside the month unless the 1st is a Sunday).
  const lead = new Date(y, m, 1 - first.getDay());
  const selected = new Date(y, m, pick);
  const end = new Date(y, m, pick + 3);
  const plain = new Date(y, m, pick + 6);
  return {
    today: now,
    selected,
    end,
    dates: { first: iso(lead), today: iso(now), selected: iso(selected), middle: iso(new Date(y, m, pick + 1)), end: iso(end), plain: iso(plain) },
    iso,
  };
}
