// The CLI's settings from the environment: TESSERAI_<name>, or TESSERA_<name> as it was spelled
// before the product was named tesserai (scripts and CI set up then keep working).
export function env(name: string): string | undefined {
  return process.env[`TESSERAI_${name}`] ?? process.env[`TESSERA_${name}`];
}
