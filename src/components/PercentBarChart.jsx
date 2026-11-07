import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList, ResponsiveContainer } from "recharts";

const TICK = { fontSize: 12, fill: "var(--color-ink-500)" };

// rows: [[nama, jumlah], ...] atau [{ name, value }, ...]
// total: pembagi persentase (biasanya total seluruh pegawai)
function toChartData(rows, total) {
  return rows.map((r) => {
    const name = Array.isArray(r) ? r[0] : r.name;
    const value = Array.isArray(r) ? r[1] : r.value;
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return { name, value, pct, label: `${value} (${pct}%)` };
  });
}

// Diagram batang horizontal yang menampilkan jumlah DAN persentase di ujung
// tiap batang, mis. "5 (42%)".
export default function PercentBarChart({ rows, total, height, yWidth = 90, maxBarSize = 22 }) {
  const data = toChartData(rows, total);

  if (!data.some((d) => d.value > 0)) {
    return <div className="text-sm text-[color:var(--color-ink-500)] py-6">Belum ada data.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(160, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 72, left: 0, bottom: 0 }}>
        <XAxis type="number" hide domain={[0, "dataMax"]} />
        <YAxis type="category" dataKey="name" width={yWidth} tick={TICK} interval={0} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "var(--color-teal-100)", opacity: 0.5 }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value, _name, item) => [`${value} pegawai (${item.payload.pct}%)`, "Jumlah"]}
        />
        <Bar dataKey="value" name="Jumlah" fill="var(--color-teal-700)" radius={[0, 4, 4, 0]} maxBarSize={maxBarSize}>
          <LabelList dataKey="label" position="right" style={{ fontSize: 12, fill: "var(--color-ink-700)" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
