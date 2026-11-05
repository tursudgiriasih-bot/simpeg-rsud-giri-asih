import { useProfesiList } from "../utils/profesi";

// Dropdown profesi yang daftarnya dikelola Admin (menu "Kelola Profesi").
// Kalau pegawai punya nilai profesi yang sudah tidak ada di daftar, nilai itu
// tetap ditampilkan supaya tidak hilang saat form dibuka.
export default function ProfesiSelect({ value, onChange, className = "", ...rest }) {
  const { list } = useProfesiList();
  const extra = value && !list.includes(value) ? [value] : [];

  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={className} {...rest}>
      <option value="">- Pilih -</option>
      {[...list, ...extra].map((nama) => (
        <option key={nama} value={nama}>{nama}</option>
      ))}
    </select>
  );
}
