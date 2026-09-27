# Import benchmark

Measures how well tesserai brings an existing design system in (docs/import-plan.md): the same
16 projects through each way of importing, graded against answer keys written with each
project.

```sh
pnpm import:bench                          # today's Import dialog (baseline) and the direct CLI route
pnpm import:bench --route measure          # a running app's rendered styles (free, needs Chrome)
pnpm import:bench --route agent --yes      # the coding-agent route: calls a paid model, see Cost
pnpm import:bench --only d6,a1 --label try # some fixtures; results saved to results/try.json
```

`grade.test.ts` checks the grader itself, and runs in the normal test suite: a perfect import has to
score near 100, and every kind of mistake has to cost what it should. `import.bench.test.ts` holds
the free routes to their targets, so a regression fails the gate.

## The projects

| | Route it needs | What's hard |
| --- | --- | --- |
| d1 shadcn v4 | direct | oklch, a translucent dark border, fonts only in `next/font` |
| d2 shadcn v3 | direct | bare HSL channels, the font in `tailwind.config.js` |
| d3 DTCG from Figma | direct | 2025.10 color objects and `{value, unit}` sizes, aliases |
| d4 Tokens Studio | direct | its own names (bg, text, accent, line), light and dark in separate files |
| d5 Tailwind v4 `@theme` | direct | scales only: which step is primary comes from how components use it |
| d6 monorepo | direct | four other themes in the tree; the app's is the one its layout imports |
| a1 antd v5 | agent | dark comes from antd's algorithm; a leftover v4 Less theme |
| a2 MUI v5 | agent | values picked per mode by a ternary; `alpha()`; spacing 8 |
| a3 Chakra v2 | agent | needs Chakra's own rules (solid buttons are 500 in light, 200 in dark) |
| a4 Tailwind v3 | agent | RGB-channel variables; the primary is a literal in the JS config |
| a5 Sass + Bootstrap | agent | `$primary: $purple`; Bootstrap's defaults in node_modules |
| a6 styled-components | agent | two hops, from the theme object to the palette object |
| a7 homegrown | agent | no theme at all: constants, inline styles, pill buttons |
| a8 CSS variables | agent | names like `--clr-line` only mean something from how they're used |
| m1 computed at runtime | measure | no color appears literally in the code |
| m2 legacy static CSS | measure | no variables; meaning comes from where each value is used |

Each `truth.json` lists the look the project really shows (colors per role in light and dark,
fonts, base text size, corners, spacing), what it doesn't define (`absent`), and the colors in the
tree that aren't its look (`decoys`). Library defaults the code doesn't state (antd's white button
text) count as absent: an import is right to fill them in, and wrong to say it found them.

## The scores

Every dimension is scored on its own; the headline mixes them.

- **accuracy**: each color role, light and dark, scored by how different it looks (CIEDE2000):
  full marks under ΔE 1, nothing from ΔE 10. Translucent colors are compared as they show on
  the page. Fonts by family name; text size, corners and spacing by value (within 0.5px).
- **trust**: for routes that report what they found:
  - **recall**: how much of what the project defines, the report says it found;
  - **precision**: none of what it says it found is something the project doesn't define, or a
    decoy;
  - **evidence**: each found value cites a `file:line` that exists and really holds the value.
  - trust = 0.4 recall + 0.4 precision + 0.2 evidence.
- **decoys**: the result's primary or background looks like a theme that isn't the app's.
- **usable**: button text and body text are at least 4.5:1, or no worse than the original had
  them (a faithful copy of a theme that fails isn't the import's fault).
- **score** = 0.6 accuracy + 0.3 trust + 0.1 usable − 0.2 per decoy.

## Targets

| Route | Fixtures | Target |
| --- | --- | --- |
| baseline (today) | all | measured 2026-09-26: **20** (5 of 16 importable) |
| direct (v1) | d1–d6 | score ≥ 90, accuracy ≥ 95, no decoys |
| direct (v1) | a, m | precision 100: nothing claimed that isn't there (it should say what it couldn't read) |
| agent (v1) | a1–a8 | score ≥ 85, precision ≥ 95, evidence ≥ 90, no decoys, median cost ≤ $0.50, ≤ 3 min |
| measure (v3) | m1–m2 | score ≥ 85 |
| best route | all 16 | ≥ 80 on every project: the headline for "is this viable" |

## Held-out sets, and the honest scores

The 16 fixtures were written alongside the importer, so their scores flatter it. Three more sets
were written by agents that never saw the importer's code. Each is scored once, unseen; that
number is the honest one. After their failures are read (for general causes only, never a special
case), a set counts as seen.

| Set | Direct route, unseen | Baseline | After reading its failures |
| --- | --- | --- | --- |
| fixtures (16, tuned on) | – | 20 | 72 |
| holdout (8), 2026-09-26 | **43** | 13 | 59 |
| holdout2 (10), 2026-09-26 | **36** (49 on its 5 direct projects) | 9 | 55 |
| holdout3 (12), 2026-09-26 | **46** (62 on its 8 direct projects) | 11 | 50 |

The agent route, on the same sets: fixtures 93, holdout 94, holdout2 87 unseen, holdout3 65 unseen
($12.92 for all of it).

Every false claim the held-out sets found came from a general cause, now fixed, with precision
100 and no false claims on all 46 projects: a vendored theme (Django's `staticfiles/`, Hugo's
`themes/`); a scale's own step read as a role (`--teal-surface`); a component's variable read as
a global one (`$navbar-background-color`); a variable the page is painted with read by its name
(`$paper` as a card, where `body` paints with it, directly or through an alias); a transparent
value taken as a color. The next honest number needs a fourth set.

## Cost

The agent route runs Claude Code headless in each project, with tesserai's MCP server, and asks
it to import the design system. An earlier study of the same shape cost about $0.50 a session:
8 fixtures × 1 run ≈ $4, and ×2 runs for stability ≈ $8. It never runs without `--yes`.

## After launch

The benchmark says whether imports are right. PostHog says whether they're worth it:

- `import_started` → `import_completed`: does it finish? (target 80%)
- found ÷ (found + filled) on completed imports: how much of a look comes across.
- `import_opened` within 10 minutes: do people look at the result? (target 70%)
- edits in that first session: is it a starting point people use? (target 50%)
- `import_feedback` (the Imported dialog's "Is this right?"): accuracy as people judge it.
- Pro within 30 days, importers against everyone who signs up: the business case (target 1.5×).
