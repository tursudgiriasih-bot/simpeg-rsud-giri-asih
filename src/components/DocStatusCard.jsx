import { Link } from "react-router-dom";
import Modal from "./Modal";
import { formatDate } from "../utils/helpers";

// Tiga status masa berlaku dokumen (SIP/SPK) di Dashboard Admin:
//   hijau  = masih berlaku, lebih dari `threshold` hari lagi
//   kuning = akan berakhir dalam `threshold` hari
//   merah  = sudah berakhir
const KINDS = {
  hijau: {
    label: "Masih berlaku",
    hint: (t) => `lebih dari ${t} hari`,
    tile: "bg-[color:var(--color-green-100)] text-[color:var(--color-green-700)] border-[color:var(--color-green-500)]/40",
    badge: "bg-[color:var(--color-green-100)] text-[color:var(--color-green-700)]",
    rail: "border-l-[color:var(--color-green-500)]",
  },
  kuning: {
    label: "Segera berakhir",
    hint: (t) => `${t} hari atau kurang`,
    tile: "bg-[color:var(--color-amber-100)] text-[color:var(--color-amber-700)] border-[color:var(--color-amber-500)]/40",
    badge: "bg-[color:var(--color-amber-100)] text-[color:var(--color-amber-700)]",
    rail: "border-l-[color:var(--color-amber-500)]",
  },
  merah: {
    label: "Sudah berakhir",
    hint: () => "lewat tenggat",
    tile: "bg-[color:var(--color-red-100)] text-[color:var(--color-red-700)] border-[color:var(--color-red-500)]/40",
    badge: "bg-[color:var(--color-red-100)] text-[color:var(--color-red-700)]",
    rail: "border-l-[color:var(--color-red-500)]",
  },
};

export default function DocStatusCard({ title, status, threshold, onSelect }) {
  return (
    <div className="card p-5">
      <div className="font-medium text-[color:var(--color-ink-900)]">{title}</div>
      <div className="text-xs text-[color:var(--color-ink-500)] mb-4">Klik angka untuk melihat nama pegawai</div>
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(KINDS).map(([kind, cfg]) => {
          const count = status?.[kind]?.length || 0;
          return (
            <button
              key={kind}
              type="button"
              disabled={count === 0}
              onClick={() => onSelect(kind)}
              className={`text-left rounded-lg border px-4 py-3 transition ${cfg.tile} ${
                count === 0 ? "opacity-50 cursor-default" : "cursor-pointer hover:brightness-95"
              }`}
            >
              <div className="font-mono-data text-3xl font-semibold leading-none">{count}</div>
              <div className="text-sm font-medium mt-2">{cfg.label}</div>
              <div className="text-xs opacity-80">{cfg.hint(threshold)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Jendela daftar nama pegawai yang muncul saat salah satu angka diklik.
export function DocStatusModal({ docLabel, kind, items, onClose }) {
  const cfg = kind ? KINDS[kind] : null;
  return (
    <Modal
      open={!!cfg}
      onClose={onClose}
      wide
      title={cfg ? `${docLabel} · ${cfg.label} (${items.length})` : ""}
    >
      {cfg && (
        <ul className="-my-1">
          {items.map((it) => (
            <li
              key={it.id}
              className={`status-rail ${cfg.rail} px-4 py-3 flex items-center justify-between border-b border-[color:var(--color-teal-100)] last:border-b-0`}
            >
              <div className="min-w-0">
                <Link
                  to={`/pegawai/${it.pegawaiId}`}
                  className="text-sm font-medium text-[color:var(--color-teal-700)] hover:underline truncate block"
                >
                  {it.pegawaiNama}
                </Link>
                <div className="text-xs text-[color:var(--color-ink-500)] truncate">
                  {it.detail} · jatuh tempo {formatDate(it.date)}
                </div>
              </div>
              <span className={`shrink-0 ml-3 text-xs px-2 py-1 rounded-full font-mono-data ${cfg.badge}`}>
                {it._days < 0 ? `Lewat ${Math.abs(it._days)}h` : `${it._days} hari`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
