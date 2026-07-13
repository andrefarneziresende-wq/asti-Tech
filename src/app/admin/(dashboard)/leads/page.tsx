import Link from "next/link";
import { listLeads } from "@/lib/leads-store";
import { LeadsTable } from "./LeadsTable";

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

      <div className="mt-6">
        <LeadsTable leads={leads} />
      </div>
    </div>
  );
}
