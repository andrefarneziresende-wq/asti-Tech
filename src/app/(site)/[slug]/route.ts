import { getLeadBySlug } from "@/lib/leads-store";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lead = await getLeadBySlug(slug);

  if (!lead || !lead.siteHtml) {
    return new Response("Mockup não encontrado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(lead.siteHtml, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
