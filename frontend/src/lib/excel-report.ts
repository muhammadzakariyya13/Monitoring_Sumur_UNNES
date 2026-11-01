import type { Worksheet } from "exceljs";
import { type HistoryReport, reportNote } from "./history-report";

const palette = {
  navy: "FF0A3159",
  blue: "FF06539F",
  ink: "FF20384E",
  muted: "FF586D7E",
  border: "FFDCE5ED",
  stripe: "FFF2F6FA",
  white: "FFFFFFFF",
  warning: "FFFFF4D6",
};
const volumeFormat = "[$-421]#,##0.000";

function merged(
  sheet: Worksheet,
  row: number,
  from: number,
  to: number,
  text: string,
  size = 11,
  bold = false,
) {
  sheet.mergeCells(row, from, row, to);
  const cell = sheet.getCell(row, from);
  cell.value = text;
  cell.font = { name: "Calibri", size, bold, color: { argb: palette.ink } };
  cell.alignment = { vertical: "middle", wrapText: true };
  return cell;
}

function height(text: string, characters: number, minimum = 22) {
  return Math.max(
    minimum,
    text
      .split("\n")
      .reduce(
        (n, line) => n + Math.max(1, Math.ceil(line.length / characters)),
        0,
      ) *
      15 +
      7,
  );
}

function heading(sheet: Worksheet, row: number, labels: string[]) {
  const header = sheet.getRow(row);
  labels.forEach((label, i) => {
    const cell = header.getCell(i + 1);
    cell.value = label;
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: palette.navy },
    };
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: palette.white },
    };
    cell.alignment = {
      vertical: "middle",
      wrapText: true,
      horizontal: i ? "center" : "left",
    };
  });
  header.height = 34;
}

function dataRow(
  sheet: Worksheet,
  row: number,
  columns: number,
  alternate: boolean,
) {
  for (let col = 1; col <= columns; col++) {
    const cell = sheet.getCell(row, col);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: alternate ? palette.stripe : palette.white },
    };
    cell.border = {
      bottom: { style: "hair", color: { argb: palette.border } },
    };
    cell.alignment = {
      vertical: "middle",
      wrapText: true,
      horizontal: col === 1 ? "left" : "right",
    };
  }
}

function printSetup(
  sheet: Worksheet,
  lastColumn: string,
  lastRow: number,
  landscape: boolean,
  illustrative: boolean,
) {
  sheet.pageSetup = {
    paperSize: 9,
    orientation: landscape ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: landscape ? 0 : 1,
    printArea: `A1:${lastColumn}${lastRow}`,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.4,
      bottom: 0.45,
      header: 0.15,
      footer: 0.2,
    },
    horizontalCentered: true,
  };
  sheet.headerFooter = {
    oddHeader: "&LSIMARA | Universitas Negeri Semarang",
    oddFooter: `&LSIMARA | UNNES&C${illustrative ? "DATA CONTOH" : "Data monitoring"}&RHalaman &P dari &N`,
  };
}

/** Presentation only: all statistics and per-point periods come from createReport. */
export async function excelReport(report: HistoryReport) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIMARA — Universitas Negeri Semarang";
  workbook.title = "Laporan Penggunaan Air";
  workbook.subject = "Produksi sumur dan pemakaian gedung";
  workbook.description = report.source;
  const summary = workbook.addWorksheet("Ringkasan Laporan", {
    properties: { tabColor: { argb: palette.navy }, defaultRowHeight: 22 },
  });
  const detail = workbook.addWorksheet("Detail Monitoring", {
    properties: { tabColor: { argb: palette.blue }, defaultRowHeight: 22 },
  });
  for (const [sheet, widths] of [
    [summary, [30, 19, 21, 22, 14]],
    [detail, [7, 18, 15, 36, 15, 18, 24]],
  ] as const) {
    sheet.columns = widths.map((width) => ({
      width,
      style: {
        font: { name: "Calibri", size: 11, color: { argb: palette.ink } },
      },
    }));
    sheet.views = [
      {
        state: "frozen",
        ySplit: sheet === summary ? 12 : 8,
        showGridLines: false,
      },
    ];
  }
  merged(summary, 1, 1, 4, "UNIVERSITAS NEGERI SEMARANG", 15, true).font.color =
    { argb: palette.navy };
  merged(summary, 2, 1, 4, "SIMARA — Sistem Informasi Monitoring Air", 11);
  merged(summary, 3, 1, 5, "LAPORAN PENGGUNAAN AIR", 17, true).font.color = {
    argb: palette.navy,
  };
  summary.getRow(1).height = 27;
  summary.getRow(2).height = 22;
  summary.getRow(3).height = 34;
  summary.getRow(4).height = 8;
  const dateText = (value: string) =>
    new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  const kind =
    report.kind === "all"
      ? "Sumur dan Gedung (disajikan terpisah)"
      : report.kind === "WELL"
        ? "Sumur — produksi"
        : "Gedung — pemakaian";
  const metadata = [
    [
      "Periode laporan",
      `${report.period} | ${dateText(report.start)} – ${dateText(report.end)} (WIB)`,
    ],
    ["Tanggal pembuatan", report.created],
    ["Jenis monitoring", kind],
    ["Lokasi monitoring", report.location],
    ["Status data", report.source],
  ];
  metadata.forEach(([label, value], i) => {
    const row = 5 + i;
    const cell = summary.getCell(row, 1);
    cell.value = label;
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: palette.navy },
    };
    cell.alignment = { vertical: "middle", wrapText: true };
    merged(summary, row, 2, 5, value);
    summary.getRow(row).height = height(value, 65);
    if (i === 4) {
      for (let col = 1; col <= 5; col++)
        summary.getCell(row, col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: report.illustrative ? palette.warning : palette.stripe,
          },
        };
      summary.getCell(row, 2).font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: palette.navy },
      };
    }
  });
  summary.getRow(10).height = 8;
  const section = merged(
    summary,
    11,
    1,
    5,
    "REKAP PRODUKSI SUMUR DAN PEMAKAIAN GEDUNG",
    11,
    true,
  );
  section.font.color = { argb: palette.blue };
  heading(summary, 12, [
    "Jenis monitoring",
    "Volume total (m³)",
    "Rata-rata harian (m³/hari)",
    "Harian tertinggi (m³)",
    "Titik tercatat",
  ]);
  report.groups.forEach((group, i) => {
    const row = summary.getRow(13 + i);
    row.values = [
      group.label,
      group.total ?? "Belum ada data",
      group.average ?? "Belum ada data",
      group.peak ?? "Belum ada data",
      group.points,
    ];
    row.height = 28;
    dataRow(summary, row.number, 5, i % 2 === 1);
    for (let col = 2; col <= 4; col++) row.getCell(col).numFmt = volumeFormat;
    row.getCell(5).numFmt = "0";
  });
  let row = 13 + report.groups.length;
  summary.getRow(row++).height = 8;
  merged(summary, row++, 1, 5, "CATATAN METODOLOGI", 11, true).font.color = {
    argb: palette.blue,
  };
  const notes = [
    reportNote,
    "Detail disajikan per titik dan periode yang memiliki pembacaan. Agregasi jam, hari, atau bulan mengikuti filter laporan dan zona waktu WIB (UTC+7).",
    "Volume ditampilkan dengan tiga angka desimal. Nilai numerik asli tetap tersimpan untuk pengolahan lebih lanjut.",
    report.source,
  ];
  for (const note of notes) {
    merged(summary, row, 1, 5, note, 10);
    summary.getRow(row).height = height(note, 100);
    row++;
  }
  printSetup(summary, "E", row - 1, false, report.illustrative);

  merged(
    detail,
    1,
    1,
    7,
    "UNIVERSITAS NEGERI SEMARANG | SIMARA",
    14,
    true,
  ).font.color = { argb: palette.navy };
  merged(detail, 2, 1, 7, "DETAIL MONITORING PENGGUNAAN AIR", 15, true);
  const detailPeriod = `${report.period} | ${dateText(report.start)} – ${dateText(report.end)} (WIB) | Dibuat: ${report.created}`;
  merged(detail, 3, 1, 7, detailPeriod, 10);
  detail.getRow(3).height = height(detailPeriod, 125);
  merged(detail, 4, 1, 7, `${kind} | Lokasi: ${report.location}`, 10);
  detail.getRow(4).height = height(`${kind} | Lokasi: ${report.location}`, 125);
  merged(detail, 5, 1, 7, report.source, 10, true).font.color = {
    argb: palette.blue,
  };
  detail.getRow(6).height = 8;
  merged(
    detail,
    7,
    1,
    7,
    "Volume per titik — produksi dan pemakaian bukan total konsumsi bersih",
    10,
  );
  heading(detail, 8, [
    "No.",
    "Tanggal WIB",
    "Periode WIB",
    "Titik monitoring",
    "Jenis",
    "Volume (m³)",
    "Status data",
  ]);
  report.details.forEach((record, i) => {
    // Keys already represent WIB civil periods. Excel dates have no timezone;
    // encode their calendar components without applying a second UTC+7 shift.
    const day =
      report.mode === "month" ? `${record.key}-01` : record.key.slice(0, 10);
    const line = detail.addRow([
      i + 1,
      new Date(`${day}T00:00:00Z`),
      report.mode === "hour"
        ? `${record.key.slice(11)}:00`
        : report.mode === "month"
          ? "Bulanan"
          : "Harian",
      record.name,
      record.type,
      record.volume,
      report.illustrative ? "DATA CONTOH" : "Monitoring diterima",
    ]);
    dataRow(detail, line.number, 7, i % 2 === 1);
    for (const col of [2, 3, 4, 5, 7])
      line.getCell(col).alignment = {
        wrapText: true,
        vertical: "middle",
        horizontal: "left",
      };
    line.getCell(2).numFmt =
      report.mode === "month" ? "[$-421]mmmm yyyy" : "[$-421]dd mmm yyyy";
    line.getCell(6).numFmt = volumeFormat;
    line.height = height(record.name, 31);
  });
  if (!report.details.length) {
    merged(
      detail,
      9,
      1,
      7,
      "Belum ada data pada rentang dan filter yang dipilih.",
    );
    detail.getRow(9).height = 28;
  }
  detail.autoFilter = {
    from: "A8",
    to: `G${report.details.length ? detail.rowCount : 8}`,
  };
  printSetup(detail, "G", detail.rowCount, true, report.illustrative);
  detail.pageSetup.printTitlesRow = "7:8";

  // Use the existing PNG derived from the supplied SIMARA symbol. No replacement logo.
  // Asset/network failures must never prevent exporting the report.
  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/icon-192.png");
      if (response.ok) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        const base64 = btoa(
          Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""),
        );
        const image = workbook.addImage({
          base64: `data:image/png;base64,${base64}`,
          extension: "png",
        });
        summary.addImage(image, {
          tl: { col: 4.1, row: 0 },
          ext: { width: 52, height: 52 },
          editAs: "absolute",
        });
      }
    } catch {
      /* University and SIMARA identity remain present as text. */
    }
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
