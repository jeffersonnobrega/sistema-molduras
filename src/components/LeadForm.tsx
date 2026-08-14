"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";

/* =========================================================
   Tipos
========================================================= */

interface LeadFormProps {
  onSubmit: (data: {
    nome: string;
    whatsapp: string;
    lgpd_consent: boolean;
    consent_version: string;
  }) => Promise<void>;

  nome_urna: string;
}

type PhoneValidationResult = {
  valido: boolean;
  mensagem?: string;
  normalizado?: string;
};

/* =========================================================
   Constantes
========================================================= */

const DDI_BRASIL = "55";

const DDDS_VALIDOS = new Set([
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "24",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "37",
  "38",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "51",
  "53",
  "54",
  "55",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "71",
  "73",
  "74",
  "75",
  "77",
  "79",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
]);

/* =========================================================
   Helpers de telefone
========================================================= */

/**
 * Retorna somente os números.
 *
 * Ex:
 * +55 (61) 99999-9999
 * =>
 * 5561999999999
 */
const somenteNumeros = (value: string) => {
  return value.replace(/\D/g, "");
};

/**
 * Permite somente caracteres úteis em um telefone:
 *
 * números
 * +
 * espaço
 * ()
 * -
 *
 * Também garante que exista no máximo um "+" e somente
 * no início da entrada.
 */
const sanitizarEntradaTelefone = (value: string) => {
  let valor = value.replace(/[^\d+\s()-]/g, "");

  const possuiMaisNoInicio = valor.startsWith("+");

  // Remove todos os "+" existentes.
  valor = valor.replace(/\+/g, "");

  // Reinsere apenas o "+" inicial, caso existisse.
  if (possuiMaisNoInicio) {
    valor = `+${valor}`;
  }

  return valor.slice(0, 30);
};

/**
 * Formata um número brasileiro.
 *
 * numeroNacional deve conter:
 *
 * DDD + telefone
 *
 * Ex:
 * 61999999999
 */
const formatarNumeroBrasileiro = (
  numeroNacional: string,
  incluirDDI: boolean,
) => {
  const numeros = somenteNumeros(numeroNacional).slice(0, 11);

  const prefixo = incluirDDI ? "+55 " : "";

  if (!numeros) {
    return incluirDDI ? "+55" : "";
  }

  // DDD ainda incompleto
  if (numeros.length === 1) {
    return `${prefixo}(${numeros}`;
  }

  const ddd = numeros.slice(0, 2);
  const telefone = numeros.slice(2);

  if (!telefone) {
    return `${prefixo}(${ddd})`;
  }

  if (telefone.length <= 5) {
    return `${prefixo}(${ddd}) ${telefone}`;
  }

  const parte1 = telefone.slice(0, 5);
  const parte2 = telefone.slice(5, 9);

  return `${prefixo}(${ddd}) ${parte1}-${parte2}`;
};

/**
 * Formata o telefone de acordo com o que foi digitado.
 *
 * Brasil:
 * +55 (61) 99999-9999
 *
 * Brasil sem DDI:
 * (61) 99999-9999
 *
 * Exterior:
 * +351912345678
 *
 * Para números internacionais não tentamos adivinhar
 * máscaras de cada país.
 */
const formatarTelefone = (value: string) => {
  const valor = value.trim();

  if (!valor) {
    return "";
  }

  const numeros = somenteNumeros(valor);
  const possuiDDI = valor.startsWith("+");

  /*
   * +55 => número brasileiro internacional.
   */
  if (possuiDDI && numeros.startsWith(DDI_BRASIL)) {
    const numeroNacional = numeros.slice(2);

    return formatarNumeroBrasileiro(numeroNacional, true);
  }

  /*
   * Número sem "+".
   *
   * Consideramos como número brasileiro nacional.
   */
  if (!possuiDDI) {
    return formatarNumeroBrasileiro(numeros, false);
  }

  /*
   * Outros países.
   *
 
   */

  const formatarNumeroInternacional = (value: string) => {
    const numeros = somenteNumeros(value);

    if (!numeros) {
      return "";
    }

    /*
     * Como não temos uma biblioteca com os metadados telefônicos
     * de cada país, não tentamos descobrir uma máscara exata.
     *
     * Apenas agrupamos os dígitos para melhorar a leitura.
     */
    if (numeros.length <= 4) {
      return `+${numeros}`;
    }

    /*
     * Para números maiores, preservamos visualmente o DDI
     * e agrupamos o restante.
     *
     * Ex.:
     * +351 912 345 678
     */
    const ddi = numeros.slice(0, 3);
    const numero = numeros.slice(3);

    const grupos = numero.match(/.{1,3}/g) ?? [];

    return `+${ddi} ${grupos.join(" ")}`;
  };

  return formatarNumeroInternacional(valor);
};

/* =========================================================
   Validação de telefone brasileiro
========================================================= */

const validarNumeroBrasileiro = (
  numeroNacional: string,
): PhoneValidationResult => {
  const numeros = somenteNumeros(numeroNacional);

  /*
   * DDD (2)
   * +
   * celular (9)
   *
   * Total = 11
   */
  if (numeros.length !== 11) {
    return {
      valido: false,
      mensagem:
        "O celular brasileiro deve possuir DDD + 9 dígitos. Ex.: (61) 99999-9999.",
    };
  }

  const ddd = numeros.slice(0, 2);
  const celular = numeros.slice(2);

  /*
   * Validação do DDD.
   */
  if (!DDDS_VALIDOS.has(ddd)) {
    return {
      valido: false,
      mensagem: `O DDD (${ddd}) não é válido no Brasil.`,
    };
  }

  /*
   * Celulares brasileiros possuem 9 dígitos
   * iniciando com 9.
   */
  if (celular.length !== 9 || !celular.startsWith("9")) {
    return {
      valido: false,
      mensagem:
        "O número brasileiro deve ser um celular válido e iniciar com 9.",
    };
  }

  /*
   * Impede sequências obviamente inválidas.
   *
   * Ex:
   * 999999999
   * 111111111
   */
  if (/^(\d)\1+$/.test(celular)) {
    return {
      valido: false,
      mensagem: "Por favor, informe um número de celular válido.",
    };
  }

  if (celular === "912345678" || celular === "987654321") {
    return {
      valido: false,
      mensagem: "Por favor, informe um número de celular válido.",
    };
  }

  return {
    valido: true,

    /*
     * Sempre salvamos o brasileiro no padrão internacional.
     *
     * Ex:
     * +5561999999999
     */
    normalizado: `+55${numeros}`,
  };
};

/* =========================================================
   Validação internacional
========================================================= */

const validarNumeroInternacional = (value: string): PhoneValidationResult => {
  const valor = value.trim();
  const numeros = somenteNumeros(valor);

  /*
   * Para números estrangeiros exigimos o código do país.
   *
   * Isso remove a ambiguidade de tentar descobrir
   * automaticamente se "351..." significa Portugal,
   * Brasil ou um número nacional qualquer.
   */
  if (!valor.startsWith("+")) {
    return {
      valido: false,
      mensagem:
        "Para números fora do Brasil, informe o código do país. Ex.: +351912345678.",
    };
  }

  /*
   * E.164 permite no máximo 15 dígitos.
   *
   * O limite mínimo abaixo não é uma regra absoluta do
   * E.164, mas evita números claramente incompletos.
   */
  if (numeros.length < 8 || numeros.length > 15) {
    return {
      valido: false,
      mensagem: "Informe um número internacional válido com código do país.",
    };
  }

  /*
   * Código internacional não começa com zero.
   */
  if (numeros.startsWith("0")) {
    return {
      valido: false,
      mensagem: "O código internacional do país não pode começar com zero.",
    };
  }

  /*
   * Evita números obviamente falsos.
   */
  if (/^(\d)\1+$/.test(numeros)) {
    return {
      valido: false,
      mensagem: "Por favor, informe um número de telefone válido.",
    };
  }

  return {
    valido: true,
    normalizado: `+${numeros}`,
  };
};

/* =========================================================
   Validação geral
========================================================= */

const validarTelefone = (value: string): PhoneValidationResult => {
  const valor = value.trim();

  if (!valor) {
    return {
      valido: false,
      mensagem: "Informe seu número de WhatsApp.",
    };
  }

  const numeros = somenteNumeros(valor);
  const possuiDDI = valor.startsWith("+");

  /*
   * +55
   *
   * Brasil com código internacional.
   */
  if (possuiDDI && numeros.startsWith(DDI_BRASIL)) {
    const numeroNacional = numeros.slice(2);

    return validarNumeroBrasileiro(numeroNacional);
  }

  /*
   * Sem "+"
   *
   * Consideramos número brasileiro nacional.
   */
  if (!possuiDDI) {
    return validarNumeroBrasileiro(numeros);
  }

  /*
   * Qualquer outro DDI.
   */
  return validarNumeroInternacional(valor);
};

/* =========================================================
   Componente
========================================================= */

export default function LeadForm({ onSubmit, nome_urna }: LeadFormProps) {
  const [nome, setNome] = useState("");

  /*
   * Começa com +55 por conveniência,
   * mas o usuário pode apagar tudo.
   */
  const [whatsapp, setWhatsapp] = useState("+55 ");

  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  /* =======================================================
     Nome
  ======================================================= */

  const handleNomeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    /*
     * Letras, acentos, espaços, hífen e apóstrofo.
     *
     * Permite nomes como:
     *
     * João da Silva
     * Ana Paula
     * Maria d'Ávila
     * João-Pedro
     */
    const regex = /^[A-Za-zÀ-ÿ\s'-]{0,100}$/;

    if (!regex.test(input)) {
      return;
    }

    setNome(input);

    if (erro) {
      setErro("");
    }
  };

  /* =======================================================
     Telefone
  ======================================================= */

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    /*
     * Não aplicamos máscara aqui.
     *
     * Isso é intencional.
     *
     * Dessa forma o usuário consegue apagar livremente:
     *
     * +55
     * DDD
     * número
     * máscara
     *
     * sem o React reconstruir caracteres automaticamente.
     */
    const sanitizado = sanitizarEntradaTelefone(input);

    setWhatsapp(sanitizado);

    if (erro) {
      setErro("");
    }
  };

  const handlePhoneBlur = () => {
    /*
     * Depois que o usuário termina de editar,
     * aplicamos a formatação apropriada.
     */
    const formatado = formatarTelefone(whatsapp);

    setWhatsapp(formatado);
  };

  /* =======================================================
     Validação e submit
  ======================================================= */

  const handleValidarLead = async () => {
    const nomeFinal = nome.trim();

    /*
     * Remove espaços duplicados.
     *
     * Ex:
     *
     * "Jefferson    Silva"
     *
     * =>
     *
     * ["Jefferson", "Silva"]
     */
    const partesNome = nomeFinal.split(/\s+/).filter(Boolean);

    if (partesNome.length < 2) {
      setErro("Por favor, digite seu Nome + Sobrenome.");
      return;
    }

    /*
     * Validação do WhatsApp.
     */
    const validacaoTelefone = validarTelefone(whatsapp);

    if (!validacaoTelefone.valido || !validacaoTelefone.normalizado) {
      setErro(
        validacaoTelefone.mensagem ??
          "Por favor, informe um número de WhatsApp válido.",
      );

      return;
    }

    /*
     * Consentimento LGPD.
     */
    if (!lgpdConsent) {
      setErro("O aceite dos termos é obrigatório.");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      await onSubmit({
        nome: nomeFinal,

        /*
         * Sempre enviamos o telefone normalizado.
         *
         * Brasil:
         * +5561999999999
         *
         * Portugal:
         * +351912345678
         *
         * EUA:
         * +12025550123
         */
        whatsapp: validacaoTelefone.normalizado,

        lgpd_consent: lgpdConsent,
        consent_version: "1.0",
      });
    } catch {
      setErro("Falha ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     Validação visual do botão
  ======================================================= */

  const partesNome = nome.trim().split(/\s+/).filter(Boolean);
  const numerosTelefone = somenteNumeros(whatsapp);

  const telefoneMinimamentePreenchido = whatsapp.trim().startsWith("+")
    ? numerosTelefone.length >= 8
    : numerosTelefone.length >= 11;

  const isFormValid =
    partesNome.length >= 2 &&
    telefoneMinimamentePreenchido &&
    lgpdConsent &&
    !loading;

  /* =======================================================
     Render
  ======================================================= */

  return (
    <div className="w-full bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
      {/* Nome */}
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          Identificação
        </label>

        <input
          type="text"
          placeholder="Seu Nome + Sobrenome"
          value={nome}
          onChange={handleNomeChange}
          maxLength={100}
          disabled={loading}
          autoComplete="name"
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
        />
      </div>

      {/* WhatsApp */}
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          WhatsApp
        </label>

        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+55 (00) 00000-0000"
          value={whatsapp}
          onChange={handlePhoneChange}
          onBlur={handlePhoneBlur}
          maxLength={30}
          disabled={loading}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
        />

        <p className="text-[9px] text-slate-400 ml-1">
          Para números internacionais, informe o código do país. Ex.: +351.
        </p>
      </div>

      {/* Consentimento LGPD */}
      <div
        className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${
          lgpdConsent
            ? "bg-blue-50 border-blue-100"
            : "bg-slate-50 border-slate-100"
        }`}
      >
        <input
          type="checkbox"
          id="lgpd_check"
          checked={lgpdConsent}
          onChange={(e) => {
            setLgpdConsent(e.target.checked);

            if (erro) {
              setErro("");
            }
          }}
          disabled={loading}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
        />

        <label
          htmlFor="lgpd_check"
          className="text-[10px] text-slate-500 leading-tight cursor-pointer select-none"
        >
          Autorizo o tratamento dos meus dados para receber comunicações da
          campanha de <strong className="text-slate-700">{nome_urna}</strong>,
          conforme a{" "}
          <Link
            href="/politica-de-privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold"
            onClick={(e) => e.stopPropagation()}
          >
            Política de Privacidade
          </Link>
          .
        </label>
      </div>

      {/* Erro */}
      {erro && (
        <p className="text-[10px] text-red-600 font-bold text-center uppercase animate-pulse italic">
          ⚠️ {erro}
        </p>
      )}

      {/* Botão */}
      <button
        type="button"
        disabled={!isFormValid}
        onClick={handleValidarLead}
        className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all relative overflow-hidden ${
          isFormValid
            ? "bg-blue-600 text-white shadow-lg active:scale-95 hover:bg-blue-700"
            : "bg-slate-100 text-slate-400 cursor-not-allowed"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-white"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />

              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Validando...
          </span>
        ) : (
          "Liberar Download"
        )}
      </button>

      <p className="text-[9px] text-slate-400 text-center leading-relaxed">
        * Seus dados são armazenados com segurança, seguindo as normas da LGPD.
      </p>
    </div>
  );
}
