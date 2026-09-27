# Contributing

Thanks for helping. This repository holds the parts of tesserai that run inside your project: the token engine (`packages/core`), the component templates for React, Vue and Svelte (`packages/templates`), and the CLI with its MCP server (`packages/cli`). The hosted builder at [tesserai.design](https://tesserai.design) is a separate, closed product built on these packages.

## Setup

Node.js 22 or newer and pnpm 10.

```sh
pnpm install
pnpm build        # the CLI, used by the subprocess and MCP tests
pnpm verify       # tests, then types
pnpm cli:check    # packs the CLI as npm would, installs it offline, runs init, doctor and MCP
```

The Svelte fixture's browser checks need Chromium once: `pnpm --filter @tesserai/svelte-fixture exec playwright install chromium`.

## Where things live

| Path | What |
| --- | --- |
| `packages/core` | The design-system model (DTCG tokens, OKLCH color), generators, operations, contrast and guideline checks, emitters for CSS and other platforms |
| `packages/templates` | One file per component per library: Base UI, Radix and React Aria for React, Reka UI for Vue, Bits UI for Svelte |
| `packages/cli` | `init`, `sync`, `scan`, `doctor`, `export`, `storybook`, `import` and the MCP server |
| `packages/vue-fixture`, `packages/svelte-fixture` | Real projects that compile every generated component, to prove the templates |

## Pull requests

- Keep a change to one thing, with a test that fails without it.
- Follow [AGENTS.md](AGENTS.md): write down how a piece could fail before writing it.
- Components: a change to one library's template usually belongs in the others too.
- This repository is exported from tesserai's main repository, where the same code is used by the builder. A merged pull request is applied there and comes back here with the next export, credited to you. That can mean your commit arrives squashed; the credit stays.

## Reporting a security issue

Please don't open a public issue. Use GitHub's private vulnerability reporting on this repository.

## License

By contributing you agree that your contribution is licensed under the [MIT License](LICENSE). The "tesserai" name and logo are covered by [TRADEMARK.md](TRADEMARK.md), not the MIT License.
