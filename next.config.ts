import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O Chromium do @sparticuz/chromium é carregado como binário em tempo de
  // execução (não via require/import), então o rastreador de arquivos da
  // Vercel não o inclui automaticamente no pacote da função — precisa ser
  // listado explicitamente aqui.
  outputFileTracingIncludes: {
    "/*": ["node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;
