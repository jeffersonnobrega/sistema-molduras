import { describe, expect, it } from "vitest";
import writeExcelFile from "write-excel-file/node";
import {
  buildLeadExportSheet,
  neutralizeSpreadsheetFormula,
  sanitizeExportFileSegment,
  type LeadExportRecord,
} from "@/lib/leads-export";

describe("Exportação segura de leads", () => {
  it("neutraliza conteúdo que poderia ser interpretado como fórmula", () => {
    expect(neutralizeSpreadsheetFormula("=HYPERLINK(\"https://x\")")).toBe(
      "'=HYPERLINK(\"https://x\")",
    );
    expect(neutralizeSpreadsheetFormula("  @SUM(A1:A2)")).toBe(
      "'  @SUM(A1:A2)",
    );
    expect(neutralizeSpreadsheetFormula("João da Silva")).toBe(
      "João da Silva",
    );
  });

  it("sanitiza o trecho variável do nome do arquivo", () => {
    expect(sanitizeExportFileSegment("João / Federal 2026")).toBe(
      "joao-federal-2026",
    );
    expect(sanitizeExportFileSegment("../../arquivo")).toBe("arquivo");
  });

  it(
    "gera um XLSX com 5.000 leads e caracteres em português",
    async () => {
      const specialNames = [
        "João da Silva",
        "Ângela D'Ávila",
        "Conceição Gonçalves",
        "Cleyton 😊",
        "=HYPERLINK(\"https://exemplo.invalid\")",
      ];
      const records: LeadExportRecord[] = Array.from(
        { length: 5_000 },
        (_, index) => ({
          nome: `${specialNames[index % specialNames.length]} ${index}`,
          whatsapp: `+5511${String(index).padStart(9, "0")}`,
          candidato: index % 2 === 0 ? "José Ação" : "Maria Coração",
          createdAt: new Date(2026, 7, 21, 12, index % 60).toISOString(),
        }),
      );

      const startedAt = performance.now();
      const sheet = buildLeadExportSheet(records, true);
      const buffer = await writeExcelFile(sheet.data, {
        sheet: "Leads",
        columns: sheet.columns,
        stickyRowsCount: 1,
      }).toBuffer();
      const duration = performance.now() - startedAt;

      expect(sheet.data).toHaveLength(5_001);
      expect(buffer.byteLength).toBeGreaterThan(50_000);
      expect(duration).toBeLessThan(15_000);
      expect(sheet.data[1][0]).toMatchObject({ value: "João da Silva 0" });
      expect(sheet.data[5][0]).toMatchObject({
        value: "'=HYPERLINK(\"https://exemplo.invalid\") 4",
      });
      expect(sheet.data[2][2]).toMatchObject({ value: "Maria Coração" });
    },
    20_000,
  );
});
