import type { ButtonHTMLAttributes } from "react";
import type { RecipeVariants } from "@vanilla-extract/recipes";
import { button } from "./Button.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & RecipeVariants<typeof button>;

export function Button({ tone, className, ...rest }: Props) {
  return <button className={[button({ tone }), className].filter(Boolean).join(" ")} {...rest} />;
}
