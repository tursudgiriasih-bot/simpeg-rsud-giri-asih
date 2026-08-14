import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportPdfTable({ title, head, body, filename, groupHeaderIndexes }) {
  const docPdf = new jsPDF({ orientation: "landscape" });
  docPdf.setFontSize(14);
  docPdf.text(title, 14, 15);
  docPdf.setFontSize(9);
  docPdf.text(`RSUD Giri Asih — dicetak ${new Date().toLocaleDateString("id-ID")}`, 14, 21);
  autoTable(docPdf, {
    startY: 26,
    head: [head],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [13, 79, 79] },
    // Baris judul kelompok (mis. "Unit Kerja: ICU") ditebalkan + diberi latar
    // beda supaya laporan per-kelompok mudah dibaca, bukan cuma daftar rata.
    didParseCell: groupHeaderIndexes
      ? (data) => {
          if (data.section === "body" && groupHeaderIndexes.has(data.row.index)) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [230, 240, 238];
          }
        }
      : undefined,
  });
  docPdf.save(filename);
}
