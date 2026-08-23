import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: rpcMock }),
}));

import { POST as createLead } from "@/app/api/public/leads/route";
import { POST as createEvent } from "@/app/api/public/events/route";
import {
  getClientHash,
  normalizeE164,
  normalizeLeadName,
  normalizePublicEventType,
  normalizeSlug,
  normalizeUuid,
  readJsonBody,
} from "@/lib/public-api";

const REQUEST_ID = "5c5528f5-2bba-4f8d-85d7-36b1e7baf458";

function jsonRequest(
  path: string,
  body: object,
  requestOrigin = "http://localhost",
  originHeader = requestOrigin,
) {
  return new NextRequest(`${requestOrigin}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: originHeader,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
  rpcMock.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("validação da API pública", () => {
  it("normaliza somente dados aceitos pelo contrato", () => {
    expect(normalizeLeadName("  João   da Silva ")).toBe("João da Silva");
    expect(normalizeLeadName("João")).toBeNull();
    expect(normalizeE164("+5561999999999")).toBe("+5561999999999");
    expect(normalizeE164("61999999999")).toBeNull();
    expect(normalizeSlug("Berg-40")).toBe("berg-40");
    expect(normalizeSlug("../../admin")).toBeNull();
    expect(normalizeUuid(REQUEST_ID)).toBe(REQUEST_ID);
    expect(normalizeUuid("não-é-uuid")).toBeNull();
    expect(normalizePublicEventType("view")).toBe("view");
    expect(normalizePublicEventType("delete")).toBeNull();
  });

  it("limita o corpo mesmo sem confiar em content-length", async () => {
    const request = jsonRequest("/api/public/events", { value: "x".repeat(80) });
    const result = await readJsonBody(request, 32);
    expect(result).toEqual({
      ok: false,
      status: 413,
      error: "Requisição muito grande.",
    });
  });

  it("produz somente um HMAC e não retorna o endereço de origem", () => {
    const request = jsonRequest("/api/public/events", {});
    const hash = getClientHash(request, "segredo-de-teste");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("localhost");
  });
});

describe("POST /api/public/leads", () => {
  it("valida Turnstile e encaminha dados normalizados à operação atômica", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            hostname: "localhost",
            action: "lead",
          }),
          { status: 200 },
        ),
      ),
    );
    rpcMock.mockResolvedValue({ data: { status: "created" }, error: null });

    const response = await createLead(
      jsonRequest("/api/public/leads", {
        request_id: REQUEST_ID,
        candidato_slug: "berg40",
        nome: "  João   da Silva ",
        whatsapp: "+5561999999999",
        lgpd_consent: true,
        consent_version: "1.0",
        turnstile_token: "token-válido",
      }),
    );

    expect(response.status).toBe(201);
    expect(rpcMock).toHaveBeenCalledWith("create_public_lead", {
      request_id_value: REQUEST_ID,
      candidato_slug_value: "berg40",
      nome_value: "João da Silva",
      whatsapp_value: "+5561999999999",
      consent_version_value: "1.0",
      client_hash_value: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("recusa origem diferente antes de validar o desafio", async () => {
    const response = await createLead(
      jsonRequest(
        "/api/public/leads",
        { request_id: REQUEST_ID },
        "http://localhost",
        "http://evil.local",
      ),
    );
    expect(response.status).toBe(403);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("converte rate limit persistente em HTTP 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            hostname: "localhost",
            action: "lead",
          }),
          { status: 200 },
        ),
      ),
    );
    rpcMock.mockResolvedValue({
      data: { status: "rate_limited" },
      error: null,
    });

    const response = await createLead(
      jsonRequest("/api/public/leads", {
        request_id: REQUEST_ID,
        candidato_slug: "berg40",
        nome: "João da Silva",
        whatsapp: "+5561999999999",
        lgpd_consent: true,
        consent_version: "1.0",
        turnstile_token: "token-válido",
      }),
    );
    expect(response.status).toBe(429);
  });
});

describe("POST /api/public/events", () => {
  it("registra evento por operação atômica", async () => {
    rpcMock.mockResolvedValue({ data: { status: "recorded" }, error: null });
    const response = await createEvent(
      jsonRequest("/api/public/events", {
        request_id: REQUEST_ID,
        candidato_slug: "berg40",
        event_type: "share",
      }),
    );

    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("record_public_event", {
      request_id_value: REQUEST_ID,
      candidato_slug_value: "berg40",
      event_type_value: "share",
      client_hash_value: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("recusa campos fora da lista positiva", async () => {
    const response = await createEvent(
      jsonRequest("/api/public/events", {
        request_id: REQUEST_ID,
        candidato_slug: "berg40",
        event_type: "view",
        total_views: 999999,
      }),
    );
    expect(response.status).toBe(400);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
