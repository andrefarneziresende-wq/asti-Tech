import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";

/** Abre um Chromium (compatível com ambiente serverless) e garante que fecha no final. */
export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
  });

  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

/**
 * Renderiza a página num navegador de verdade (necessário para sites que
 * carregam o conteúdo via JavaScript, como a maioria dos classificados) e
 * devolve o HTML já processado.
 */
export async function renderPageHtml(browser: Browser, url: string): Promise<string> {
  const page = await browser.newPage();
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    // Dá um tempo curto pra hidratação/JS terminar de montar o conteúdo antes de capturar o HTML.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return await page.content();
  } finally {
    await page.close();
  }
}
