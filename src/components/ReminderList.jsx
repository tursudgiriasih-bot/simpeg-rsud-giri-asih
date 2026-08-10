import { Link } from "react-router-dom";
import { urgencyStatus, URGENCY_COLORS, daysUntil, formatDate } from "../utils/helpers";

export default function ReminderList({ title, items, threshold }) {
  if (!items || items.length === 0) {
    return (
      <div className="card p-5">
        <div className="font-medium text-[color:var(--color-ink-900)] mb-2">{title}</div>
        <div className="text-sm text-[color:var(--color-ink-500)]">Tidak ada yang mendekati tenggat.</div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-[color:var(--color-teal-100)] font-medium text-[color:var(--color-ink-900)]">
        {title} <span className="text-[color:var(--color-ink-500)] font-normal">({items.length})</span>
      </div>
      <ul>
        {items.map((it) => {
          const d = daysUntil(it.date);
          const status = urgencyStatus(d, threshold);
          const colors = URGENCY_COLORS[status];
          return (
            <li key={it.id} className={`status-rail ${colors.rail} px-5 py-3 flex items-center justify-between border-b border-[color:var(--color-teal-100)] last:border-b-0`}>
              <div className="min-w-0">
                <Link to={`/pegawai/${it.pegawaiId}`} className="text-sm font-medium text-[color:var(--color-teal-700)] hover:underline truncate block">
                  {it.pegawaiNama}
                </Link>
                <div className="text-xs text-[color:var(--color-ink-500)] truncate">{it.detail} · jatuh tempo {formatDate(it.date)}</div>
              </div>
              <span className={`shrink-0 ml-3 text-xs px-2 py-1 rounded-full font-mono-data ${colors.badge}`}>
                {d < 0 ? `Lewat ${Math.abs(d)}h` : `${d} hari`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
