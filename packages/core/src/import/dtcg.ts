import { lookToSystem, type ImportResult } from "./look";
import { readTokenFile } from "./tokens-look";

// Imports a design-token file: W3C DTCG ($value, $type) or Tokens Studio's older format (value,
// type). Token files differ a lot, so this reads what can be mapped honestly and says what it
// didn't use (see tokens-look.ts):
// - color scales (a group of numbered colors, 50…950 or 1…12) become palettes, every step exact;
// - semantic colors land on the roles their names mean (primary, background, on-accent, line…);
// - radius, spacing unit, body text size, fonts and shadows come from their usual groups.

export function importDtcg(json: unknown, name = "Imported tokens", file = "tokens.json", text?: string): ImportResult | { error: string } {
  const look = readTokenFile(json, file, text ?? JSON.stringify(json, null, 2));
  if ("error" in look) return look;
  const result = lookToSystem(look, name);
  if ("error" in result) return { error: "nothing in the file maps to tesserai: no color scales, semantic colors, radius, spacing, type sizes or fonts" };
  return result;
}
