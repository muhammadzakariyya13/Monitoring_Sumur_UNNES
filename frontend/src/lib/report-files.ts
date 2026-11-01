import { type HistoryReport, reportCsv, reportNote } from "./history-report";

import { excelReport } from "./excel-report";
export { excelReport };

export async function pdfReport(report: HistoryReport) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const width = 182;
  let y = 18;
  const line = (text: string, size = 10, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width);
    doc.text(lines, 14, y);
    y += lines.length * size * 0.45 + 3;
  };
  doc.setTextColor(8, 47, 85);
  line("UNIVERSITAS NEGERI SEMARANG", 14, true);
  line("LAPORAN PENGGUNAAN AIR", 13, true);
  line("SIMARA", 10, true);
  line(`Periode: ${report.period} | ${report.start} - ${report.end} (WIB)`);
  line(
    `Jenis: ${report.kind === "all" ? "Sumur dan Gedung" : report.kind === "WELL" ? "Sumur" : "Gedung"} | Lokasi: ${report.location}`,
  );
  line(`Dibuat: ${report.created}`, 9);
  line(report.source, 9, true);
  line(reportNote, 9);
  const number = (n: number | null) =>
    n === null
      ? "Belum ada data"
      : n.toLocaleString("id-ID", { maximumFractionDigits: 3 });
  autoTable(doc, {
    startY: y,
    head: [
      [
        "Jenis",
        "Total (m³)",
        "Rata-rata (m³/hari)",
        "Tertinggi (m³/hari)",
        "Titik",
      ],
    ],
    body: report.groups.map((g) => [
      g.label,
      number(g.total),
      number(g.average),
      number(g.peak),
      g.points,
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [8, 47, 85] },
    margin: { left: 14, right: 14, bottom: 18 },
  });
  const finalY = (doc as typeof doc & { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY;
  autoTable(doc, {
    startY: finalY + 10,
    head: [["No.", "Periode WIB", "Titik monitoring", "Jenis", "Volume (m³)"]],
    body: report.details.length
      ? report.details.map((r, i) => [
          i + 1,
          r.key.replace("T", " ") + (report.mode === "hour" ? ":00" : ""),
          r.name,
          r.type,
          number(r.volume),
        ])
      : [["", "", "Belum ada data pada rentang ini", "", ""]],
    styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 36 },
      2: { cellWidth: 76 },
      3: { cellWidth: 24 },
      4: { cellWidth: 34, halign: "right" },
    },
    headStyles: { fillColor: [8, 47, 85] },
    rowPageBreak: "avoid",
    margin: { top: 18, bottom: 18, left: 14, right: 14 },
    showHead: "everyPage",
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(82, 105, 128);
    doc.text(
      `SIMARA | ${report.illustrative ? "DATA CONTOH" : "Data monitoring"}`,
      14,
      287,
    );
    doc.text(`Halaman ${page} / ${pages}`, 196, 287, { align: "right" });
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
export async function reportFile(
  report: HistoryReport,
  format: "xlsx" | "pdf" | "csv",
) {
  if (format === "csv")
    return new Blob([reportCsv(report)], { type: "text/csv;charset=utf-8" });
  const bytes =
    format === "xlsx" ? await excelReport(report) : await pdfReport(report);
  return new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type:
      format === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf",
  });
}
