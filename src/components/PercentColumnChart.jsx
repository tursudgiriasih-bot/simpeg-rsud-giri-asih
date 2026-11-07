import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer, Cell } from "recharts";

const TICK = { fontSize: 12, fill: "var(--color-ink-500)" };
const BELUM_DIISI = "Belum diisi";

// Memecah label panjang jadi beberapa baris (per kata) supaya tidak saling
// menimpa di sumbu bawah.
function wrapLabel(text, maxLen) {
  const lines = [];
  let line = "";
  String(text).split(" ").forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLen && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function WrapTick({ x, y, payload, maxLen }) {
  const lines = wrapLabel(payload.value, maxLen);
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="var(--color-ink-500)" fontSize={12}>
        {lines.map((l, i) => (
          <tspan key={i} x={0} dy={i === 0 ? 14 : 14}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  );
}

// Diagram batang VERTIKAL dengan jumlah dan persentase di atas tiap batang,
// mis. "5 (42%)". rows: [[nama, jumlah], ...]
export default function PercentColumnChart({ rows, total, height = 300 }) {
  const data = rows.map(([name, value]) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return { name, value, pct, label: `${value} (${pct}%)` };
  });

  if (!data.some((d) => d.value > 0)) {
    return <div className="text-sm text-[color:var(--color-ink-500)] py-6">Belum ada data.</div>;
  }

  const maxLen = data.length > 8 ? 9 : 14;
  const maxLines = Math.max(...data.map((d) => wrapLabel(d.name, maxLen).length));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-teal-100)" strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          interval={0}
          height={14 * maxLines + 14}
          tick={<WrapTick maxLen={maxLen} />}
          tickLine={false}
          axisLine={{ stroke: "var(--color-teal-100)" }}
        />
        <YAxis allowDecimals={false} width={30} tick={TICK} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "var(--color-teal-100)", opacity: 0.5 }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          formatter={(value, _name, item) => [`${value} pegawai (${item.payload.pct}%)`, "Jumlah"]}
        />
        <Bar dataKey="value" name="Jumlah" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.name === BELUM_DIISI ? "var(--color-ink-300)" : "var(--color-teal-700)"} />
          ))}
          <LabelList dataKey="label" position="top" style={{ fontSize: 12, fill: "var(--color-ink-700)" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
