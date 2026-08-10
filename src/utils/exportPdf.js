import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportPdfTable({ title, head, body, filename }) {
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
  });
  docPdf.save(filename);
}
