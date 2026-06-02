"use client";

import Link from "next/link";

export default function PoliticaPrivacidade() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header da Página */}
        <header className="space-y-4">
          <Link
            href="/"
            className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
          >
            ← Voltar para o Início
          </Link>
          <h1 className="text-5xl md:text-6xl font-black uppercase italic leading-none tracking-tighter text-slate-900">
            Política de <br />
            <span className="text-blue-600">Privacidade</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </p>
        </header>

        <hr className="border-slate-200" />

        {/* Conteúdo Jurídico/Técnico */}
        <article className="space-y-8 text-slate-700 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
              1. Coleta de Dados
            </h2>
            <p>
              Coletamos informações básicas como <strong>Nome</strong> e{" "}
              <strong>WhatsApp</strong> exclusivamente através do preenchimento
              voluntário do formulário de identificação para a geração da
              moldura digital.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
              2. Finalidade do Tratamento
            </h2>
            <p>Os dados coletados são utilizados para:</p>
            <ul className="list-disc ml-5 space-y-2">
              <li>Permitir o download da imagem personalizada;</li>
              <li>Contabilizar o alcance da campanha de forma estatística;</li>
              <li>
                Envio de comunicações relacionadas à campanha eleitoral do
                candidato selecionado.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
              3. Armazenamento e Segurança
            </h2>
            <p>
              Seus dados são armazenados de forma segura em servidores de banco
              de dados (Supabase) com criptografia em trânsito. Aplicamos
              políticas de acesso rigorosas para garantir que apenas pessoas
              autorizadas da campanha tenham acesso às informações.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
              4. Seus Direitos (LGPD)
            </h2>
            <p>
              Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/18), você
              possui o direito de solicitar a confirmação da existência de
              tratamento, o acesso aos dados, a correção de dados incompletos ou
              a exclusão de seus dados de nossa base a qualquer momento.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
              5. Cookies e Tecnologias de Rastreio
            </h2>
            <p>
              Utilizamos cookies de sessão e analíticos para entender o fluxo de
              usuários nas páginas dos candidatos e otimizar a performance do
              sistema. Você pode gerenciar ou desativar os cookies nas
              configurações do seu navegador.
            </p>
          </section>
        </article>

        {/* Rodapé da Página */}
        <footer className="pt-10 border-t border-slate-200 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
            SIND - Sistema de Molduras Digitais
          </p>
        </footer>
      </div>
    </div>
  );
}
