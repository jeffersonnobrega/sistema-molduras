import type { CellObject, SheetData } from "write-excel-file/browser";

export interface LeadExportRecord {
  nome: string;
  whatsapp: string;
  candidato?: string;
  createdAt: string;
}

const FORMULA_PREFIX = /^[\s]*[=+\-@]/;

export function neutralizeSpreadsheetFormula(value: string) {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

function textCell(value: string, protectFromFormula = false): CellObject {
  return {
    value: protectFromFormula ? neutralizeSpreadsheetFormula(value) : value,
    type: String,
    format: "@",
  };
}

function headerCell(value: string): CellObject {
  return {
    ...textCell(value),
    fontWeight: "bold",
  };
}

function formatCaptureDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data inválida"
    : date.toLocaleString("pt-BR");
}

export function buildLeadExportSheet(
  records: LeadExportRecord[],
  includeCandidate: boolean,
) {
  const header = [headerCell("Nome"), headerCell("WhatsApp")];
  if (includeCandidate) header.push(headerCell("Candidato"));
  header.push(headerCell("Data de Captura"));

  const data: SheetData = [
    header,
    ...records.map((record) => {
      const row = [
        textCell(record.nome || "Não informado", true),
        textCell(record.whatsapp),
      ];
      if (includeCandidate) {
        row.push(textCell(record.candidato || "Não informado", true));
      }
      row.push(textCell(formatCaptureDate(record.createdAt)));
      return row;
    }),
  ];

  return {
    data,
    columns: [
      { width: 28 },
      { width: 20 },
      ...(includeCandidate ? [{ width: 24 }] : []),
      { width: 24 },
    ],
  };
}

export function sanitizeExportFileSegment(value: string) {
  const sanitized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return sanitized || "todos";
}
