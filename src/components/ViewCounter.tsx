"use client";
import { useEffect } from "react";
import { createRequestId, recordPublicEvent } from "@/lib/public-events";

export default function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    const storageKey = `view-event:${slug}`;
    let requestId = sessionStorage.getItem(storageKey);
    if (!requestId) {
      requestId = createRequestId();
      sessionStorage.setItem(storageKey, requestId);
    }

    recordPublicEvent(slug, "view", requestId).catch(() => {
      console.error("Não foi possível registrar a visualização.");
    });
  }, [slug]);

  return null;
}
