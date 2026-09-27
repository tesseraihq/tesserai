import type { ReactNode } from "react";
import type { ButtonProps } from "@/components/ui/button";

export type Invoice = { id: string; amount: number; status: "paid" | "open" | "void" };

export type Member = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  avatarUrl?: string;
};

export type ToolbarAction = Pick<ButtonProps, "variant" | "intent"> & {
  label: string;
  icon?: ReactNode;
  run: () => void;
};
