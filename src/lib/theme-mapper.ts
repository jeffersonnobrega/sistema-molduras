import { CandidatoDB } from "@/types/candidato";

/**
 * Calcula cor de contraste para acessibilidade
 */
function getContrastColor(hexColor: string) {
  if (!hexColor) return "#ffffff";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}

export function getCandidatoTheme(candidato: Partial<CandidatoDB>) {
  // Cores vindas do seu banco de dados
  const corBase = candidato.cor_primaria || "#2563eb";
  const corFundo = candidato.cor_fundo || "#ffffff";
  const corTitulo = candidato.cor_titulo || "#1e293b";
  const corTexto = candidato.cor_texto || "#475569";
  const corBotao = candidato.cor_botao || corBase;
  const corTextoHero = candidato.cor_texto_hero || corBase;

  const contrastBotao = getContrastColor(corBotao);

  const withOpacity = (hex: string, opacity: number) => {
    const op = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0");
    return `${hex}${op}`;
  };

  return {
    page: {
      bg: corFundo,
      textPrincipal: corTitulo,
      textSecundario: corTexto,
      style: { backgroundColor: corFundo, color: corTexto },
    },
    nav: {
      bg: `${corFundo}e6`,
      border: withOpacity(corTexto, 0.1),
      logoText: corTitulo,
      button: {
        bg: corBotao,
        text: contrastBotao,
        border: `1px solid ${withOpacity(contrastBotao, 0.1)}`,
      },
    },
    sections: {
      heroBg: withOpacity(corBase, 0.05),
      statsBg: corFundo,
      statsBorder: withOpacity(corTexto, 0.1),
      howItWorksBg: withOpacity(corBase, 0.03),
      editorBg: withOpacity(corBase, 0.05),
    },
    hero: {
      title: corTitulo, // Controla "Crie sua foto"
      accent: corTextoHero, // Controla "Oficial"
      description: corTexto, // Controla o parágrafo de apoio
      badgeBg: corFundo,
      badgeText: corTexto,
    },
    stats: {
      number: corBase,
      label: withOpacity(corTexto, 0.7),
      divider: withOpacity(corTexto, 0.1),
    },
    editor: {
      containerBg: corFundo,
      containerBorder: withOpacity(corTexto, 0.1),
      canvasBorder: withOpacity(corBase, 0.2),
      shadow: `0 20px 25px -5px ${withOpacity(corBase, 0.1)}`,
      downloadBtn: {
        bg: corBotao,
        text: contrastBotao,
      },
      controls: {
        label: withOpacity(corTexto, 0.8),
        value: corBase,
        btnReset: corBase,
      },
    },
    footer: {
      bg: corFundo,
      border: withOpacity(corTexto, 0.1),
      text: withOpacity(corTexto, 0.7),
      copy: withOpacity(corTexto, 0.5),
    },
  };
}

export type CandidatoTheme = ReturnType<typeof getCandidatoTheme>;
