import { notFound } from "next/navigation";
import { getLead } from "@/lib/leads-store";
import { STATUS_LABELS } from "@/lib/leads";
import { RunJobButton } from "./RunJobButton";
import { LeadEditForm } from "./LeadEditForm";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{lead.businessName}</h1>
          <p className="mt-1 text-sm text-muted">{lead.sourceUrl}</p>
          <span className="mt-2 inline-block rounded-full border border-border px-3 py-1 text-xs text-accent">
            {STATUS_LABELS[lead.status]}
          </span>
        </div>
        <RunJobButton leadId={lead.id} hasEmail={Boolean(lead.contactEmail)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="glow-card rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-foreground">Linha do tempo</h2>
            <ol className="mt-4 space-y-4 border-l border-border pl-4">
              {lead.timeline
                .slice()
                .reverse()
                .map((entry, idx) => (
                  <li key={idx} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-sm font-medium text-foreground">{entry.label}</p>
                    {entry.detail && <p className="text-xs text-muted">{entry.detail}</p>}
                    <p className="text-xs text-muted">{new Date(entry.at).toLocaleString("pt-BR")}</p>
                  </li>
                ))}
            </ol>
          </div>

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
        </div>

        <LeadEditForm lead={lead} />
      </div>
    </div>
  );
}
