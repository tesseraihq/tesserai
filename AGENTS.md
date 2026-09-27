# AGENTS.md

Rules for every agent (and person) working in this repository.

## Testing

- If you test something in isolation, first write down all the ways it could fail, then write the code. Those lists live at the top of the files they cover, under "Ways it could go wrong, written before the code".
- Prefer tests that exercise the real thing end to end: the CLI run as a subprocess, generated components compiled by the real framework compilers (the Vue and Svelte fixtures), the MCP server over its real transport.
- `pnpm verify` (tests, then types) must pass before a change is merged.
