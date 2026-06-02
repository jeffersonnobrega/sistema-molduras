1. Visão Geral do Projeto
   O SIND é uma aplicação web de alta performance voltada para campanhas políticas e institucionais. O objetivo é permitir que apoiadores enviem fotos pessoais, apliquem uma moldura temática (overlay PNG) e baixem o resultado em alta resolução para compartilhamento em redes sociais.

🎯 Objetivos Concluídos
MVP Funcional: Upload de imagem, ajuste de zoom/posição via Canvas API.

Captura de Leads (RF02): Persistência obrigatória de Nome e WhatsApp no Supabase antes do download.

Segurança & Resiliência: Implementação de RLS (Row Level Security), Singleton Pattern para conexão com banco e Timeout de 5s para operações de rede.

2. Stack Tecnológica
   Framework: Next.js 15 (App Router) + TypeScript.

Estilização: Tailwind CSS.

Backend as a Service: Supabase (PostgreSQL).

Processamento de Imagem: HTML5 Canvas API (Client-side para economia de recursos de servidor).

Deployment: Vercel (preparado).

3. Arquitetura de Dados (Supabase)
   Tabela: leads
   Armazena os dados dos usuários que geraram fotos.

id: uuid (PK)

nome: text (min 3 caracteres)

whatsapp: text (regex: 10-11 dígitos numéricos)

candidato_slug: text (FK lógica para identificar a campanha)

created_at: timestamp

Tabela: candidatos (Sprint Atual)
Configurações dinâmicas de cada campanha.

slug: text (Unique Index - ex: 'berg40')

nome_urna: text

cor_primaria: text (hex code)

url_moldura: text (caminho para o PNG)

🛠 Últimas Implementações Técnicas

1. Sistema de Temas Dinâmico (theme-mapper.ts)
   Implementada lógica de contraste inteligente para garantir que textos e botões sobreponham a cor primária do candidato com legibilidade (alternando entre preto/branco).

Mapeamento completo de componentes (Navbar, Hero, Editor, Stats, Footer) consumindo cores do banco de dados.

2. Editor de Canvas & Segurança (CORS)
   Ajuste de Segurança: Implementado img.crossOrigin = "anonymous" no carregamento de imagens do Supabase Storage para evitar o erro SecurityError: Tainted canvases may not be exported.

Ordem de Carga: Definição da propriedade crossOrigin antes da atribuição do src para garantir conformidade com as políticas de cache do navegador.

3. Fluxo de Conversão e Engajamento
   Captura de Leads: Bloqueio do download da imagem final condicionado ao preenchimento do LeadForm.

Social Share: Adicionado botão de compartilhamento direto para WhatsApp, utilizando window.location.href para viralização da página do candidato específico.

Interatividade: Implementado suporte a Zoom (scroll/slider) e Pan (drag/touch) para ajuste fino da foto do usuário dentro da moldura oficial.

4. Infraestrutura Supabase
   Storage: Configurado bucket público para molduras com políticas de RLS permitindo SELECT público.

RPC: Implementada função increment_leads_count para atualização atômica de estatísticas em tempo real na página.

🚀 Status Atual do Projeto
Refatoração de Navbar: Concluída (Cores dinâmicas aplicadas sem alteração estrutural).

Download de Imagem: Estável e funcional.

Responsividade: Editor otimizado para fluxo vertical em dispositivos móveis dentro de containers restritos.

4. Padrões de Implementação e Segurança
   🛡️ Segurança (Hardening)
   Row Level Security (RLS): - INSERT: Permitido para todos (anon).

SELECT: Bloqueado para o público (USING (false)). Apenas administradores via dashboard acessam os leads.

Database Constraints: Validação de Regex para WhatsApp e comprimento de string para nomes direto no PostgreSQL.

⚡ Performance e Confiabilidade
Singleton Supabase Client: Localizado em src/lib/supabase.ts. Evita o esgotamento do pool de conexões.

Race Condition Timeout: Todas as chamadas ao banco possuem um Promise.race de 5 segundos para evitar que a UI trave em redes oscilantes.

Memory Management: Uso de URL.revokeObjectURL após o processamento das imagens para evitar Memory Leaks em dispositivos móveis.

5. Estrutura de Arquivos Crítica
   Plaintext
   /src
   /app
   /candidato
   /[slug]
   page.tsx <-- Server Component: Busca dados do candidato
   /components
   CanvasEditor.tsx <-- Core: Lógica de imagem e integração Supabase
   LeadForm.tsx <-- UI: Validação e captura de dados
   PhotoUpload.tsx <-- UI: Input de arquivo
   /lib
   supabase.ts <-- Infra: Cliente Singleton do Supabase
   /.env.local <-- Config: NEXT_PUBLIC_SUPABASE_URL e ANON_KEY
6. Guia para Manutenção / Novas Funcionalidades
   Para adicionar novos campos ao Lead: Atualizar a tabela no Supabase, a interface no LeadForm.tsx e a lógica de insert no CanvasEditor.tsx.

Para trocar a lógica de imagem: O CanvasEditor.tsx utiliza ctx.drawImage. Para filtros ou ajustes avançados, a manipulação deve ocorrer antes do ctx.restore().

Regra de Ouro: Nunca exponha a SERVICE_ROLE_KEY no front-end. Use apenas a ANON_KEY com RLS estrito.

7. Status das Sprints
   [x] Sprint 1: Setup & Canvas (OK)

[x] Sprint 2: Integração Supabase & Leads (OK)

[x] Sprint 3: Segurança, Performance & Refactoring (OK)

[ ] Sprint 4: Multi-Candidato Dinâmico (EM ANDAMENTO)
