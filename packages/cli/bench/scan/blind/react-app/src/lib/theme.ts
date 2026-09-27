const surfaces = {
  danger: "border-destructive bg-destructive/5",
  muted: "bg-muted/40",
} as const;

export function surface(name: keyof typeof surfaces) {
  return surfaces[name];
}
