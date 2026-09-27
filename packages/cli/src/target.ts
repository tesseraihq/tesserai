import { FRAMEWORK_INFO, frameworkOf, type Base, type DesignSystem, type Framework } from "@tesserai/core";
import { targetFor, targetFramework, type Target } from "@tesserai/templates";
import type { Project } from "./detect";
import { env } from "./env";

const NAMES: Record<Framework, string> = { react: "React", vue: "Vue", svelte: "Svelte" };

// Frameworks tesserai writes components for from the command line: the ones the builder offers
// (their status isn't "soon"), and any named in TESSERAI_FRAMEWORKS (tests, early testers). A Vue or
// Svelte project before then is told plainly instead of getting half a component set.
export function writesFramework(framework: Framework): boolean {
  return FRAMEWORK_INFO[framework].status !== "soon" || (env("FRAMEWORKS") ?? "").split(",").includes(framework);
}

export class TargetError extends Error {}

// What init writes into a project: the project's own framework decides (React code in a Vue app is
// never right); the system's framework only decides for an empty folder. Within React, the
// system's library, or --base.
export function chooseTarget(project: Pick<Project, "ui" | "svelteMajor">, system: DesignSystem, override?: Base, writes: (f: Framework) => boolean = writesFramework): { target: Target; note: string | null } {
  const framework: Framework = project.ui === "unknown" ? frameworkOf(system) : project.ui;
  if (framework === "svelte" && project.svelteMajor !== undefined && project.svelteMajor < 5) {
    throw new TargetError(`this project is on Svelte ${project.svelteMajor}; tesserai writes Svelte 5 components. Upgrade with npx sv migrate svelte-5, then run init again`);
  }
  if (framework !== "react" && override !== undefined) throw new TargetError(`--base chooses a React library, and this project is ${NAMES[framework]}`);
  if (!writes(framework)) throw new TargetError(`tesserai doesn't write ${NAMES[framework]} components yet; they're coming soon`);
  const target = targetFor(framework, override ?? system.base);
  const shown = frameworkOf(system);
  const note = project.ui !== "unknown" && shown !== framework ? `this system's code is shown in ${NAMES[shown]}; this project is ${NAMES[framework]}, so it gets ${NAMES[framework]} components (they look the same)` : null;
  return { target, note };
}

// What sync writes: the framework the project was installed with, always; within React, the
// system's library (switching it in the builder switches the project's components).
export function syncTarget(installed: Target, system: DesignSystem): { target: Target; note: string | null } {
  const framework = targetFramework(installed);
  const target = framework === "react" ? system.base : installed;
  const shown = frameworkOf(system);
  return { target, note: shown !== framework ? `this system's code is shown in ${NAMES[shown]}; this project stays ${NAMES[framework]}` : null };
}
