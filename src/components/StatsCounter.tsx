"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Stats {
  total_views: number;
  stats_leads_count: number;
  total_shares: number;
}

interface StatsCounterProps {
  slug: string;
  initialStats: Stats;
  theme: {
    number: string;
    label: string;
    divider: string;
  };
}

export default function StatsCounter({
  slug,
  initialStats,
  theme,
}: StatsCounterProps) {
  const [stats, setStats] = useState<Stats>(initialStats);

  useEffect(() => {
    // Busca os valores atuais imediatamente ao montar
    supabase
      .from("candidatos")
      .select("total_views, stats_leads_count, total_shares")
      .eq("slug", slug)
      .single()
      .then(({ data }) => {
        if (data) setStats(data as Stats);
      });

    // Realtime: escuta mudanças na linha deste candidato
    const channel = supabase
      .channel(`stats-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "candidatos",
          filter: `slug=eq.${slug}`,
        },
        (payload) => {
          const updated = payload.new as Partial<Stats>;
          setStats((prev) => ({
            total_views: updated.total_views ?? prev.total_views,
            stats_leads_count:
              updated.stats_leads_count ?? prev.stats_leads_count,
            total_shares: updated.total_shares ?? prev.total_shares,
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  const items = [
    { label: "Visualizações", value: stats.total_views, border: false },
    { label: "Fotos Geradas", value: stats.stats_leads_count, border: true },
    { label: "Compartilhamentos", value: stats.total_shares, border: false },
  ];

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
      {items.map((stat, idx) => (
        <div
          key={idx}
          className="space-y-1 text-center"
          style={{
            borderLeft: stat.border ? `1px solid ${theme.divider}` : "none",
            borderRight: stat.border ? `1px solid ${theme.divider}` : "none",
          }}
        >
          <h3
            className="text-6xl font-black tabular-nums tracking-tighter antialiased transition-all duration-500"
            style={{ color: theme.number }}
          >
            {stat.value.toLocaleString("pt-BR")}
          </h3>
          <p
            className="text-[10px] font-black uppercase tracking-[0.3em]"
            style={{ color: theme.label }}
          >
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
