// Field tanggal "pengingat" resmi per bagian sistem -- dipakai Dashboard,
// halaman Cek Masa Berlaku, dan halaman Laporan. Sengaja disatukan di sini
// (bukan diduplikasi di tiap halaman) supaya kalau suatu saat berubah,
// cukup diubah di SATU tempat dan semua halaman otomatis ikut sinkron.
export const SYSTEM_REMINDER_FIELDS = {
  sip: "tanggalBerakhir",
  spk: "tanggalBerakhir",
  kgb: "tanggalBerakhir",
  riwayatPangkat: "targetKenaikanBerikutnya",
};
