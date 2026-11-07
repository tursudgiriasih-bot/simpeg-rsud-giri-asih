import { PieChart, Pie, Cell, Tooltip } from "recharts";

// Warna diagram lingkaran: dasar teal (warna utama aplikasi) + aksen amber.
const COLORS = ["#0d4f4f", "#b7791f", "#4f9494", "#b3261e", "#2f6f4e", "#8ea39e", "#7a1f1a", "#9cc7c1"];

// rows: [[nama, jumlah], ...]
// Persentase dihitung dari jumlah seluruh baris yang ditampilkan, jadi besar
// irisan di lingkaran selalu sama dengan angka persen di keterangan.
export default function DonutChart({ rows, size = 112 }) {
  const sum = rows.reduce((acc, [, n]) => acc + n, 0);
  if (sum === 0) {
    return <div className="text-sm text-[color:var(--color-ink-500)] py-6">Belum ada data.</div>;
  }

  const items = rows.map(([name, value], i) => ({
    name,
    value,
    pct: Math.round((value / sum) * 100),
    color: COLORS[i % COLORS.length],
  }));
  const slices = items.filter((it) => it.value > 0);

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <PieChart width={size} height={size}>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius={size * 0.3}
          outerRadius={size * 0.46}
          paddingAngle={slices.length > 1 ? 2 : 0}
          startAngle={90}
          endAngle={-270}
          stroke="none"
        >
          {slices.map((s) => (
            <Cell key={s.name} fill={s.color} />
          ))}
        </Pie>
        <Tooltip
          wrapperStyle={{ zIndex: 20 }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value, name, item) => [`${value} pegawai (${item.payload.pct}%)`, name]}
        />
      </PieChart>

      <ul className="flex-1 min-w-[120px] space-y-1.5">
        {items.map((it) => (
          <li key={it.name} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: it.color }} />
            <span className="flex-1 truncate text-[color:var(--color-ink-700)]">{it.name}</span>
            <span className="font-mono-data font-semibold text-[color:var(--color-teal-900)] whitespace-nowrap">
              {it.value} ({it.pct}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
