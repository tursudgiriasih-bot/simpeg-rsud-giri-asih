import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// Warna cadangan yang mencolok dan mudah dibedakan. Warna tertentu bisa
// dipaksa per nama lewat `colorByName` (mis. laki-laki biru, perempuan pink).
const PALETTE = ["#0891b2", "#f59e0b", "#65a30d", "#7c3aed", "#e11d48", "#2563eb", "#ea580c", "#0d9488"];
const NEUTRAL = "#94a3b8"; // untuk "Belum diisi"

// rows: [[nama, jumlah], ...]
// Persentase dihitung dari jumlah seluruh baris yang ditampilkan, jadi besar
// irisan di lingkaran selalu sama dengan angka persen di keterangan.
// Tata letak: diagram di tengah memenuhi lebar kartu, keterangan di bawahnya.
export default function DonutChart({ rows, colorByName = {}, height = 200 }) {
  const sum = rows.reduce((acc, [, n]) => acc + n, 0);
  if (sum === 0) {
    return <div className="text-sm text-[color:var(--color-ink-500)] py-6">Belum ada data.</div>;
  }

  const items = rows.map(([name, value], i) => ({
    name,
    value,
    pct: Math.round((value / sum) * 100),
    color: colorByName[name] || (name === "Belum diisi" ? NEUTRAL : PALETTE[i % PALETTE.length]),
  }));
  const slices = items.filter((it) => it.value > 0);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="relative w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="96%"
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
        </ResponsiveContainer>

        {/* Jumlah di tengah lubang diagram */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="font-display text-3xl leading-none text-[color:var(--color-teal-900)]">{sum}</div>
          <div className="text-xs text-[color:var(--color-ink-500)] mt-1">pegawai</div>
        </div>
      </div>

      <ul className="w-full max-w-[290px] space-y-1.5">
        {items.map((it) => (
          <li key={it.name} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: it.color }} />
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
