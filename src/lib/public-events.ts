import type { PublicEventType } from "@/lib/public-api";

export function createRequestId() {
  return crypto.randomUUID();
}

export async function recordPublicEvent(
  candidatoSlug: string,
  eventType: PublicEventType,
  requestId = createRequestId(),
) {
  const response = await fetch("/api/public/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request_id: requestId,
      candidato_slug: candidatoSlug,
      event_type: eventType,
    }),
    cache: "no-store",
    keepalive: true,
  });

  if (!response.ok) {
    throw new Error(`Falha ao registrar evento (${response.status}).`);
  }

  return requestId;
}
