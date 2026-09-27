import { Button } from './components/Button';
import { StatCard } from './components/StatCard';
import { setTheme } from './theme';

export function App() {
  return (
    <main className="page">
      <h1>Cash position</h1>
      <p className="text-subtle">Balances across connected accounts, refreshed hourly.</p>
      <div style={{ display: 'grid', gap: 'var(--sd-size-space-4)', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard label="Operating" value="$182,430.12" delta={4.2} />
        <StatCard label="Payroll" value="$61,009.00" delta={-1.3} />
        <StatCard label="Reserve" value="$250,000.00" delta={0} />
      </div>
      <div style={{ display: 'flex', gap: 'var(--sd-size-space-2)', marginTop: 'var(--sd-size-space-6)' }}>
        <Button>Reconcile</Button>
        <Button variant="secondary" onClick={() => setTheme('dark')}>
          Dark mode
        </Button>
      </div>
    </main>
  );
}
