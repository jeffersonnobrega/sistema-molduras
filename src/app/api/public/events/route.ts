import { NextRequest, NextResponse } from "next/server";
import {
  EVENT_BODY_LIMIT_BYTES,
  getClientHash,
  getPublicApiConfig,
  hasOnlyKeys,
  isExpectedOrigin,
  isPlainObject,
  normalizePublicEventType,
  normalizeSlug,
  normalizeUuid,
  readJsonBody,
} from "@/lib/public-api";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const EVENT_KEYS = ["request_id", "candidato_slug", "event_type"] as const;

function jsonResponse(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function rpcStatus(value: unknown) {
  if (!isPlainObject(value) || typeof value.status !== "string") return null;
  return value.status;
}

export async function POST(request: NextRequest) {
  const config = getPublicApiConfig(request);
  if (!config) {
    console.error("Configuração incompleta na API pública de eventos.");
    return jsonResponse({ error: "Serviço temporariamente indisponível." }, 503);
  }

  if (!isExpectedOrigin(request, config.expectedOrigin)) {
    return jsonResponse({ error: "Origem não autorizada." }, 403);
  }

  const clientHash = getClientHash(request, config.hashSecret);
  if (!clientHash) {
    return jsonResponse({ error: "Requisição não autorizada." }, 403);
  }

  const parsed = await readJsonBody(request, EVENT_BODY_LIMIT_BYTES);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, parsed.status);
  }

  if (!isPlainObject(parsed.data) || !hasOnlyKeys(parsed.data, EVENT_KEYS)) {
    return jsonResponse({ error: "Dados inválidos." }, 400);
  }

  const requestId = normalizeUuid(parsed.data.request_id);
  const candidatoSlug = normalizeSlug(parsed.data.candidato_slug);
  const eventType = normalizePublicEventType(parsed.data.event_type);
  if (!requestId || !candidatoSlug || !eventType) {
    return jsonResponse({ error: "Confira os dados informados." }, 400);
  }

  const { data, error } = await config.supabaseAdmin.rpc("record_public_event", {
    request_id_value: requestId,
    candidato_slug_value: candidatoSlug,
    event_type_value: eventType,
    client_hash_value: clientHash,
  });

  if (error) {
    console.error("Falha na operação atômica de evento:", error.code);
    return jsonResponse({ error: "Não foi possível registrar o evento." }, 500);
  }

  const status = rpcStatus(data);
  if (status === "rate_limited") {
    return jsonResponse({ error: "Limite temporário atingido." }, 429);
  }
  if (status === "candidate_unavailable") {
    return jsonResponse({ error: "Campanha indisponível." }, 404);
  }
  if (status === "recorded" || status === "duplicate") {
    return jsonResponse({ ok: true, duplicate: status === "duplicate" });
  }

  console.error("Resposta inesperada na operação atômica de evento.");
  return jsonResponse({ error: "Não foi possível registrar o evento." }, 500);
}
