export const AGAMA = [
  "Islam",
  "Kristen Protestan",
  "Katolik",
  "Hindu",
  "Buddha",
  "Khonghucu",
];

export const JENIS_KELAMIN = ["Laki-laki", "Perempuan"];

export const STATUS_PERKAWINAN = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];

export const STATUS_PEGAWAI = ["PNS", "CPNS"];

export const GOLONGAN = [
  "I/a", "I/b", "I/c", "I/d",
  "II/a", "II/b", "II/c", "II/d",
  "III/a", "III/b", "III/c", "III/d",
  "IV/a", "IV/b", "IV/c", "IV/d", "IV/e",
];

export function formatDate(value) {
  if (!value) return "-";
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export function toDateInputValue(value) {
  if (!value) return "";
  const d = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 10);
}

// Mengembalikan jumlah hari tersisa (bisa negatif jika sudah lewat)
export function daysUntil(dateValue) {
  if (!dateValue) return null;
  const d = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(d)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

// Status urgensi untuk "status rail" (signature visual: garis warna di kiri kartu)
export function urgencyStatus(daysLeft, threshold) {
  if (daysLeft === null) return "none";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= threshold * 0.34) return "urgent"; // sepertiga akhir masa tenggat
  if (daysLeft <= threshold) return "warning";
  return "ok";
}

export const URGENCY_COLORS = {
  expired: { rail: "border-l-[color:var(--color-red-500)]", badge: "bg-[color:var(--color-red-100)] text-[color:var(--color-red-700)]" },
  urgent: { rail: "border-l-[color:var(--color-red-500)]", badge: "bg-[color:var(--color-red-100)] text-[color:var(--color-red-700)]" },
  warning: { rail: "border-l-[color:var(--color-amber-500)]", badge: "bg-[color:var(--color-amber-100)] text-[color:var(--color-amber-700)]" },
  ok: { rail: "border-l-[color:var(--color-green-500)]", badge: "bg-[color:var(--color-green-100)] text-[color:var(--color-green-700)]" },
  none: { rail: "border-l-[color:var(--color-ink-300)]", badge: "bg-gray-100 text-gray-600" },
};

export function initials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

// Mengubah label bebas (mis. "Nomor STR") menjadi key camelCase yang aman
// dipakai sebagai nama field/collection Firestore, dan menghindari duplikat.
export function toSlugKey(label, existingKeys = []) {
  let base = (label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");
  if (!base) base = "bagian";
  let key = base;
  let n = 2;
  while (existingKeys.includes(key)) {
    key = `${base}${n}`;
    n += 1;
  }
  return key;
}

// Batas ukuran berkas -- validasi di sisi klien supaya pesan error muncul
// instan. Sebaiknya set batas serupa di Cloudinary (Settings -> Upload ->
// preset Anda -> Max file size) sebagai lapisan kedua.
export const MAX_FILE_SIZE_MB = 2;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
