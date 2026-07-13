# ASTI Tech

Site institucional da ASTI Tech — desenvolvimento de sites para pequenas e médias empresas
usando Inteligência Artificial — e painel administrativo com o esqueleto do robô de prospecção
automatizada.

## Banco de dados (Supabase Postgres)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No painel do projeto, vá em **Settings > Database > Connection string** e copie:
   - **Connection pooling** (porta `6543`, modo "Transaction") → variável `DATABASE_URL`
   - **Direct connection** (porta `5432`) → variável `DIRECT_URL` (usada só para migrations)
3. Copie `.env.example` para `.env.local` e cole as duas strings (com a senha do banco já
   preenchida).
4. Crie as tabelas no banco:

   ```bash
   npx prisma migrate dev --name init
   ```

   Isso também roda `prisma generate` automaticamente. Depois disso o app já lê e escreve leads
   e mensagens de contato direto no Postgres.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) para o site público e
[http://localhost:3000/admin](http://localhost:3000/admin) para o painel administrativo
(senha padrão de desenvolvimento: `astitech2026`, definida em `ADMIN_PASSWORD`).

## Estrutura

- `src/app/(site)` — site público (Hero, Serviços, Como funciona, Orçamento, Contato).
- `src/app/admin` — painel administrativo protegido por senha (`src/proxy.ts`).
- `src/lib/pipeline.ts` — etapas do robô de prospecção (scan → geração do site → GitHub →
  publicação do mockup → e-mail ao cliente).
- `src/lib/claude.ts` — gera o HTML do mockup + ideias de conteúdo via API da Claude.
- `src/lib/github.ts` — cria um repositório privado no GitHub e commita o mockup gerado.
- `src/app/(site)/[slug]/route.ts` — serve o HTML do mockup direto do banco em `seusite.com/slug`.
- `prisma/schema.prisma` — modelos `Lead`, `LeadTimelineEntry` e `ContactMessage` no Postgres.
- `src/lib/leads-store.ts` / `src/lib/contact-store.ts` — acesso ao banco via Prisma.

## Status da automação (robô de prospecção)

O painel `/admin` implementa o fluxo completo de ponta a ponta, rodando como job assíncrono
(`after()` do Next.js — a requisição responde na hora e o pipeline continua em segundo plano,
com a página fazendo polling do status). Persistência via Postgres.

| Etapa | Status | Requer |
|---|---|---|
| Escanear anúncio/classificado | **Simulado** — gera um lead a partir do domínio da URL | Fase 2: buscar o HTML da página e usar a Claude para extrair dados reais |
| Gerar o site com IA | **Real** — a Claude gera o HTML completo do mockup + 5 ideias de conteúdo | `ANTHROPIC_API_KEY` |
| Publicar no GitHub | **Real** — cria um repositório privado e commita o `index.html` gerado | `GITHUB_TOKEN` (e opcionalmente `GITHUB_ORG`) |
| Publicar o mockup | **Real** — o mockup fica disponível em `SITE_URL/<slug>`, servido direto do banco | `SITE_URL` |
| Enviar e-mail ao cliente | **Real**, mas só dispara se o lead tiver `contactEmail` | `RESEND_API_KEY` |

O formulário de contato do site público (`/api/contact`) já usa o mesmo mecanismo de e-mail:
funciona de verdade assim que `RESEND_API_KEY` estiver configurada; sem ela, a mensagem fica
salva no banco mas o e-mail não é enviado.

**Importante:** a seção pública "Como funciona" mostra só o fluxo voltado ao cliente. A parte de
descoberta ativa (varredura de anúncios/classificados) é um processo interno e não deve ser
divulgada no site.

## Deploy

Recomendado: [Vercel](https://vercel.com/new). Configure todas as variáveis de `.env.example`
(incluindo `DATABASE_URL`/`DIRECT_URL` do Supabase) no painel do projeto antes do deploy.
