const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload satu berkas ke Cloudinary (unsigned upload, langsung dari browser
 * ke Cloudinary -- tidak lewat server kita, jadi tidak butuh backend).
 * Pengganti Firebase Storage (ref/uploadBytes/getDownloadURL) yang sekarang
 * mewajibkan Blaze plan.
 *
 * Setup sekali di akun Cloudinary (gratis, tanpa kartu):
 *  1. Daftar di cloudinary.com -> catat "Cloud name" di Dashboard.
 *  2. Settings -> Upload -> Upload presets -> Add upload preset.
 *     Signing Mode: "Unsigned". Catat nama preset-nya.
 *  3. Isi VITE_CLOUDINARY_CLOUD_NAME & VITE_CLOUDINARY_UPLOAD_PRESET di .env.
 *
 * @param {File} file - berkas dari <input type="file">
 * @param {string} [folder] - folder tujuan di Cloudinary, mis. "pegawai/123/foto"
 * @returns {Promise<string>} secure_url berkas yang sudah diunggah
 */
export async function uploadToCloudinary(file, folder) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary belum dikonfigurasi. Isi VITE_CLOUDINARY_CLOUD_NAME dan VITE_CLOUDINARY_UPLOAD_PRESET di file .env (lihat .env.example)."
    );
  }

  // PDF & berkas non-gambar harus lewat endpoint "raw", gambar lewat "image".
  const resourceType = file.type === "application/pdf" ? "raw" : "image";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  if (folder) formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Upload ke Cloudinary gagal. Coba lagi.");
  }

  const data = await res.json();
  return data.secure_url;
}
