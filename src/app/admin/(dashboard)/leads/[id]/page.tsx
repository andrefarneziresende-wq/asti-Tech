import { notFound } from "next/navigation";
import { getLead } from "@/lib/leads-store";
import { LeadLiveView } from "./LeadLiveView";
import { LeadEditForm } from "./LeadEditForm";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) notFound();

  return (
    <div>
      <LeadLiveView initialLead={lead} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="glow-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-foreground">Resultado do robô</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Custo mensal estimado</dt>
                <dd className="text-foreground">
                  {lead.estimatedMonthlyCost ? `R$ ${lead.estimatedMonthlyCost.toFixed(2)}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Mockup publicado</dt>
                <dd className="break-all text-foreground">
                  {lead.mockupUrl ? (
                    <a href={lead.mockupUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      {lead.mockupUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Repositório no GitHub</dt>
                <dd className="break-all text-foreground">
                  {lead.githubRepoUrl ? (
                    <a href={lead.githubRepoUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      {lead.githubRepoUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Ideias sugeridas para o site</dt>
                <dd>
                  {lead.siteIdeas?.length ? (
                    <ul className="mt-1 list-inside list-disc space-y-1 text-foreground">
                      {lead.siteIdeas.map((idea) => (
                        <li key={idea}>{idea}</li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="glow-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-foreground">Identidade visual detectada no anúncio</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Logo</dt>
                <dd className="mt-1">
                  {lead.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={lead.logoUrl}
                      alt={`Logo de ${lead.businessName}`}
                      className="h-12 max-w-full rounded bg-white/5 object-contain p-1"
                    />
                  ) : (
                    <span className="text-foreground">Nenhuma logo identificada nas fotos do anúncio</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Cores de marca</dt>
                <dd className="mt-1">
                  {lead.brandColors?.length ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {lead.brandColors.map((color) => (
                        <span key={color} className="flex items-center gap-1.5 text-xs text-foreground">
                          <span
                            className="h-4 w-4 rounded-full border border-border"
                            style={{ backgroundColor: color }}
                          />
                          {color}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-foreground">Nenhuma cor de marca identificada nas fotos do anúncio</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Detalhes do anúncio usados na geração</dt>
                <dd className="text-foreground">{lead.businessDescription || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <LeadEditForm lead={lead} />
      </div>
    </div>
  );
}
