import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Impede que o Turbopack empacote/relocate esses pacotes — eles carregam
  // binários em tempo de execução usando caminhos relativos ao próprio
  // node_modules, e um bundle os move para outro lugar, quebrando isso.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // O rastreador de arquivos da Vercel não detecta sozinho os binários do
  // Chromium (não são carregados via require/import), então precisam ser
  // listados explicitamente para entrarem no pacote da função.
  outputFileTracingIncludes: {
    "/*": ["node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;
