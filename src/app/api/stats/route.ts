// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Força a rota a sempre buscar dados novos, evitando cache antigo do build
export const revalidate = 0;

export async function GET() {
  // O modificador { count: 'exact', head: true } faz o Supabase retornar
  // APENAS o número de registros, sem trafegar os dados dos leads. Super rápido!
  const { count, error } = await supabase
    .from("leads_candidatos") // <-- Substitua pelo nome exato da sua tabela de leads
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ totalLeads: count || 0 });
}
