export default function StatCard({ label, value, sub }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">{label}</div>
      <div className="font-display text-3xl mt-2 text-[color:var(--color-teal-900)] font-mono-data">{value}</div>
      {sub && <div className="text-xs text-[color:var(--color-ink-500)] mt-1">{sub}</div>}
    </div>
  );
}
