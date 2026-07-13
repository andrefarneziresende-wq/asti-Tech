import { withBrowser, renderPageHtml } from "./browser";

const BLOCKED_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const PRIVATE_IP_RE = /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/;

/** Bloqueia URLs óbvias de rede interna antes de buscar (proteção básica contra SSRF). */
export function assertPublicHttpUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("URL inválida.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Apenas URLs http/https são permitidas.");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || PRIVATE_IP_RE.test(hostname)) {
    throw new Error("Essa URL não é permitida.");
  }

  return url;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca o HTML da página já renderizado num navegador real — necessário
 * porque a maioria dos sites de classificados (OLX e similares) monta o
 * conteúdo via JavaScript, e um fetch comum só veria a casca vazia da página.
 */
export async function fetchPageHtml(sourceUrl: string): Promise<string> {
  const url = assertPublicHttpUrl(sourceUrl);
  return withBrowser((browser) => renderPageHtml(browser, url.toString()));
}

/** Busca a página (renderizada) e devolve o texto visível (sem tags), truncado para um tamanho razoável. */
export async function fetchPageText(sourceUrl: string, maxChars = 15000): Promise<string> {
  const html = await fetchPageHtml(sourceUrl);
  return htmlToText(html).slice(0, maxChars);
}

/** Extrai links (mesma origem) de dentro de um HTML, resolvidos para URL absoluta e sem duplicatas. */
export function extractSameOriginLinks(html: string, baseUrl: string, max = 300): string[] {
  const base = new URL(baseUrl);
  const hrefRe = /<a\s+[^>]*href\s*=\s*["']([^"']+)["']/gi;
  const seen = new Set<string>();
  const links: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = hrefRe.exec(html))) {
    const raw = match[1];
    if (!raw || raw.startsWith("#") || /^(mailto|tel|javascript):/i.test(raw)) continue;

    let resolved: URL;
    try {
      resolved = new URL(raw, base);
    } catch {
      continue;
    }

    if (resolved.hostname !== base.hostname || !["http:", "https:"].includes(resolved.protocol)) {
      continue;
    }

    resolved.hash = "";
    const normalized = resolved.toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    links.push(normalized);
    if (links.length >= max) break;
  }

  return links;
}
