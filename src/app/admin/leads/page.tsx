import Link from "next/link";
import { listLeads } from "@/lib/leads-store";
import { STATUS_LABELS } from "@/lib/leads";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await listLeads();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
        <Link
          href="/admin/leads/new"
          className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-5 py-2 text-sm font-medium text-white"
        >
          Escanear novo anúncio
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Negócio</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Custo estimado</th>
              <th className="px-4 py-3">Atualizado em</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  Nenhum lead cadastrado ainda.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-border hover:bg-surface">
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${lead.id}`} className="font-medium text-foreground hover:text-accent">
                    {lead.businessName}
                  </Link>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-muted">{lead.sourceUrl}</td>
                <td className="px-4 py-3 text-muted">{STATUS_LABELS[lead.status]}</td>
                <td className="px-4 py-3 text-muted">
                  {lead.estimatedMonthlyCost ? `R$ ${lead.estimatedMonthlyCost.toFixed(2)}` : "-"}
                </td>
                <td className="px-4 py-3 text-muted">{new Date(lead.updatedAt).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
