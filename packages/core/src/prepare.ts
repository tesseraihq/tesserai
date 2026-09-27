import { rebuild } from "./ops/brands";
import { validateSystem } from "./ops/changeset";
import { addMissingComponents, upgradeComponents, type DesignSystem } from "./system";

// The one way a system from anywhere is made ready to use: opened from a save, imported from a
// file, restored from a version, applied from a proposal, pulled by the CLI, served by the Worker,
// or produced by an undo. It gets the components this version ships that it predates (switched
// off), the parts and tokens today's templates need for the ones it has, its generated tokens and
// brands rebuilt, and then the same check every edit passes. A copy; the input isn't changed.
export type Prepared = {
  system: DesignSystem;
  // Components added (left out) because the system predates them.
  added: string[];
  // What would make it unusable; empty when it's sound.
  problems: string[];
};

export function prepareSystem(input: DesignSystem): Prepared {
  const system = JSON.parse(JSON.stringify(input)) as DesignSystem;
  const added = addMissingComponents(system);
  upgradeComponents(system);
  try {
    rebuild(system);
  } catch (e) {
    // A system too broken to rebuild (a meaning reading a palette that isn't there) says why.
    return { system, added, problems: [e instanceof Error ? e.message : String(e)] };
  }
  return { system, added, problems: validateSystem(system) };
}
