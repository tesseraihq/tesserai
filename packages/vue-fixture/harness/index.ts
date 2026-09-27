// The Vue fixture's harness: write a system's generated files into the fixture, type-check them
// with vue-tsc, and load them (with the React output beside them) to render and compare.
export { FIXTURE_DIR, GENERATED_DIR, writeGenerated, type GeneratedFile } from "./files";
export { vueTsc, type Diagnostic } from "./typecheck";
export { createLoader, type Loader, type Mode } from "./load";
