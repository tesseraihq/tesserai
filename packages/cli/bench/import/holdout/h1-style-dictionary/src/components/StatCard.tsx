import styles from './StatCard.module.css';

export function StatCard({ label, value, delta }: { label: string; value: string; delta: number }) {
  const tone = delta > 0 ? styles.up : delta < 0 ? styles.down : styles.flat;
  return (
    <section className={styles.card}>
      <h3 className={styles.label}>{label}</h3>
      <p className={styles.value}>{value}</p>
      <p className={tone}>{delta === 0 ? 'No change' : `${delta > 0 ? '+' : ''}${delta}% this week`}</p>
    </section>
  );
}
