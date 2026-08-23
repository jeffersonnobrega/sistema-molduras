import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const TURNSTILE_DEVELOPMENT_SECRET_KEY =
  "1x0000000000000000000000000000000AA";
const DEVELOPMENT_HASH_SECRET = "sec011-development-hash-secret";

export const LEAD_BODY_LIMIT_BYTES = 4_096;
export const EVENT_BODY_LIMIT_BYTES = 1_024;
export const PUBLIC_EVENT_TYPES = [
  "view",
  "share",
  "colinha_download",
] as const;

export type PublicEventType = (typeof PUBLIC_EVENT_TYPES)[number];

type JsonReadResult =
  | { ok: true; data: unknown }
  | { ok: false; status: 400 | 413 | 415; error: string };

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
};

export type PublicApiConfig = {
  supabaseAdmin: SupabaseClient;
  turnstileSecret: string;
  expectedHostname: string;
  expectedOrigin: string;
  hashSecret: string;
};

export function createPublicApiClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function getPublicApiConfig(request: NextRequest): PublicApiConfig | null {
  const supabaseAdmin = createPublicApiClient();
  const development = process.env.NODE_ENV === "development";
  const turnstileSecret =
    process.env.TURNSTILE_SECRET_KEY ||
    (development ? TURNSTILE_DEVELOPMENT_SECRET_KEY : undefined);
  const hashSecret =
    process.env.PUBLIC_API_HASH_SECRET ||
    (development ? DEVELOPMENT_HASH_SECRET : undefined);
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!supabaseAdmin || !turnstileSecret || !hashSecret || !configuredAppUrl) {
    return null;
  }

  try {
    const applicationUrl = development
      ? new URL(request.nextUrl.origin)
      : new URL(configuredAppUrl);

    return {
      supabaseAdmin,
      turnstileSecret,
      expectedHostname: applicationUrl.hostname,
      expectedOrigin: applicationUrl.origin,
      hashSecret,
    };
  } catch {
    return null;
  }
}

export function isExpectedOrigin(request: NextRequest, expectedOrigin: string) {
  return request.headers.get("origin") === expectedOrigin;
}

export function getClientHash(request: NextRequest, secret: string) {
  const development = process.env.NODE_ENV === "development";
  let clientAddress: string | null = null;

  if (development) {
    clientAddress = "localhost";
  } else if (process.env.VERCEL === "1") {
    clientAddress = request.headers
      .get("x-vercel-forwarded-for")
      ?.split(",")[0]
      ?.trim() ?? null;
  }

  if (!clientAddress || clientAddress.length > 64) return null;

  return createHmac("sha256", secret)
    .update(`sec011:${clientAddress}`)
    .digest("hex");
}

export async function readJsonBody(
  request: NextRequest,
  maximumBytes: number,
): Promise<JsonReadResult> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return { ok: false, status: 415, error: "Formato não suportado." };
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    return { ok: false, status: 413, error: "Requisição muito grande." };
  }

  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maximumBytes) {
      return { ok: false, status: 413, error: "Requisição muito grande." };
    }
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "JSON inválido." };
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
) {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

export function normalizeLeadName(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  const parts = normalized.split(" ").filter(Boolean);
  if (
    normalized.length < 3 ||
    normalized.length > 120 ||
    parts.length < 2 ||
    !/^[\p{L}\s'-]+$/u.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function normalizeE164(value: unknown) {
  if (typeof value !== "string" || value.length > 20) return null;
  return /^\+[1-9][0-9]{7,14}$/.test(value) ? value : null;
}

export function normalizeSlug(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) &&
    normalized.length <= 100
    ? normalized
    : null;
}

export function normalizeUuid(value: unknown) {
  if (typeof value !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value.toLowerCase()
    : null;
}

export function normalizeTurnstileToken(value: unknown) {
  return typeof value === "string" && value.length > 0 && value.length <= 2_048
    ? value
    : null;
}

export function normalizePublicEventType(
  value: unknown,
): PublicEventType | null {
  return typeof value === "string" &&
    PUBLIC_EVENT_TYPES.includes(value as PublicEventType)
    ? (value as PublicEventType)
    : null;
}

export async function verifyTurnstile(
  token: string,
  secret: string,
  expectedHostname: string,
  expectedAction: string,
) {
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (!response.ok) return false;
  const result = (await response.json()) as TurnstileResponse;
  return (
    result.success === true &&
    result.hostname === expectedHostname &&
    result.action === expectedAction
  );
}
