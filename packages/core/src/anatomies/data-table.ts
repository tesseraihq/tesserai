import { Anatomy } from "../components";

// TanStack Table on the system's Table, Button, Input and Checkbox: sortable columns, a filter,
// row selection and pages. Its own parts are the space around the table.
export const dataTable = Anatomy.parse({
  name: "data-table",
  parts: ["root", "toolbar", "footer", "empty"],
  states: [],
  axes: {},
  tokens: {},
  base: {
    root: { base: { gap: "{space.5}" } },
    toolbar: { base: { gap: "{space.3}" } },
    footer: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.2}", gap: "{space.3}" } },
    empty: { base: { foreground: "{intent.neutral.text}", height: "{space.9}" } },
  },
  sizes: {},
  variants: {},
});
