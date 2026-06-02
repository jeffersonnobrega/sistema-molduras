export interface PresidenteDB {
  id: string;
  nome: string;
  partido: string;
  numero: string;
  slug: string;
  url_foto: string | null;
  created_at: string;
}

export interface ColinhaConfigDB {
  id: string;
  candidato_id: string;
  presidente_id: string | null;
  mostrar_presidente: boolean;
  updated_at: string;
  presidenciados?: PresidenteDB;
}

export interface ColinhaTravadoDB {
  id: string;
  colinha_config_id: string;
  cargo_nome: string;
  nome_urna: string;
  partido: string;
  numero: string;
  url_foto: string | null;
  url_foto_pendente: string | null;
  status_foto: "sem_foto" | "pendente" | "aprovada" | "rejeitada";
  created_at: string;
}
