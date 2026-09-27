// Kept independent of the application graph so help is available immediately.
export const USAGE = `tesserai <command>

  init <bundle.json | share link>
                       install a design system into the current project. A share link
                       (https://…/s/…) is remembered, so sync pulls its latest version
      --dir <path>     project directory (default: .)
      --base <name>    primitive base: base-ui, radix, react-aria (default: the bundle's own base)
      --no-install     write files but do not install dependencies
      --no-lint        skip the @shadcn/lint config, lint script and its dev dependencies
      --prefix <name>  write every Tailwind class with a prefix (acme → acme:bg-primary), adding
                       prefix(<name>) to the stylesheet's Tailwind import; --prefix none for none

  sync [bundle.json | share link]
                       regenerate from tesserai/design-system.json, after pulling the latest
                       version of the share link the project follows (or adopt a new bundle)
      --dir <path>     project directory (default: .)
      --force          overwrite files you changed locally (otherwise they are kept and
                       the new version is written beside them as .tesserai-new)
      --json           print the full result as JSON (progress goes to stderr)
      --verbose        print the diff for every kept file
      --dry-run        show what would change, and write nothing
      --no-install     don't install packages new components need (it says which instead)
      --live           for a system with releases, take what's current instead of the
                       latest release (init takes it too)

  login [host]         sign in, for systems kept privately in an account
                       (https://…/systems/…); host defaults to https://tesserai.design
  logout [host]        sign out and forget the saved token

  export <format>      the project's system for another stack: scss, ts, panda, stylex, mui, mantine, chakra, antd, swift, kotlin, dart
      --out <file>     write it to a file (default: print it)
      --brand <id>     one of the system's brands (default: the shared system)
      --dir <path>     project directory (default: .)

  storybook            a Storybook for the design system: a story per component, light/dark
                       and density toolbars, accessibility checks; sync keeps it current
      --dir <path>     project directory (default: .)
      --no-install     write files but do not install Storybook

  scan                 what the app uses of its design system, an adoption score, and values
                       that bypass it
      --json           the full result as JSON
      --fix            rewrite hard-coded values that exactly match the system to its own
      --dir <path>     project directory (default: .)

  import [dir]         bring this project's look into tesserai as a new system: colors (light
                       and dark), fonts, text size, corners, spacing and shadows, from its
                       stylesheets, token files and Tailwind config. Says what it found and where,
                       what it filled in, and what it left out; never changes the project
      --dry-run        only print what it finds
      --name <name>    the system's name (default: from package.json)
      --out <file>     write the system to a .tesserai.json file instead of opening it
      --measure <url>  also measure the running app (http://localhost:3000) for what the code
                       doesn't define, like colors computed at runtime; needs Chrome or Edge
      --into <link>    update a system imported before (its link, from Share or Install): what
                       the code changed since, one change at a time to take or leave (Pro)
      --json           the report as JSON

  doctor               check the project, system, manifest, source link and unresolved edits
      --json           diagnostics as JSON; exits 1 if a check fails, 0 otherwise
      --dir <path>     project directory (default: .)

  mcp                  serve this project's design system to coding agents (MCP, over stdio):
                       claude mcp add tesserai -- npx @tesserai/cli mcp
      --dir <path>     project directory (default: .)
`;

