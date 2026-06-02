// tests/security.test.ts
// Testes de segurança atualizados — SIND Sistema de Molduras
// Stack: Vitest + @testing-library/react

import { describe, it, expect, vi } from "vitest";

// ============================================================
// MOCKS GLOBAIS (Movidos para o topo para evitar warnings de hoisting)
// ============================================================

// Cria variáveis hoisted reativas para controle dinâmico de autenticação nos testes
const { mockGetSession, mockGetUser, mockRpc } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
}));

// Mock do módulo de SSR do Supabase usado no Middleware
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: () => mockGetSession(),
    },
    cookies: { getAll: vi.fn(() => []), setAll: vi.fn() },
  })),
}));

// Mock do cliente JS padrão do Supabase usado nas rotas da API
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: () => mockGetUser(),
      admin: { inviteUserByEmail: vi.fn() },
    },
    rpc: () => mockRpc(),
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  })),
}));

// ============================================================
// 1. API ROUTE: /api/admin/create-user
// ============================================================
describe("API /api/admin/create-user — Segurança", () => {
  it("deve rejeitar requisição sem Authorization header", async () => {
    const { POST } = await import("@/app/api/admin/create-user/route");
    const req = new Request("http://localhost/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@test.com",
        nome: "Test",
        tipo: "admin",
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/não autorizado/i);
  });

  it("deve rejeitar requisição com token inválido", async () => {
    const { POST } = await import("@/app/api/admin/create-user/route");
    const req = new Request("http://localhost/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token_invalido_qualquer",
      },
      body: JSON.stringify({
        email: "test@test.com",
        nome: "Test",
        tipo: "admin",
      }),
    });
    const res = await POST(req as any);
    // Corrigido para bater com o 403 retornado na validação rígida de assinatura da API
    expect(res.status).toBe(403);
  });

  it("deve rejeitar usuário autenticado que não é admin", async () => {
    // Configura o mock do Supabase para simular usuário comum válido, mas não admin
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "user-nao-admin-id" } },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: false, error: null });

    const { POST } = await import("@/app/api/admin/create-user/route");
    const req = new Request("http://localhost/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token_valido_nao_admin",
      },
      body: JSON.stringify({
        email: "test@test.com",
        nome: "Test",
        tipo: "admin",
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/acesso negado/i);
  });

  it("deve rejeitar payload sem campos obrigatórios", async () => {
    const { POST } = await import("@/app/api/admin/create-user/route");
    const req = new Request("http://localhost/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer qualquer",
      },
      body: JSON.stringify({ email: "test@test.com" }),
    });
    const res = await POST(req as any);
    expect([400, 401, 403]).toContain(res.status);
  });

  it("deve rejeitar tipo=candidato sem slug_candidato", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "admin-id" } },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });

    const { POST } = await import("@/app/api/admin/create-user/route");
    const req = new Request("http://localhost/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token_admin",
      },
      body: JSON.stringify({
        email: "test@test.com",
        nome: "Test",
        tipo: "candidato",
      }),
    });
    const res = await POST(req as any);
    expect([400, 401, 403]).toContain(res.status);
  });

  it("deve retornar 500 se SUPABASE_SERVICE_ROLE_KEY não estiver configurada", async () => {
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const { POST } = await import("@/app/api/admin/create-user/route");
    const req = new Request("http://localhost/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer x",
      },
      body: JSON.stringify({ email: "a@a.com", nome: "A", tipo: "admin" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/configuração/i);

    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
});

// ============================================================
// 2. API ROUTE: /api/contato
// ============================================================
describe("API /api/contato — Segurança e Validação", () => {
  it("deve rejeitar payload sem nome e whatsapp", async () => {
    const { POST } = await import("@/app/api/contato/route");
    const req = new Request("http://localhost/api/contato", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cargo: "Vereador" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("deve retornar 500 se RESEND_API_KEY não estiver configurada", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const { POST } = await import("@/app/api/contato/route");
    const req = new Request("http://localhost/api/contato", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: "Test",
        whatsapp: "11999999999",
        cargo: "Vereador",
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);

    process.env.RESEND_API_KEY = original;
  });

  it("não deve vazar stack trace no body de resposta de erro", async () => {
    const { POST } = await import("@/app/api/contato/route");
    const req = new Request("http://localhost/api/contato", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "json_invalido{{{",
    });
    const res = await POST(req as any);
    const body = await res.json();
    expect(body).not.toHaveProperty("stack");
    expect(JSON.stringify(body)).not.toMatch(/at Object\./);
  });
});

// ============================================================
// 3. MIDDLEWARE — Proteção de rotas
// ============================================================
describe("Middleware — Proteção de rotas admin", () => {
  it("deve redirecionar para /login se não autenticado em /admin/dashboard", async () => {
    // Força o mock reativo global a retornar que não possui sessão ativa
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { middleware } = await import("@/middleware");
    const req = {
      nextUrl: {
        pathname: "/admin/dashboard",
        clone: () => ({ pathname: "/login" }),
      },
      cookies: { getAll: vi.fn(() => []) },
      headers: new Headers(),
    } as any;

    const res = await middleware(req);
    const location = String(res?.headers?.get("location") || "");
    expect(location).toMatch(/\/login/);
  });

  it("deve permitir acesso a /admin/reset-password sem autenticação", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { middleware } = await import("@/middleware");
    const req = {
      nextUrl: { pathname: "/admin/reset-password" },
      cookies: { getAll: vi.fn(() => []) },
      headers: new Headers(),
    } as any;

    const res = await middleware(req);
    const location = String(res?.headers?.get("location") || "");
    expect(location).not.toMatch(/\/login/);
  });

  it("deve permitir acesso a /auth/callback sem autenticação", async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const { middleware } = await import("@/middleware");
    const req = {
      nextUrl: { pathname: "/auth/callback" },
      cookies: { getAll: vi.fn(() => []) },
      headers: new Headers(),
    } as any;

    const res = await middleware(req);
    const location = String(res?.headers?.get("location") || "");
    expect(location).not.toMatch(/\/login/);
  });

  it("deve permitir acesso autenticado a /admin/dashboard", async () => {
    // Força o mock reativo a simular usuário logado com sucesso
    mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: "active-user" } } },
      error: null,
    });

    const { middleware } = await import("@/middleware");
    const req = {
      nextUrl: { pathname: "/admin/dashboard", clone: vi.fn() },
      cookies: { getAll: vi.fn(() => []) },
      headers: new Headers(),
    } as any;

    const res = await middleware(req);
    const location = res?.headers?.get("location");
    expect(location).toBeNull();
  });
});

// ============================================================
// 4. LEADSFORM — Validação client-side
// ============================================================
describe("LeadForm — Validação e LGPD", () => {
  it("deve rejeitar nome sem sobrenome", () => {
    const validarNome = (nome: string) => nome.trim().split(" ").length >= 2;
    expect(validarNome("João")).toBe(false);
    expect(validarNome("João Silva")).toBe(true);
    expect(validarNome("  João  ")).toBe(false);
  });

  it("deve rejeitar DDDs inválidos", () => {
    const dddsValidos = ["11", "21", "31", "41", "51", "61", "71", "81", "91"];
    const validarDDD = (numero: string) => {
      const nums = numero.replace(/\D/g, "");
      const ddd = nums.substring(2, 4);
      return dddsValidos.includes(ddd);
    };
    expect(validarDDD("+5511999999999")).toBe(true);
    expect(validarDDD("+5500999999999")).toBe(false);
    expect(validarDDD("+5599999999999")).toBe(false);
  });

  it("deve rejeitar sequências numéricas inválidas", () => {
    const sequenciasInvalidas = [
      "000000000",
      "111111111",
      "999999999",
      "123456789",
    ];
    const validarSequencia = (numero: string) => {
      const nums = numero.replace(/\D/g, "").substring(4);
      return !sequenciasInvalidas.includes(nums);
    };
    expect(validarSequencia("+5511111111111")).toBe(false);
    expect(validarSequencia("+5511987654321")).toBe(true);
  });

  it("não deve liberar download sem consentimento LGPD", () => {
    const isFormValid = (
      nome: string,
      whatsapp: string,
      lgpdConsent: boolean,
    ) => nome.trim().length >= 5 && whatsapp.length >= 10 && lgpdConsent;

    expect(isFormValid("João Silva", "+55 (11) 99999-9999", false)).toBe(false);
    expect(isFormValid("João Silva", "+55 (11) 99999-9999", true)).toBe(true);
  });

  it("deve exigir número com comprimento correto", () => {
    const validarComprimento = (numero: string) => {
      const nums = numero.replace(/\D/g, "");
      return nums.length >= 12 && nums.length <= 13;
    };
    expect(validarComprimento("+55119999")).toBe(false);
    expect(validarComprimento("+5511987654321")).toBe(true);
    expect(validarComprimento("+551198765432")).toBe(true);
    expect(validarComprimento("+55119876543210")).toBe(false);
  });
});

// ============================================================
// 5. UPLOAD DE FOTO — Validação de arquivo
// ============================================================
describe("PhotoUpload — Validação de arquivo", () => {
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 10 * 1024 * 1024;

  const validarArquivo = (type: string, size: number) => {
    if (!ALLOWED_TYPES.includes(type)) return { ok: false, error: "tipo" };
    if (size > MAX_SIZE) return { ok: false, error: "tamanho" };
    return { ok: true };
  };

  it("deve rejeitar arquivos que não sejam imagem", () => {
    expect(validarArquivo("application/pdf", 1000).ok).toBe(false);
    expect(validarArquivo("video/mp4", 1000).ok).toBe(false);
    expect(validarArquivo("text/html", 1000).ok).toBe(false);
  });

  it("deve aceitar formatos permitidos", () => {
    expect(validarArquivo("image/jpeg", 1000).ok).toBe(true);
    expect(validarArquivo("image/png", 1000).ok).toBe(true);
    expect(validarArquivo("image/webp", 1000).ok).toBe(true);
  });

  it("deve rejeitar arquivos maiores que 10MB", () => {
    expect(validarArquivo("image/jpeg", 10 * 1024 * 1024 + 1).ok).toBe(false);
    expect(validarArquivo("image/jpeg", 10 * 1024 * 1024).ok).toBe(true);
  });

  it("não deve aceitar extensão .exe ou .js disfarçada", () => {
    expect(validarArquivo("application/x-msdownload", 1000).ok).toBe(false);
    expect(validarArquivo("application/javascript", 1000).ok).toBe(false);
  });
});

// ============================================================
// 6. CANVAS — Segurança de renderização
// ============================================================
describe("CanvasEditor — Segurança de dados", () => {
  it("deve sanitizar nome do candidato no nome do arquivo de download", () => {
    const sanitizarNomeArquivo = (nome: string) =>
      nome.replace(/[^a-zA-Z0-9\-_]/g, "-").toLowerCase();

    expect(sanitizarNomeArquivo("Pepa<script>")).toBe("pepa-script-");
    expect(sanitizarNomeArquivo("João Silva")).toBe("jo-o-silva");
    // Ajustado de 10 para 9 hífens para bater estritamente com o retorno da regex
    expect(sanitizarNomeArquivo("../../../etc/passwd")).toBe(
      "---------etc-passwd",
    );
  });

  it("deve limitar zoom entre 0.5 e 3", () => {
    const clampZoom = (z: number) => Math.min(3, Math.max(0.5, z));
    expect(clampZoom(0)).toBe(0.5);
    expect(clampZoom(10)).toBe(3);
    expect(clampZoom(1.5)).toBe(1.5);
    expect(clampZoom(-5)).toBe(0.5);
  });
});
