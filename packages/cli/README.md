# @tesserai/cli

Install a [tesserai](https://tesserai.design) design system into your project as components you own. Keep it current from your terminal. Give your coding agent the same tokens, components and rules through MCP.

Needs Node.js 22 or newer and Tailwind CSS 4. React works with Base UI, Radix or React Aria, Vue with Reka UI, and Svelte 5 with Bits UI.

## Start

Design a system at [tesserai.design](https://tesserai.design) and download it; that needs no account. Or share it from your account, and install it by its link, which `sync` then follows:

```sh
npx @tesserai/cli init ./acme.tesserai.json
npx @tesserai/cli init https://tesserai.design/s/AbCdEf123456 --dir ./apps/web
```

`init` writes the components, the theme CSS and `tesserai/design-system.json` into your project. It adds the CLI as a dev dependency. It also registers the MCP server for Claude Code in `.mcp.json`, and for Cursor in `.cursor/mcp.json` when the project uses Cursor.

## Commands

| Command | What it does |
| --- | --- |
| `init <link or bundle>` | Install a system into the project |
| `sync [link or bundle]` | Pull the latest version and regenerate. Files you changed are kept, with the new version written beside them. `--dry-run` shows the plan |
| `scan` | How the app uses its system: each component's uses and options (most used first), components and options never used, overrides (`className`, `style`, `sx` restyling a component, by what they change), the same override repeated (a change to make in the system), generated files edited by hand, an adoption score, and values that bypass the system. `--fix` replaces exact matches; `--upload` keeps the scan with its system in the builder (Pro) |
| `doctor` | Check the project, the system, the manifest and the source link |
| `export <format>` | The system for another stack: scss, ts, panda, stylex, mui, mantine, chakra, swift, kotlin, dart |
| `storybook` | A Storybook with a story per component, light and dark, and accessibility checks |
| `mcp` | Serve the system to coding agents over stdio |
| `login` / `logout` | Sign in for systems kept privately in an account |

Run `npx @tesserai/cli <command> --help` for the options.

## For coding agents

`init` registers the server for you. To add it by hand:

```sh
claude mcp add tesserai -- npx -y @tesserai/cli mcp
```

The agent can then read the system's outline, tokens, components, contrast checks and design guidelines. It can also apply changes that stay inside the system.

## License

MIT. The components and CSS the CLI writes into your project are yours to use however you like.
