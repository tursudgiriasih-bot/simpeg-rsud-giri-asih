// Konfigurasi setiap sub-bagian profil pegawai.
// Satu komponen generik (SectionRecords) memakai config ini untuk
// menampilkan tabel + form tambah/edit + upload dokumen secara otomatis,
// supaya menambah bagian baru cukup menambah entri di file ini.
//
// field.type: "text" | "textarea" | "date" | "number" | "select" | "file"
// field.reminderThreshold: jika diisi (90/180), field tanggal ini akan
//   dihitung otomatis untuk sistem pengingat pada dashboard.

export const SECTIONS = {
  riwayatPendidikan: {
    label: "Riwayat Pendidikan",
    collection: "riwayatPendidikan",
    columns: ["jenjang", "namaInstitusi", "tahunLulus"],
    fields: [
      { name: "jenjang", label: "Jenjang", type: "select", options: ["SD", "SMP", "SMA/SMK", "D3", "D4/S1", "S2", "S3", "Non Formal / Diklat", "Workshop", "Seminar"] },
      { name: "namaInstitusi", label: "Nama Institusi / Kegiatan", type: "text" },
      { name: "tahunLulus", label: "Tahun", type: "number" },
      { name: "keterangan", label: "Keterangan", type: "textarea" },
      { name: "fileUrl", label: "Dokumen Pendukung", type: "file" },
    ],
  },
  riwayatJabatan: {
    label: "Riwayat Jabatan",
    collection: "riwayatJabatan",
    columns: ["jabatan", "unit", "tmt", "nomorSk"],
    fields: [
      { name: "jabatan", label: "Jabatan", type: "text" },
      { name: "unit", label: "Unit", type: "text" },
      { name: "tmt", label: "TMT", type: "date" },
      { name: "nomorSk", label: "Nomor SK", type: "text" },
      { name: "fileUrl", label: "Upload SK", type: "file" },
    ],
  },
  riwayatPangkat: {
    label: "Riwayat Pangkat",
    collection: "riwayatPangkat",
    columns: ["pangkat", "golongan", "tmt", "nomorSk"],
    fields: [
      { name: "pangkat", label: "Pangkat", type: "text" },
      { name: "golongan", label: "Golongan", type: "text" },
      { name: "tmt", label: "TMT", type: "date" },
      { name: "nomorSk", label: "Nomor SK", type: "text" },
      { name: "targetKenaikanBerikutnya", label: "Target Kenaikan Berikutnya (untuk pengingat 180 hari)", type: "date", reminderThreshold: 180 },
      { name: "fileUrl", label: "Upload SK", type: "file" },
    ],
  },
  kgb: {
    label: "Kenaikan Gaji Berkala",
    collection: "kgb",
    columns: ["nomorSk", "tmt", "tanggalBerakhir"],
    fields: [
      { name: "nomorSk", label: "Nomor SK", type: "text" },
      { name: "tmt", label: "TMT", type: "date" },
      { name: "tanggalBerakhir", label: "Tanggal Berakhir", type: "date", reminderThreshold: 90 },
      { name: "fileUrl", label: "Upload SK", type: "file" },
    ],
  },
  sip: {
    label: "SIP (Surat Izin Praktik)",
    collection: "sip",
    columns: ["nomorSip", "tanggalTerbit", "tanggalBerakhir"],
    fields: [
      { name: "nomorSip", label: "Nomor SIP", type: "text" },
      { name: "tanggalTerbit", label: "Tanggal Terbit", type: "date" },
      { name: "tanggalBerakhir", label: "Tanggal Berakhir", type: "date", reminderThreshold: 90 },
      { name: "fileUrl", label: "Upload SIP", type: "file" },
    ],
  },
  str: {
    label: "STR (berlaku seumur hidup)",
    collection: "str",
    columns: ["nomorStr", "tanggalTerbit", "profesi"],
    noReminder: true,
    fields: [
      { name: "nomorStr", label: "Nomor STR", type: "text" },
      { name: "tanggalTerbit", label: "Tanggal Terbit", type: "date" },
      { name: "profesi", label: "Profesi", type: "text" },
      { name: "fileUrl", label: "Upload STR", type: "file" },
    ],
  },
  spk: {
    label: "SPK",
    collection: "spk",
    columns: ["nomorSpk", "tanggalTerbit", "tanggalBerakhir"],
    fields: [
      { name: "nomorSpk", label: "Nomor SPK", type: "text" },
      { name: "tanggalTerbit", label: "Tanggal Terbit", type: "date" },
      { name: "tanggalBerakhir", label: "Tanggal Berakhir", type: "date", reminderThreshold: 90 },
      { name: "fileUrl", label: "Upload Dokumen", type: "file" },
    ],
  },
  pelatihan: {
    label: "Pelatihan",
    collection: "pelatihan",
    columns: ["namaPelatihan", "penyelenggara", "tanggal", "jumlahJp"],
    fields: [
      { name: "namaPelatihan", label: "Nama Pelatihan", type: "text" },
      { name: "penyelenggara", label: "Penyelenggara", type: "text" },
      { name: "tanggal", label: "Tanggal", type: "date" },
      { name: "jumlahJp", label: "Jumlah JP", type: "number" },
      { name: "fileUrl", label: "Sertifikat", type: "file" },
    ],
  },
  cpd: {
    label: "CPD (Target 20 JP/Tahun)",
    collection: "cpd",
    columns: ["tahun", "totalJp"],
    fields: [
      { name: "tahun", label: "Tahun", type: "number" },
      { name: "totalJp", label: "Total JP", type: "number" },
    ],
  },
  reward: {
    label: "Reward",
    collection: "reward",
    columns: ["jenis", "tahun", "keterangan"],
    fields: [
      { name: "jenis", label: "Jenis", type: "text" },
      { name: "tahun", label: "Tahun", type: "number" },
      { name: "keterangan", label: "Keterangan", type: "textarea" },
      { name: "fileUrl", label: "Upload Dokumen", type: "file" },
    ],
  },
  punishment: {
    label: "Punishment",
    collection: "punishment",
    columns: ["jenis", "tahun", "keterangan"],
    fields: [
      { name: "jenis", label: "Jenis", type: "text" },
      { name: "tahun", label: "Tahun", type: "number" },
      { name: "keterangan", label: "Keterangan", type: "textarea" },
    ],
  },
  penilaianKinerja: {
    label: "Penilaian Kinerja",
    collection: "penilaianKinerja",
    columns: ["tahun", "iki", "skp", "predikat"],
    fields: [
      { name: "tahun", label: "Tahun", type: "number" },
      { name: "iki", label: "IKI", type: "text" },
      { name: "skp", label: "SKP", type: "text" },
      { name: "predikat", label: "Predikat", type: "text" },
    ],
  },
  kesehatan: {
    label: "Kesehatan Pegawai",
    collection: "kesehatan",
    columns: ["jenis", "tanggal", "keterangan"],
    fields: [
      { name: "jenis", label: "Jenis", type: "select", options: ["MCU", "Vaksinasi", "Pendampingan Psikologis", "Kecelakaan Kerja"] },
      { name: "tanggal", label: "Tanggal", type: "date" },
      { name: "keterangan", label: "Keterangan", type: "textarea" },
    ],
  },
  dokumenLain: {
    label: "Dokumen Lain",
    collection: "dokumenLain",
    columns: ["jenis", "tanggalUpload"],
    fields: [
      { name: "jenis", label: "Jenis Dokumen", type: "select", options: ["SK CPNS", "SK PNS", "SK Penempatan", "SK Mutasi", "SK Rotasi", "Uraian Tugas", "SPK", "RKK", "Lainnya"] },
      { name: "tanggalUpload", label: "Tanggal Upload", type: "date" },
      { name: "fileUrl", label: "Dokumen (PDF)", type: "file" },
    ],
  },
};

// Bagian yang boleh diunggah dokumen sendiri oleh pegawai (sesuai SRS: "jika diizinkan")
export const PEGAWAI_UPLOAD_ALLOWED = ["pelatihan", "kesehatan"];
