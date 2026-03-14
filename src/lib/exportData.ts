/**
 * Universal data export utility
 * Supports CSV, JSON, and XLSX-like exports
 */

export type ExportFormat = "csv" | "json";

interface ExportOptions {
  filename: string;
  format: ExportFormat;
  columns?: { key: string; label: string }[];
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: string; label: string }[]
): string {
  // BOM for Hebrew support in Excel
  const bom = "\uFEFF";
  const header = columns.map((c) => escapeCSV(c.label)).join(",");
  const rows = data.map((row) =>
    columns.map((c) => escapeCSV(row[c.key])).join(",")
  );
  return bom + [header, ...rows].join("\n");
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportData<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions
) {
  const { filename, format, columns } = options;

  if (format === "json") {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `${filename}.json`, "application/json;charset=utf-8");
    return;
  }

  if (format === "csv") {
    if (!columns) throw new Error("Columns required for CSV export");
    const csvContent = exportToCSV(data, columns);
    downloadFile(csvContent, `${filename}.csv`, "text/csv;charset=utf-8");
    return;
  }
}

/**
 * Share file via Web Share API (mobile) or fallback to download
 */
export async function shareFile<T extends Record<string, any>>(
  data: T[] | string,
  options: ExportOptions & { title?: string; text?: string }
) {
  const { filename, format, columns, title, text } = options;

  let content: string;
  let mimeType: string;
  let ext: string;

  if (format === "json") {
    content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    mimeType = "application/json";
    ext = "json";
  } else {
    if (!columns) throw new Error("Columns required for CSV export");
    content = typeof data === "string" ? data : exportToCSV(data as any[], columns);
    mimeType = "text/csv";
    ext = "csv";
  }

  const file = new File([content], `${filename}.${ext}`, { type: mimeType });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: title || filename,
        text: text || "",
        files: [file],
      });
      return true;
    } catch (e) {
      if ((e as Error).name === "AbortError") return false;
    }
  }

  // Fallback: download
  downloadFile(content, `${filename}.${ext}`, `${mimeType};charset=utf-8`);
  return true;
}
