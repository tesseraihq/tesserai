// Metadata in a generated // comment must never start a new source-code line.
export function commentText(value: string): string {
  return value.replace(/[\r\n\u2028\u2029]/g, " ");
}
