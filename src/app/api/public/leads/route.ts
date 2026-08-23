import { NextRequest, NextResponse } from "next/server";
import {
  LEAD_BODY_LIMIT_BYTES,
  getClientHash,
  getPublicApiConfig,
  hasOnlyKeys,
  isExpectedOrigin,
  isPlainObject,
  normalizeE164,
  normalizeLeadName,
  normalizeSlug,
  normalizeTurnstileToken,
  normalizeUuid,
  readJsonBody,
  verifyTurnstile,
} from "@/lib/public-api";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const LEAD_KEYS = [
  "request_id",
  "candidato_slug",
  "nome",
  "whatsapp",
  "lgpd_consent",
  "consent_version",
  "turnstile_token",
] as const;

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
    console.error("Configuração incompleta na API pública de leads.");
    return jsonResponse({ error: "Serviço temporariamente indisponível." }, 503);
  }

  if (!isExpectedOrigin(request, config.expectedOrigin)) {
    return jsonResponse({ error: "Origem não autorizada." }, 403);
  }

  const clientHash = getClientHash(request, config.hashSecret);
  if (!clientHash) {
    return jsonResponse({ error: "Requisição não autorizada." }, 403);
  }

  const parsed = await readJsonBody(request, LEAD_BODY_LIMIT_BYTES);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, parsed.status);
  }

  if (!isPlainObject(parsed.data) || !hasOnlyKeys(parsed.data, LEAD_KEYS)) {
    return jsonResponse({ error: "Dados inválidos." }, 400);
  }

  const requestId = normalizeUuid(parsed.data.request_id);
  const candidatoSlug = normalizeSlug(parsed.data.candidato_slug);
  const nome = normalizeLeadName(parsed.data.nome);
  const whatsapp = normalizeE164(parsed.data.whatsapp);
  const turnstileToken = normalizeTurnstileToken(parsed.data.turnstile_token);

  if (
    !requestId ||
    !candidatoSlug ||
    !nome ||
    !whatsapp ||
    !turnstileToken ||
    parsed.data.lgpd_consent !== true ||
    parsed.data.consent_version !== "1.0"
  ) {
    return jsonResponse({ error: "Confira os dados informados." }, 400);
  }

  let challengeValid = false;
  try {
    challengeValid = await verifyTurnstile(
      turnstileToken,
      config.turnstileSecret,
      config.expectedHostname,
      "lead",
    );
  } catch {
    return jsonResponse({ error: "Serviço de validação indisponível." }, 503);
  }

  if (!challengeValid) {
    return jsonResponse({ error: "Não foi possível validar o desafio." }, 403);
  }

  const { data, error } = await config.supabaseAdmin.rpc("create_public_lead", {
    request_id_value: requestId,
    candidato_slug_value: candidatoSlug,
    nome_value: nome,
    whatsapp_value: whatsapp,
    consent_version_value: "1.0",
    client_hash_value: clientHash,
  });

  if (error) {
    console.error("Falha na operação atômica de lead:", error.code);
    return jsonResponse({ error: "Não foi possível salvar os dados." }, 500);
  }

  const status = rpcStatus(data);
  if (status === "rate_limited") {
    return jsonResponse({ error: "Muitas tentativas. Aguarde e tente novamente." }, 429);
  }
  if (status === "candidate_unavailable") {
    return jsonResponse({ error: "Campanha indisponível." }, 404);
  }
  if (status === "created" || status === "duplicate") {
    return jsonResponse({ ok: true, duplicate: status === "duplicate" }, status === "created" ? 201 : 200);
  }

  console.error("Resposta inesperada na operação atômica de lead.");
  return jsonResponse({ error: "Não foi possível salvar os dados." }, 500);
}
