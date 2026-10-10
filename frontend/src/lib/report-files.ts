import { type HistoryReport, reportCsv, reportNote } from "./history-report";

const navy = "FF082F55";
export async function excelReport(report: HistoryReport) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TIRTA UNNES";
  const summary = workbook.addWorksheet("Ringkasan");
  summary.columns = [36, 24, 24, 24, 24].map((width) => ({ width }));
  const lines = [
    "UNIVERSITAS NEGERI SEMARANG",
    "LAPORAN PENGGUNAAN AIR",
    "TIRTA UNNES",
    `Periode: ${report.period} | ${report.start} - ${report.end} (WIB)`,
    `Jenis titik: ${report.kind === "all" ? "Sumur dan Gedung" : report.kind === "WELL" ? "Sumur" : "Gedung"}`,
    `Lokasi monitoring: ${report.location}`,
    `Dibuat: ${report.created}`,
    report.source,
    reportNote,
  ];
  lines.forEach((line, index) => {
    summary.mergeCells(index + 1, 1, index + 1, 5);
    const cell = summary.getCell(index + 1, 1);
    cell.value = line;
    cell.alignment = { wrapText: true, vertical: "middle" };
    summary.getRow(index + 1).height = index === 8 ? 42 : index === 5 ? 36 : 24;
  });
  summary.getRow(1).font = { bold: true, size: 16, color: { argb: navy } };
  summary.getRow(2).font = { bold: true, size: 14, color: { argb: navy } };
  summary.getRow(8).font = { bold: true, color: { argb: "FF147FA9" } };
  summary.addRow([]);
  summary.addRow([
    "Jenis",
    "Total volume (m³)",
    "Rata-rata (m³/hari)",
    "Harian tertinggi (m³)",
    "Titik tercatat",
  ]);
  report.groups.forEach((g) =>
    summary.addRow([g.label, g.total, g.average, g.peak, g.points]),
  );
  for (let row = 12; row <= summary.rowCount; row++)
    for (let col = 2; col <= 4; col++)
      summary.getCell(row, col).numFmt = "#,##0.000";
  const detail = workbook.addWorksheet("Rincian");
  detail.columns = [8, 15, 19, 40, 16, 18, 48].map((width) => ({ width }));
  detail.addRow([
    "No.",
    "Tanggal",
    "Periode WIB",
    "Titik monitoring",
    "Jenis",
    "Volume (m³)",
    "Sumber",
  ]);
  report.details.forEach((r, index) => {
    const date = new Date(`${r.key.slice(0, 10)}T00:00:00Z`);
    // Monthly aggregates use the first day with a month-only display format.
    const actualDate =
      report.mode === "month" ? new Date(`${r.key}-01T00:00:00Z`) : date;
    const row = detail.addRow([
      index + 1,
      actualDate,
      report.mode === "hour"
        ? `${r.key.slice(11)}:00`
        : report.mode === "month"
          ? "Bulanan"
          : "Harian",
      r.name,
      r.type,
      r.volume,
      report.source,
    ]);
    row.getCell(2).numFmt =
      report.mode === "month" ? "mmm yyyy" : "dd mmm yyyy";
    row.getCell(6).numFmt = "#,##0.000";
    row.height = 42;
  });
  if (!report.details.length)
    detail.addRow([null, null, null, "Belum ada data"]);
  for (const [sheet, header] of [
    [summary, 11],
    [detail, 1],
  ] as const) {
    sheet.getRow(header).height = 30;
    sheet.getRow(header).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: navy },
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { wrapText: true, vertical: "middle" };
    });
    sheet.eachRow((row, index) => {
      if (index > header)
        row.eachCell((cell) => {
          cell.border = {
            bottom: { style: "hair", color: { argb: "FFDCE5ED" } },
          };
          cell.alignment = { wrapText: true, vertical: "middle" };
        });
    });
    sheet.views = [{ state: "frozen", ySplit: header }];
    sheet.pageSetup = {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: `${header}:${header}`,
      printArea: `A1:${sheet === detail ? "G" : "E"}${sheet.rowCount}`,
    };
    sheet.headerFooter = { oddFooter: "TIRTA UNNES | Halaman &P dari &N" };
  }
  detail.autoFilter = { from: "A1", to: `G${Math.max(1, detail.rowCount)}` };
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

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
  line("TIRTA UNNES", 10, true);
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
      `TIRTA UNNES | ${report.illustrative ? "DATA CONTOH" : "Data monitoring"}`,
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
