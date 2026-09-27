import type { z } from "zod";
import type { DesignSystem } from "../system";

// An operation is the unit every change to a design system is made of, whether it comes from a
// slider, a CLI command or an AI model: a name, a schema for its input, a pure edit, and a plain
// sentence describing what it did. Models see `summary` and the input schema; people see `describe`.
export type OpGroup = "system" | "palette" | "intent" | "surface" | "type" | "spacing" | "shape" | "token" | "component" | "page" | "icon" | "font" | "brand";

export type OpDef<S extends z.ZodType = z.ZodType> = {
  name: string;
  group: OpGroup;
  // What the operation does, written for a model choosing between operations.
  summary: string;
  input: S;
  // Edits the system in place. Throws OpError with a reason a person or a model can act on.
  apply: (system: DesignSystem, input: z.infer<S>) => void;
  describe: (input: z.infer<S>) => string;
  // Left out of the manifest models see, for an operation whose input needs checks core can't
  // make (a page's elements are checked against the page catalog); the AI has its own tool for it.
  unlisted?: boolean;
};

export class OpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpError";
  }
}

export function defineOp<S extends z.ZodType>(def: OpDef<S>): OpDef<S> {
  return def;
}

// The catalog's uniform shape: input arrives unchecked (from a model, a file, a request) and is
// parsed by the operation's own schema before its edit runs.
export type AnyOp = {
  name: string;
  group: OpGroup;
  summary: string;
  input: z.ZodType;
  run: (system: DesignSystem, input: unknown) => string;
  unlisted?: boolean;
};

export function erase<S extends z.ZodType>(op: OpDef<S>): AnyOp {
  return {
    name: op.name,
    group: op.group,
    summary: op.summary,
    input: op.input,
    ...(op.unlisted ? { unlisted: true } : {}),
    run: (system, raw) => {
      const parsed = op.input.safeParse(raw);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        throw new OpError(`${op.name}: ${issue === undefined ? "invalid input" : `${issue.path.join(".") || "input"} ${issue.message}`}`);
      }
      op.apply(system, parsed.data);
      return op.describe(parsed.data);
    },
  };
}
