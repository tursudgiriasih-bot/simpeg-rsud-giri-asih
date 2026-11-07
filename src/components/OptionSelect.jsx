import { useOptionList } from "../utils/optionLists";

// Dropdown yang daftarnya dikelola Admin (menu "Kelola Pilihan").
// listKey = nama field: profesi, unitKerja, golongan, agama, statusPerkawinan.
// Kalau pegawai punya nilai lama yang tidak ada di daftar (data yang dulu
// diketik manual), nilai itu tetap ditampilkan supaya tidak hilang saat
// form dibuka.
export default function OptionSelect({ listKey, value, onChange, className = "", ...rest }) {
  const { list } = useOptionList(listKey);
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
