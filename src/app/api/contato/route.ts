import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  CONTACT_BODY_LIMIT_BYTES,
  CONTACT_FORM_MAXIMUM_AGE_MS,
  CONTACT_FORM_MINIMUM_AGE_MS,
  isContactRole,
} from "@/lib/contact";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const TURNSTILE_DEVELOPMENT_SECRET_KEY =
  "1x0000000000000000000000000000000AA";

type ContactPayload = {
  nome?: unknown;
  whatsapp?: unknown;
  cargo?: unknown;
  turnstile_token?: unknown;
  website?: unknown;
  form_started_at?: unknown;
};

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
};

function jsonResponse(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function normalizeName(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (
    normalized.length < 2 ||
    normalized.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function normalizeWhatsapp(value: unknown) {
  if (typeof value !== "string" || value.length > 32) return null;
  const digits = value.replace(/\D/g, "");
  if (!/^\d{10,11}$/.test(digits) || /^(\d)\1+$/.test(digits)) return null;
  return digits;
}

async function verifyTurnstile(
  token: string,
  secret: string,
  expectedHostname: string,
) {
  const body = new URLSearchParams({ secret, response: token });
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (!response.ok) return false;
  const result = (await response.json()) as TurnstileResponse;
  return (
    result.success === true &&
    result.hostname === expectedHostname &&
    result.action === "contact"
  );
}

export async function POST(req: NextRequest) {
  const destinatario = process.env.CONTACT_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const turnstileSecret =
    process.env.TURNSTILE_SECRET_KEY ||
    (process.env.NODE_ENV === "development"
      ? TURNSTILE_DEVELOPMENT_SECRET_KEY
      : undefined);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!resendKey || !destinatario || !turnstileSecret || !appUrl) {
    console.error("Configuração incompleta na API de contato.");
    return jsonResponse({ error: "Serviço temporariamente indisponível." }, 503);
  }

  let expectedHostname: string;
  try {
    expectedHostname =
      process.env.NODE_ENV === "development"
        ? req.nextUrl.hostname
        : new URL(appUrl).hostname;
  } catch {
    console.error("URL da aplicação inválida na API de contato.");
    return jsonResponse({ error: "Serviço temporariamente indisponível." }, 503);
  }

  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ error: "Formato de requisição não suportado." }, 415);
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > CONTACT_BODY_LIMIT_BYTES) {
    return jsonResponse({ error: "Requisição muito grande." }, 413);
  }

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > CONTACT_BODY_LIMIT_BYTES) {
      return jsonResponse({ error: "Requisição muito grande." }, 413);
    }

    let body: ContactPayload;
    try {
      body = JSON.parse(rawBody) as ContactPayload;
    } catch {
      return jsonResponse({ error: "Dados inválidos." }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ error: "Dados inválidos." }, 400);
    }

    if (typeof body.website !== "string" || body.website !== "") {
      return jsonResponse({ success: true });
    }

    const nome = normalizeName(body.nome);
    const whatsapp = normalizeWhatsapp(body.whatsapp);
    const cargo = body.cargo;
    const token = body.turnstile_token;
    const startedAt = body.form_started_at;
    const formAge =
      typeof startedAt === "number" && Number.isFinite(startedAt)
        ? Date.now() - startedAt
        : -1;

    if (
      !nome ||
      !whatsapp ||
      !isContactRole(cargo) ||
      typeof token !== "string" ||
      token.length < 1 ||
      token.length > 2_048 ||
      formAge < CONTACT_FORM_MINIMUM_AGE_MS ||
      formAge > CONTACT_FORM_MAXIMUM_AGE_MS
    ) {
      return jsonResponse({ error: "Confira os dados informados." }, 400);
    }

    if (!(await verifyTurnstile(token, turnstileSecret, expectedHostname))) {
      return jsonResponse({ error: "Não foi possível validar o desafio." }, 403);
    }

    const safeName = escapeHtml(nome);
    const safeWhatsapp = escapeHtml(whatsapp);
    const safeRole = escapeHtml(cargo);
    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({
      from: "SIND Sistema <onboarding@resend.dev>",
      to: destinatario,
      subject: `Nova solicitação de demonstração — ${nome}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
          <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 4px;">Nova solicitação de demonstração</h2>
          <p style="color: #64748b; font-size: 12px; margin-bottom: 24px;">Recebida via formulário do site SIND</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; width: 40%;">Nome</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">WhatsApp</td>
              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 600;">
                <a href="https://wa.me/${whatsapp}" style="color: #2563eb; text-decoration: none;">${safeWhatsapp}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Cargo</td>
              <td style="padding: 12px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${safeRole}</td>
            </tr>
          </table>
          <a href="https://wa.me/${whatsapp}" style="display: block; margin-top: 24px; background: #25d366; color: white; text-align: center; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 12px; text-decoration: none; letter-spacing: 0.05em;">Responder no WhatsApp</a>
          <p style="margin-top: 24px; color: #cbd5e1; font-size: 10px; text-align: center; text-transform: uppercase; letter-spacing: 0.2em;">SIND — Sistema de Molduras Digitais</p>
        </div>
      `,
    });

    if (error) {
      console.error("Falha ao enviar contato pelo provedor de e-mail.");
      return jsonResponse({ error: "Não foi possível enviar sua solicitação." }, 502);
    }

    return jsonResponse({ success: true });
  } catch {
    console.error("Erro inesperado na API de contato.");
    return jsonResponse({ error: "Erro interno." }, 500);
  }
}
