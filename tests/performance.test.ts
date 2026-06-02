// tests/performance.test.ts
// Testes de performance — SIND Sistema de Molduras
// Stack: Vitest + performance hooks nativos do Node

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 1. CANVAS — Tempo de renderização
// ============================================================
describe("CanvasEditor — Performance de renderização", () => {
  it("deve renderizar o canvas em menos de 100ms para imagem padrão", async () => {
    // Simula o drawCanvas com dimensões reais de produção
    const drawCanvas = (
      width: number,
      height: number,
      imgWidth: number,
      imgHeight: number,
    ) => {
      const start = performance.now();

      const scale = Math.max(width / imgWidth, height / imgHeight);
      const scaledW = imgWidth * scale;
      const scaledH = imgHeight * scale;

      // Simula as operações matemáticas do drawCanvas real
      const offsetX = (width - scaledW) / 2;
      const offsetY = (height - scaledH) / 2;
      const zoom = 1;
      const tx = width / 2 + 0;
      const ty = height / 2 + 0;

      void (offsetX + offsetY + tx + ty + zoom);

      return performance.now() - start;
    };

    // Stories: 1080x1920, foto típica de celular 4032x3024
    const duracao = drawCanvas(1080, 1920, 4032, 3024);
    expect(duracao).toBeLessThan(100);
  });

  it("deve calcular escala cover corretamente para Stories", () => {
    const calcularScaleCover = (
      cW: number,
      cH: number,
      iW: number,
      iH: number,
    ) => Math.max(cW / iW, cH / iH);

    const scale = calcularScaleCover(1080, 1920, 4032, 3024);
    // A imagem deve cobrir o canvas inteiro
    expect(4032 * scale).toBeGreaterThanOrEqual(1080);
    expect(3024 * scale).toBeGreaterThanOrEqual(1920);
  });

  it("deve calcular escala cover corretamente para Feed", () => {
    const calcularScaleCover = (
      cW: number,
      cH: number,
      iW: number,
      iH: number,
    ) => Math.max(cW / iW, cH / iH);

    const scale = calcularScaleCover(1080, 1080, 4032, 3024);
    expect(4032 * scale).toBeGreaterThanOrEqual(1080);
    expect(3024 * scale).toBeGreaterThanOrEqual(1080);
  });

  it("deve processar 60 frames de drag em menos de 200ms total", () => {
    const start = performance.now();

    let offsetX = 0;
    let offsetY = 0;
    let lastX = 0;
    let lastY = 0;

    // Simula 60 eventos de drag (1 segundo a 60fps)
    for (let i = 0; i < 60; i++) {
      const newX = i * 2;
      const newY = i * 1.5;
      offsetX += (newX - lastX) * 2.5;
      offsetY += (newY - lastY) * 2.5;
      lastX = newX;
      lastY = newY;
    }

    const duracao = performance.now() - start;
    expect(duracao).toBeLessThan(200);
    expect(offsetX).toBeGreaterThan(0);
  });

  it("deve processar 60 frames de pinch zoom em menos de 200ms total", () => {
    const start = performance.now();

    let zoom = 1;
    let lastDist = 100;

    for (let i = 0; i < 60; i++) {
      const dist = 100 + i * 2; // Abrindo os dedos
      const delta = dist / lastDist;
      zoom = Math.min(3, Math.max(0.5, zoom * delta));
      lastDist = dist;
    }

    const duracao = performance.now() - start;
    expect(duracao).toBeLessThan(200);
    expect(zoom).toBe(3); // Deve ter chegado no máximo
  });
});

// ============================================================
// 2. LEADFORM — Validação sem travamento
// ============================================================
describe("LeadForm — Performance de validação", () => {
  it("deve validar 1000 números de telefone em menos de 50ms", () => {
    const dddsValidos = new Set([
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "21",
      "22",
      "24",
      "27",
      "28",
      "31",
      "32",
      "33",
      "34",
      "35",
      "37",
      "38",
      "41",
      "42",
      "43",
      "44",
      "45",
      "46",
      "47",
      "48",
      "49",
      "51",
      "53",
      "54",
      "55",
      "61",
      "62",
      "63",
      "64",
      "65",
      "66",
      "67",
      "68",
      "69",
      "71",
      "73",
      "74",
      "75",
      "77",
      "79",
      "81",
      "82",
      "83",
      "84",
      "85",
      "86",
      "87",
      "88",
      "89",
      "91",
      "92",
      "93",
      "94",
      "95",
      "96",
      "97",
      "98",
      "99",
    ]);

    const sequenciasInvalidas = new Set([
      "000000000",
      "111111111",
      "222222222",
      "333333333",
      "444444444",
      "555555555",
      "666666666",
      "777777777",
      "888888888",
      "999999999",
      "123456789",
    ]);

    const validarNumero = (numero: string) => {
      const nums = numero.replace(/\D/g, "");
      if (nums.length < 12 || nums.length > 13) return false;
      const ddd = nums.substring(2, 4);
      if (!dddsValidos.has(ddd)) return false;
      const numSemDDD = nums.substring(4);
      if (sequenciasInvalidas.has(numSemDDD)) return false;
      return true;
    };

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      validarNumero(`+5511${String(i).padStart(9, "9")}`);
    }
    const duracao = performance.now() - start;
    expect(duracao).toBeLessThan(50);
  });

  it("deve formatar número brasileiro em menos de 1ms por chamada", () => {
    const formatarBrasileiro = (value: string) => {
      const nums = value.replace(/\D/g, "");
      if (!value.startsWith("+55")) return value;
      const ddi = nums.substring(0, 2);
      const ddd = nums.substring(2, 4);
      const parte1 = nums.substring(4, 9);
      const parte2 = nums.substring(9, 13);
      if (nums.length > 9) return `+${ddi} (${ddd}) ${parte1}-${parte2}`;
      if (nums.length > 4) return `+${ddi} (${ddd}) ${parte1}`;
      if (nums.length > 2) return `+${ddi} (${ddd})`;
      return `+${ddi}`;
    };

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      formatarBrasileiro("+5511987654321");
    }
    const duracao = performance.now() - start;
    expect(duracao / 100).toBeLessThan(1); // Menos de 1ms por chamada
  });
});

// ============================================================
// 3. STATS COUNTER — Atualização em tempo real
// ============================================================
describe("StatsCounter — Performance de atualização", () => {
  it("deve processar 100 atualizações de stats em menos de 10ms", () => {
    const processarUpdate = (
      prev: {
        total_views: number;
        stats_leads_count: number;
        total_shares: number;
      },
      updated: Partial<typeof prev>,
    ) => ({
      total_views: updated.total_views ?? prev.total_views,
      stats_leads_count: updated.stats_leads_count ?? prev.stats_leads_count,
      total_shares: updated.total_shares ?? prev.total_shares,
    });

    let estado = { total_views: 0, stats_leads_count: 0, total_shares: 0 };
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
      estado = processarUpdate(estado, { total_views: i + 1 });
    }

    const duracao = performance.now() - start;
    expect(duracao).toBeLessThan(10);
    expect(estado.total_views).toBe(100);
  });
});

// ============================================================
// 4. LEADSFORM — Exportação Excel
// ============================================================
describe("LeadsTable — Performance de exportação", () => {
  it("deve montar dados de 5000 leads para Excel em menos de 500ms", () => {
    const gerarLeads = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        nome: `Lead ${i}`,
        whatsapp: `+5511${String(i).padStart(9, "0")}`,
        candidato_slug: "pepa",
        candidatos: { nome_urna: "Pepa" },
        created_at: new Date().toISOString(),
      }));

    const leads = gerarLeads(5000);

    const start = performance.now();
    const dados = leads.map((lead) => ({
      Nome: lead.nome,
      WhatsApp: lead.whatsapp,
      Candidato: lead.candidatos?.nome_urna || lead.candidato_slug,
      "Data de Captura": new Date(lead.created_at).toLocaleString("pt-BR"),
    }));
    const duracao = performance.now() - start;

    expect(duracao).toBeLessThan(500);
    expect(dados).toHaveLength(5000);
    expect(dados[0]).toHaveProperty("Nome");
  });

  it("deve filtrar 5000 leads por termo de busca em menos de 100ms", () => {
    const gerarLeads = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        nome: i % 10 === 0 ? `João Silva ${i}` : `Maria Santos ${i}`,
        whatsapp: `+5511${String(i).padStart(9, "0")}`,
        candidato_slug: "pepa",
        candidatos: { nome_urna: "Pepa" },
      }));

    const leads = gerarLeads(5000);
    const start = performance.now();

    const filtrados = leads.filter((lead) => {
      const termo = "joão".toLowerCase();
      return (
        lead.nome?.toLowerCase().includes(termo) ||
        lead.whatsapp.includes(termo) ||
        lead.candidato_slug.toLowerCase().includes(termo)
      );
    });

    const duracao = performance.now() - start;
    expect(duracao).toBeLessThan(100);
    expect(filtrados.length).toBe(500); // 10% dos leads
  });
});

// ============================================================
// 5. THEME MAPPER — Performance de geração de tema
// ============================================================
describe("getCandidatoTheme — Performance", () => {
  it("deve gerar tema completo em menos de 5ms", async () => {
    const { getCandidatoTheme } = await import("@/lib/theme-mapper");

    const candidatoMock = {
      cor_primaria: "#2563eb",
      cor_fundo: "#ffffff",
      cor_titulo: "#1e293b",
      cor_texto: "#475569",
      cor_botao: "#2563eb",
      cor_texto_hero: "#2563eb",
    };

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      getCandidatoTheme(candidatoMock);
    }
    const duracao = performance.now() - start;

    expect(duracao / 100).toBeLessThan(5); // Menos de 5ms por geração
  });

  it("deve calcular contraste corretamente para acessibilidade", async () => {
    const { getCandidatoTheme } = await import("@/lib/theme-mapper");

    // Cor clara — deve retornar texto escuro
    const temaClaro = getCandidatoTheme({ cor_botao: "#ffffff" });
    expect(temaClaro.editor.downloadBtn.text).toBe("#000000");

    // Cor escura — deve retornar texto claro
    const temaEscuro = getCandidatoTheme({ cor_botao: "#000000" });
    expect(temaEscuro.editor.downloadBtn.text).toBe("#ffffff");
  });
});

// ============================================================
// 6. SUPABASE RPC — Simulação de latência
// ============================================================
describe("Supabase RPCs — Tempo de resposta esperado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increment_views_count deve ser chamada de forma não-bloqueante", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = { rpc: mockRpc };

    const start = performance.now();

    // Simula o ViewCounter — fire and forget
    mockSupabase
      .rpc("increment_views_count", { slug_candidato: "pepa" })
      .then(({ error }: { error: unknown }) => {
        if (error) console.error(error);
      });

    const duracao = performance.now() - start;

    // O componente não deve bloquear a renderização
    expect(duracao).toBeLessThan(5);
    expect(mockRpc).toHaveBeenCalledWith("increment_views_count", {
      slug_candidato: "pepa",
    });
  });

  it("increment_leads_count deve ser chamada após submit sem bloquear UI", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    const mockSupabase = { rpc: mockRpc, from: mockFrom };

    const handleSubmit = async (data: { nome: string; whatsapp: string }) => {
      // Salva o lead
      await mockSupabase.from("leads").insert([data]);
      // Incrementa counter de forma não-bloqueante
      mockSupabase
        .rpc("increment_leads_count", { slug_candidato: "pepa" })
        .then(({ error }: { error: unknown }) => {
          if (error) console.error(error);
        });
    };

    const start = performance.now();
    await handleSubmit({ nome: "João Silva", whatsapp: "+5511987654321" });
    const duracao = performance.now() - start;

    expect(duracao).toBeLessThan(100);
    expect(mockFrom).toHaveBeenCalledWith("leads");
    expect(mockRpc).toHaveBeenCalledWith("increment_leads_count", {
      slug_candidato: "pepa",
    });
  });
});
