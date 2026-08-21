
export interface CampoColinha {
  cargo: string;
  numero: string;
  nome: string;
  fixo: boolean;
}

export interface ConfigColinha {
  tipo_eleicao?: "geral" | "municipal";
  uf?: string;
  tipo_regional?: "Deputado Estadual" | "Deputado Distrital";
  campos?: CampoColinha[];
}

export interface CargoPoliticoDB {
  id: string;
  nome: string;
  digitos: number;
  ordem_votacao: number;
  created_at?: string;
}

export interface MolduraSet {
  label: string;
  stories: string;
  feed: string;
}

export interface CandidatoDB {
  id: string;
  created_at?: string;
  slug: string;
  nome_urna: string;
  partido: string;
  numero_partido: number;
  numero_candidato: string;
  url_foto_perfil: string;
  cargo_id: string;
  cargo_travado_id: string;
  cor_primaria: string;
  // Colunas legadas — mantidas para retrocompatibilidade
  // Sempre refletem a primeira entrada do array molduras[]
  url_moldura: string;
  url_moldura_feed: string;
  molduras: MolduraSet[];
  config_colinha: ConfigColinha;
  user_id?: string;
  ativo: boolean;
  cor_fundo?: string;
  cor_titulo?: string;
  cor_texto?: string;
  cor_texto_hero?: string;
  cor_botao?: string;
  total_views: number;
  total_shares: number;
  stats_leads_count: number;
  stats_colinha_downloads: number;
}
