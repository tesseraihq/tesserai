export function Button(props: React.ComponentProps<"button">) {
  return <button {...props} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" />;
}

export function DangerButton(props: React.ComponentProps<"button">) {
  return <button {...props} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white" />;
}
