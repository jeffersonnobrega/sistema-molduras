"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    // Dispara o incremento apenas uma vez por carregamento de página
    supabase
      .rpc("increment_views_count", { slug_candidato: slug })
      .then(({ error }) => {
        if (error) console.error("Erro ao contar view:", error.message);
      });
  }, [slug]);

  return null; // Componente invisível
}
