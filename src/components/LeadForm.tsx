"use client";

import { useState, ChangeEvent } from "react";
import Link from "next/link";

interface LeadFormProps {
  onSubmit: (data: {
    nome: string;
    whatsapp: string;
    lgpd_consent: boolean;
    consent_version: string;
  }) => Promise<void>; // Mudamos para Promise para lidar com o loading de rede
  nome_urna: string;
}

export default function LeadForm({ onSubmit, nome_urna }: LeadFormProps) {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("+55 ");
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const formatarBrasileiro = (value: string) => {
    const nums = value.replace(/\D/g, "");
    if (!value.startsWith("+55")) return value;

    const ddi = nums.substring(0, 2);
    const ddd = nums.substring(2, 4);
    const parte1 = nums.substring(4, 9);
    const parte2 = nums.substring(9, 13);

    if (nums.length > 9) return `+${ddi} (${ddd}) ${parte1}-${parte2}`;
    if (nums.length > 4) return `+${ddi} (${ddd}) ${parte1}`;
    if (nums.length > 2) return `+${ddi} (${ddd})`;
    if (nums.length > 0) return `+${ddi}`;
    return "+";
  };

  const handleNomeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const regex = /^[A-Za-zÀ-ÿ\s]{0,100}$/;
    if (regex.test(input)) {
      setNome(input);
      if (erro) setErro("");
    }
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (!rawValue.startsWith("+")) {
      setWhatsapp("+55 ");
      return;
    }
    setWhatsapp(
      rawValue.startsWith("+55")
        ? formatarBrasileiro(rawValue)
        : rawValue.replace(/[^\d+]/g, ""),
    );
    setErro("");
  };

  const handleValidarLead = async () => {
    const nomeFinal = nome.trim();
    const apenasNumeros = whatsapp.replace(/\D/g, "");

    // 1. Validação de Nome (Mínimo 2 palavras)
    if (nomeFinal.split(" ").length < 2) {
      setErro("Por favor, digite seu Nome + Sobrenome.");
      return;
    }

    // 2. Extração do DDD (considerando o DDI +55 fixo)
    // apenasNumeros será: 5511999999999
    const ddd = apenasNumeros.substring(2, 4);
    const numeroSemDDD = apenasNumeros.substring(4);

    // 3. Validação de DDDs Brasileiros Válidos
    const dddsValidos = [
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
    ];

    if (!dddsValidos.includes(ddd)) {
      setErro(`O DDD (${ddd}) não é válido no Brasil.`);
      return;
    }

    // 4. Validação de Comprimento e Sequências Repetidas
    const sequenciasInvalidas = [
      "000000000",
      "111111111",
      "222222222",
      "333333333",
      "444444444",
      "555555555",
      "666666666",
      "777777777",
      "888888888",
      "999999999",
      "123456789",
    ];

    if (apenasNumeros.length < 12 || apenasNumeros.length > 13) {
      setErro("O número deve ter o formato: +55 (DDD) 9.0000-0000");
      return;
    }

    if (sequenciasInvalidas.includes(numeroSemDDD)) {
      setErro("Por favor, insira um número de WhatsApp real.");
      return;
    }

    // 5. Consentimento
    if (!lgpdConsent) {
      setErro("O aceite dos termos é obrigatório.");
      return;
    }

    // Se passou em tudo, segue o fluxo
    setLoading(true);
    try {
      await onSubmit({
        nome: nomeFinal,
        whatsapp: "+" + apenasNumeros,
        lgpd_consent: lgpdConsent,
        consent_version: "1.0",
      });
    } catch (err) {
      setErro("Falha ao salvar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  const isFormValid =
    nome.trim().length >= 5 && whatsapp.length >= 10 && lgpdConsent && !loading;

  return (
    <div className="w-full bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          Identificação
        </label>
        <input
          type="text"
          placeholder="Seu Nome + Sobrenome"
          value={nome}
          onChange={handleNomeChange}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
          maxLength={100}
          disabled={loading}
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
          WhatsApp
        </label>
        <input
          type="text"
          placeholder="+55 (00) 00000-0000"
          value={whatsapp}
          onChange={handlePhoneChange}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
          disabled={loading}
        />
      </div>

      {/* Box de Consentimento LGPD */}
      <div
        className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
          lgpdConsent
            ? "bg-blue-50 border-blue-100"
            : "bg-slate-50 border-slate-100"
        }`}
        onClick={() => !loading && setLgpdConsent(!lgpdConsent)}
      >
        <input
          type="checkbox"
          id="lgpd_check"
          checked={lgpdConsent}
          onChange={(e) => setLgpdConsent(e.target.checked)}
          disabled={loading}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
        />
        <label
          htmlFor="lgpd_check"
          className="text-[10px] text-slate-500 leading-tight cursor-pointer select-none"
        >
          Autorizo o tratamento dos meus dados para receber comunicações da
          campanha de
          <strong className="text-slate-700 ml-1">{nome_urna}</strong>, conforme
          a{" "}
          <Link
            href="/politica-de-privacidade"
            target="_blank"
            className="underline font-bold"
          >
            Política de Privacidade
          </Link>
        </label>
      </div>

      {erro && (
        <p className="text-[10px] text-red-600 font-bold text-center uppercase animate-pulse italic">
          ⚠️ {erro}
        </p>
      )}

      <button
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
        * Seus dados são armazenados com segurança e criptografia, seguindo as
        normas da LGPD.
      </p>
    </div>
  );
}
