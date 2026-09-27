export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-ink-900">
      <header className="border-b border-ink-200 px-6 py-4">Orbit</header>
      <main className="p-6">{children}</main>
    </div>
  );
}
