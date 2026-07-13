import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASTI Tech — Sites criados com Inteligência Artificial para PMEs",
  description:
    "A ASTI Tech desenvolve sites profissionais para pequenas e médias empresas usando Inteligência Artificial: mais rápido, mais barato e sob medida para o seu negócio.",
  metadataBase: new URL("https://astitech.com.br"),
  openGraph: {
    title: "ASTI Tech — Sites criados com Inteligência Artificial para PMEs",
    description:
      "Desenvolvimento de sites para pequenas e médias empresas usando Inteligência Artificial.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased" style={{ ["--font-body" as string]: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
