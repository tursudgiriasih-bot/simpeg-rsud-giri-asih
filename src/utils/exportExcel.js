import * as XLSX from "xlsx";
import { formatDate } from "./helpers";

export function exportPegawaiExcel(list, filename = "data-pegawai.xlsx") {
  const rows = list.map((p) => ({
    Nama: p.nama,
    NIP: p.nip,
    NIK: p.nik,
    "Tempat Lahir": p.tempatLahir,
    "Tanggal Lahir": formatDate(p.tanggalLahir),
    "Jenis Kelamin": p.jenisKelamin,
    Agama: p.agama,
    "Status Perkawinan": p.statusPerkawinan,
    Alamat: p.alamat,
    "No HP": p.noHp,
    Email: p.email,
    Pendidikan: p.pendidikan,
    Jabatan: p.jabatan,
    "Unit Kerja": p.unitKerja,
    Pangkat: p.pangkat,
    Golongan: p.golongan,
    "TMT CPNS": formatDate(p.tmtCpns),
    "TMT PNS": formatDate(p.tmtPns),
    "Status Pegawai": p.statusPegawai,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Pegawai");
  XLSX.writeFile(wb, filename);
}

export function exportGenericExcel(rows, sheetName, filename) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
