import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCandidatoTheme } from "@/lib/theme-mapper";
import { CandidatoDB } from "@/types/candidato";
import { CreditCard } from "lucide-react";
import Image from "next/image";

import CanvasEditor from "@/components/CanvasEditor";
import CandidatoColinha from "@/components/CandidatoColinha";
import CookieBanner from "@/components/CookieBanner";
import ViewCounter from "@/components/ViewCounter";
import StatsCounter from "@/components/StatsCounter";
import CandidateProfilePhoto from "@/components/CandidateProfilePhoto";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface PublicCampaignPayload {
  candidato: CandidatoDB;
  cargos: Array<{
    id: string;
    nome: string;
    digitos: number;
    ordem_votacao: number;
  }>;
  travados: Array<{
    cargo_nome: string;
    nome_urna: string;
    partido: string;
    numero: string;
    url_foto: string | null;
  }>;
  presidente: {
    nome: string;
    numero: string;
    url_foto: string | null;
  } | null;
}

const SLUGS_SISTEMA_MOLDURA = ["pepa", "anchieta"];
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase.rpc("get_public_campaign", {
    target_slug: slug,
  });
  const candidato = (data as unknown as PublicCampaignPayload | null)
    ?.candidato;

  if (!candidato) return { title: "Candidato não encontrado | SIND" };

  const titulo = `Foto Oficial - ${candidato.nome_urna} ${candidato.partido}`;
  const descricao = `Apoie a campanha de ${candidato.nome_urna}. Personalize sua foto oficial e monte sua colinha digital aqui.`;

  return {
    title: titulo,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      type: "website",
      locale: "pt_BR",
      url: `https://seudominio.com.br/${slug}`,
      images: [{ url: "/og-image-default.png", width: 1200, height: 630 }],
    },
  };
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CandidatoPage({ params }: PageProps) {
  const { slug } = await params;

  const { data, error: candidatoError } = await supabase.rpc(
    "get_public_campaign",
    { target_slug: slug },
  );
  const campaign = data as unknown as PublicCampaignPayload | null;
  if (candidatoError || !campaign) return notFound();
  const rawCandidato = campaign.candidato;

  const t = new Date().getTime();
  const molduraStories = rawCandidato.url_moldura
    ? `${rawCandidato.url_moldura}?t=${t}`
    : "";
  const molduraFeed = rawCandidato.url_moldura_feed
    ? `${rawCandidato.url_moldura_feed}?t=${t}`
    : "";

  const candidato: CandidatoDB = {
    ...rawCandidato,
    url_moldura: molduraStories,
    url_moldura_feed: molduraFeed,
  } as CandidatoDB;

  const theme = getCandidatoTheme(candidato);
  const tipoRegionalAdmin =
    candidato.config_colinha?.tipo_regional || "Deputado Estadual";

  const initialStats = {
    total_views: candidato.total_views || 0,
    stats_leads_count: candidato.stats_leads_count || 0,
    total_shares: candidato.total_shares || 0,
  };

  const COLINHA_ENABLED = true;

  return (
    <div
      className="min-h-screen font-sans scroll-smooth transition-colors duration-500"
      style={theme.page.style}
    >
      {molduraStories && (
        <link rel="preload" href={molduraStories} as="image" />
      )}
      {molduraFeed && <link rel="preload" href={molduraFeed} as="image" />}

      <ViewCounter slug={slug} />

      <nav
        className="sticky top-0 z-50 backdrop-blur-md px-4 md:px-6 py-3 transition-all"
        style={{
          backgroundColor: theme.nav.bg,
          borderBottom: `1px solid ${theme.nav.border}`,
        }}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <CandidateProfilePhoto
              src={candidato.url_foto_perfil}
              nome={candidato.nome_urna}
              numero={candidato.numero_candidato}
              corPrimaria={candidato.cor_primaria}
            />

            <a
              href="#criar"
              className="group flex min-w-0 flex-col leading-none"
            >
              <div className="flex flex-col leading-none min-w-0">
                <span
                  className="truncate text-base font-black uppercase italic leading-tight tracking-tighter transition-opacity group-hover:opacity-75"
                  style={{ color: theme.nav.logoText }}
                >
                  {candidato.nome_urna}
                </span>
                {candidato.numero_candidato && (
                  <span
                    className="mt-0.5 text-[11px] font-bold tabular-nums tracking-widest opacity-60"
                    style={{ color: theme.nav.logoText }}
                  >
                    Nº {candidato.numero_candidato}
                  </span>
                )}
              </div>
            </a>
          </div>

          {COLINHA_ENABLED && (
            <a
              href="#colinha"
              className="shrink-0 px-4 sm:px-6 py-2 rounded-full transition-all active:scale-95 shadow-lg flex items-center gap-2"
              style={{
                backgroundColor: theme.nav.button.bg,
                color: theme.nav.button.text,
                border: theme.nav.button.border,
              }}
            >
              <CreditCard size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                Gerar Colinha
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest sm:hidden">
                Colinha
              </span>
            </a>
          )}
        </div>
      </nav>

      <section
        id="criar"
        className="relative pt-10 pb-16 px-4 md:px-6 transition-colors overflow-hidden"
        style={{ backgroundColor: theme.sections.editorBg }}
      >
        <div
          className="absolute -top-32 -right-32 w-125 h-125 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: candidato.cor_primaria }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-75 h-75 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ backgroundColor: candidato.cor_primaria }}
        />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
          <div className="text-center lg:text-left space-y-5 order-2 lg:order-1">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
              style={{
                borderColor: theme.hero.accent,
                color: theme.hero.accent,
                backgroundColor: `${theme.hero.accent}18`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse shrink-0"
                style={{ backgroundColor: theme.hero.accent }}
              />
              {candidato.partido} · Nº {candidato.numero_candidato}
            </div>

            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-black uppercase italic leading-[0.88] tracking-tighter"
              style={{ color: theme.hero.title }}
            >
              Crie sua
              <br />
              foto <span style={{ color: theme.hero.accent }}>Oficial</span>
            </h1>

            <p
              className="text-base sm:text-lg max-w-md mx-auto lg:mx-0 font-medium leading-relaxed"
              style={{ color: theme.hero.description }}
            >
              Apoie a campanha de{" "}
              <strong style={{ color: theme.hero.accent }}>
                {candidato.nome_urna}
              </strong>
              . Personalize sua foto e compartilhe nas redes sociais.
            </p>
          </div>

          <div className="flex justify-center w-full order-1 lg:order-2">
            <div className="w-full max-w-90">
              <CanvasEditor
                candidatoId={candidato.slug}
                nome_urna={candidato.nome_urna}
                corPrimaria={candidato.cor_primaria}
                molduras={
                  candidato.molduras?.length > 0
                    ? candidato.molduras
                    : [
                        {
                          label: "Moldura 1",
                          stories: candidato.url_moldura || "",
                          feed: candidato.url_moldura_feed || "",
                        },
                      ]
                }
                theme={theme.editor}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-y py-12 px-4 md:px-6 text-center transition-colors"
        style={{
          backgroundColor: theme.sections.statsBg,
          borderColor: theme.sections.statsBorder,
        }}
      >
        <p
          className="text-[9px] font-black uppercase tracking-[0.4em] mb-8"
          style={{ color: theme.stats.label }}
        >
          Números da campanha
        </p>
        <StatsCounter
          slug={slug}
          initialStats={initialStats}
          theme={theme.stats}
        />
      </section>

      {COLINHA_ENABLED && (
        <section
          id="colinha"
          className="py-20 px-4 md:px-6 scroll-mt-20"
          style={{ backgroundColor: theme.sections.howItWorksBg }}
        >
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-10">
            <div className="text-center space-y-3 max-w-lg px-2">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest mb-1"
                style={{
                  borderColor: theme.hero.accent,
                  color: theme.hero.accent,
                  backgroundColor: `${theme.hero.accent}18`,
                }}
              >
                <CreditCard size={10} />
                Colinha Digital
              </div>

              <h2
                className="text-2xl sm:text-3xl font-black uppercase italic tracking-tighter"
                style={{ color: theme.page.textPrincipal }}
              >
                Leve seus candidatos
                <br />
                para a urna
              </h2>
              <p
                className="text-sm font-medium leading-relaxed"
                style={{ color: theme.page.textSecundario }}
              >
                Preencha os números dos seus candidatos, salve no celular para
                acesso fácil no dia da eleição.
              </p>
            </div>

            <CandidatoColinha
              candidatoData={{
                id: candidato.id,
                nome_urna: candidato.nome_urna,
                numero_candidato: candidato.numero_candidato,
                url_foto_perfil: candidato.url_foto_perfil,
                cargo_id: candidato.cargo_id,
                partido: candidato.partido,
              }}
              config={{
                tipo_regional: tipoRegionalAdmin,
                lead_id: undefined,
              }}
              theme={theme.editor}
              cargosIniciais={campaign.cargos}
              itensTravadosIniciais={campaign.travados}
              presidenteInicial={campaign.presidente}
            />
          </div>
        </section>
      )}

      <footer
        className="py-10 px-4 md:px-6 border-t text-center"
        style={{
          backgroundColor: theme.footer.bg,
          borderColor: theme.footer.border,
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <div
            className="w-6 h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
            style={{ backgroundColor: candidato.cor_primaria }}
          >
            {candidato.url_foto_perfil && (
              <Image
                src={candidato.url_foto_perfil}
                alt={candidato.nome_urna}
                width={24}
                height={24}
                className="w-full h-full object-cover"
                unoptimized
              />
            )}
          </div>
          <span
            className="text-[10px] font-black uppercase tracking-widest opacity-50"
            style={{ color: theme.footer.text }}
          >
            {candidato.nome_urna} · Nº {candidato.numero_candidato}
          </span>
        </div>

        <p
          className="text-[10px] font-black uppercase tracking-[0.5em]"
          style={{ color: theme.footer.text }}
        >
          {SLUGS_SISTEMA_MOLDURA.includes(slug)
            ? "Sistema Moldura Digital"
            : "Cleyton Santos"}
        </p>

        <p
          className="mt-2 text-[9px] font-medium"
          style={{ color: theme.footer.copy }}
        >
          {new Date().getFullYear()} Todos os direitos reservados.
        </p>
      </footer>
      <CookieBanner />
    </div>
  );
}
