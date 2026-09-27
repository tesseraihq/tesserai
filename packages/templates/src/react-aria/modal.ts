import { type Anatomy } from "@tesserai/core";
import { modalClasses, type ModalKind } from "../modal";

const BACKDROP_LAYOUT = ["flex", "items-center", "justify-center", "p-4"];

// shadcn's React Aria modals: XTrigger (DialogTrigger) holds the open state and wraps the button;
// X itself is ModalOverlay > Modal > Dialog. Buttons with slot="close" close it.
export function racModalSource(anatomy: Anatomy, kind: ModalKind): { classes: ReturnType<typeof modalClasses>; overlay: string } {
  const classes = modalClasses(anatomy, kind, "react-aria");
  // A centred dialog is laid out by its overlay; a sheet positions itself.
  const overlay = kind === "sheet" ? classes.backdrop : classes.backdrop.replace(/"$/, ` ${BACKDROP_LAYOUT.join(" ")}"`);
  return { classes, overlay };
}
