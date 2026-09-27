---
name: tesserai
description: Build and change UI with the project's tesserai design system. Use when a project has tesserai/design-system.json, when writing or reviewing components, forms or pages in it, when asked to change colors, type, spacing, radius or a component's look, or when a project needs a design system of its own.
---

# tesserai

The project's UI components are generated from a design system in `tesserai/design-system.json`. The tesserai MCP server reads it. Use the MCP tools rather than guessing from the generated files.

## Building UI

1. Call `outline` first: palettes, meanings (intents), surfaces, type, spacing, radius, and every component with its parts and options. If it says the design changed since the last sync, call `sync` before writing code.
2. Build from the components in `components/ui`. `component_guide` gives each one's import, props and an example; `example_page` gives whole forms and pages written with them. Don't hand-style raw elements where a component exists.
3. Use the system's theme utilities (`bg-primary-solid`, `bg-neutral-subtle`, the spacing and radius scale), never raw values like `#3b82f6` or `rounded-[7px]`. If the outline mentions a class prefix, every class takes it.

## Changing how things look

Change the design system, not the generated files: `list_operations` shows what can change, `describe_operation` gives an operation's input, and `apply_changes` applies it and regenerates the components. Edits made to generated files by hand are kept by `sync`, but they drift from the system.

`apply_changes` reports which design guidelines a change runs into (contrast, touch targets, platform conventions). Pass those on to the person rather than dropping them. `check_contrast` lists failing color pairs with fixes; `guidelines` has the rules themselves.

## Checking a project

`scan` shows how the app uses the system: each component's uses, what's never used, overrides that restyle components, the same override repeated (a change to make in the system), and hard-coded values. Offer its suggestions as changes to the system.

## No design system yet

- The person designed one at [tesserai.design](https://tesserai.design): `npx @tesserai/cli init <link or bundle>` installs it.
- The project already has a look of its own (Tailwind theme, CSS variables, a theme object): read it, then call `import_design_system` with the tokens you found, each with the file and line it came from.
