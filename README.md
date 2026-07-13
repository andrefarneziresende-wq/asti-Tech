# ASTI Tech

Site institucional da ASTI Tech — desenvolvimento de sites para pequenas e médias empresas
usando Inteligência Artificial — e painel administrativo com o esqueleto do robô de prospecção
automatizada.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) para o site público e
[http://localhost:3000/admin](http://localhost:3000/admin) para o painel administrativo
(senha padrão de desenvolvimento: `astitech2026`, definida em `ADMIN_PASSWORD`).

Copie `.env.example` para `.env.local` e preencha as variáveis conforme necessário.

## Estrutura

- `src/app/(site)` — site público (Hero, Serviços, Como funciona, Orçamento, Contato).
- `src/app/admin` — painel administrativo protegido por senha (`src/middleware.ts`).
- `src/lib/pipeline.ts` — etapas do robô de prospecção (scan → geração do site → GitHub →
  publicação do mockup → e-mail ao cliente).
- `src/lib/leads-store.ts` — persistência simples dos leads em `data/leads.json` (arquivo local,
  não versionado).

## Status da automação (robô de prospecção)

O painel `/admin` já implementa o fluxo completo de ponta a ponta, mas hoje roda em modo
**simulado** nos pontos abaixo — para virar produção, é preciso configurar as integrações reais:

| Etapa | Hoje | Para produção |
|---|---|---|
| Escanear anúncio/classificado | Gera um lead simulado a partir do domínio da URL | Buscar o HTML da página e usar a API da Claude para extrair dados reais (nome, contato, segmento) |
| Gerar o site com IA | Retorna ideias de conteúdo pré-definidas | Chamar a API da Claude (Messages API) para gerar o código-fonte completo do site |
| Publicar no GitHub | Retorna uma URL de repositório simulada | Usar a API do GitHub (`GITHUB_TOKEN` + `GITHUB_ORG`) para criar o repositório e commitar o código |
| Publicar o mockup | Retorna uma URL simulada | Disparar um deploy real (ex.: API da Vercel) do repositório gerado |
| Enviar e-mail ao cliente | Só envia se houver `contactEmail` e `RESEND_API_KEY` configurados | Já funcional — só falta as duas condições acima |

O formulário de contato do site público (`/api/contact`) já usa o mesmo mecanismo de e-mail:
funciona de verdade assim que `RESEND_API_KEY` estiver configurada; sem ela, as mensagens ficam
salvas em `data/contact-messages.json`.

## Deploy

Recomendado: [Vercel](https://vercel.com/new). Configure as variáveis de `.env.example` no painel
do projeto antes do deploy.
