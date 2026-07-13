import Link from "next/link";
import { listLeads } from "@/lib/leads-store";
import { STATUS_LABELS, type LeadStatus } from "@/lib/leads";

export default async function AdminDashboard() {
  const leads = await listLeads();

  const counts = leads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.status] = (acc[lead.status] ?? 0) + 1;
    return acc;
  }, {});

  const recent = leads.slice(0, 6);

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">
        Visão geral do robô de prospecção: descoberta de leads, geração de sites com IA e envio de e-mails.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((status) => (
          <div key={status} className="glow-card rounded-2xl p-5">
            <div className="text-2xl font-bold text-foreground">{counts[status] ?? 0}</div>
            <div className="mt-1 text-xs text-muted">{STATUS_LABELS[status]}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Leads recentes</h2>
        <Link
          href="/admin/leads/new"
          className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-5 py-2 text-sm font-medium text-white"
        >
          Escanear novo anúncio
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Negócio</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Atualizado em</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted">
                  Nenhum lead ainda. Comece escaneando um anúncio.
                </td>
              </tr>
            )}
            {recent.map((lead) => (
              <tr key={lead.id} className="border-t border-border hover:bg-surface">
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${lead.id}`} className="font-medium text-foreground hover:text-accent">
                    {lead.businessName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{STATUS_LABELS[lead.status]}</td>
                <td className="px-4 py-3 text-muted">{new Date(lead.updatedAt).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
