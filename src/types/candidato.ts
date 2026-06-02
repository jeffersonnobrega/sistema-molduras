// src/types/candidato.ts

export interface CampoColinha {
  cargo: string;
  numero: string;
  nome: string;
  fixo: boolean;
}

export interface ConfigColinha {
  tipo_eleicao?: "geral" | "municipal";
  uf?: string;
  // Nova propriedade adicionada para controlar qual cargo regional a colinha vai exibir
  tipo_regional?: "Deputado Estadual" | "Deputado Distrital";
  // Agora é opcional, pois a colinha nova busca os campos da tabela cargos_politicos
  campos?: CampoColinha[];
}

// Nova interface baseada na tabela que criamos no Supabase
export interface CargoPoliticoDB {
  id: string;
  nome: string;
  digitos: number;
  ordem_votacao: number;
  created_at?: string;
}

// Retorno tipado do Supabase para o Candidato
export interface CandidatoDB {
  id: string;
  created_at?: string;
  slug: string;
  nome_urna: string;
  partido: string;
  numero_partido: number;

  // ==========================================
  // NOVAS COLUNAS (Refatoração da Colinha)
  // ==========================================
  numero_candidato: string;
  url_foto_perfil: string;
  cargo_id: string;
  cargo_travado_id: string;
  // ==========================================

  cor_primaria: string;
  url_moldura_feed: string;
  url_moldura: string;
  config_colinha: ConfigColinha;
  user_id?: string;
  ativo: boolean;

  cor_fundo?: string;
  cor_titulo?: string;
  cor_texto?: string;
  cor_texto_hero?: string;
  cor_botao?: string;

  // Métricas
  total_views: number;
  total_shares: number;
  stats_leads_count: number;
  stats_colinha_downloads: number;
}
