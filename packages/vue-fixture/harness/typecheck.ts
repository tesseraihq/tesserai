import { proxyCreateProgram } from "@volar/typescript";
import * as vue from "@vue/language-core";
import { writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

export type Diagnostic = { file: string; line: number; code: number; message: string };

const ENTRY = "vue-tsc-entry.ts";

// vue-tsc, in process: the TypeScript program vue-tsc builds (Vue's language plugin teaches it
// .vue files), over a run folder's tsconfig. Diagnostics point into the .vue source, with paths
// relative to the folder, so a failing test names the file and line someone would open.
export function vueTsc(dir: string): Diagnostic[] {
  const configPath = join(dir, "tsconfig.json");
  // Vue's options (vueCompilerOptions) from language-core; the files and compiler options from
  // TypeScript, told that .vue files are sources too, as vue-tsc's patched tsc is.
  const { vueOptions } = vue.createParsedCommandLine(ts, ts.sys, configPath);
  const config = ts.readJsonConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonSourceFileConfigFileContent(config, ts.sys, dir, {}, configPath, undefined, [
    { extension: "vue", isMixedContent: true, scriptKind: ts.ScriptKind.Deferred },
  ]);
  if (parsed.errors.length > 0) throw new Error(parsed.errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n")).join("\n"));
  // vue-tsc patches tsc's list of source extensions; unpatched, TypeScript drops a .vue file given
  // as a root (and says so), though one it reaches through an import is read with the language
  // plugin. So every .vue file is reached through an import from one entry file.
  const vueFiles = parsed.fileNames.filter((f) => f.endsWith(".vue"));
  const entry = join(dir, ENTRY);
  writeFileSync(entry, vueFiles.map((f) => `import "./${relative(dir, f)}";\n`).join(""));
  const rootNames = [...parsed.fileNames.filter((f) => !f.endsWith(".vue") && f !== entry), entry];
  const createProgram = proxyCreateProgram(ts, ts.createProgram, (ts, options) => [vue.createVueLanguagePlugin<string>(ts, options.options, vueOptions, (id) => id)]);
  const program = createProgram({ rootNames, options: parsed.options, host: ts.createCompilerHost(parsed.options) });
  const checked = new Set(program.getSourceFiles().map((f) => f.fileName));
  const missed = vueFiles.filter((f) => !checked.has(f));
  if (missed.length > 0) throw new Error(`vue-tsc didn't read ${missed.map((f) => relative(dir, f)).join(", ")}`);
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const line = d.file !== undefined && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : 0;
    return {
      file: d.file === undefined ? "" : relative(dir, d.file.fileName),
      line,
      code: d.code,
      message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    };
  });
}
