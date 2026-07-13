import Link from "next/link";
import { listJobs } from "@/lib/jobs-store";
import { JOB_STATUS_LABELS, isJobStale } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await listJobs();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Varreduras</h1>
        <Link
          href="/admin/leads/new"
          className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-5 py-2 text-sm font-medium text-white"
        >
          Nova varredura
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Leads criados</th>
              <th className="px-4 py-3">Iniciado em</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  Nenhuma varredura ainda.
                </td>
              </tr>
            )}
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-border hover:bg-surface">
                <td className="max-w-[320px] truncate px-4 py-3">
                  <Link href={`/admin/jobs/${job.id}`} className="font-medium text-foreground hover:text-accent">
                    {job.sourceUrl}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">
                  {JOB_STATUS_LABELS[job.status]}
                  {isJobStale(job) && (
                    <span className="ml-2 rounded-full border border-amber-500/40 px-2 py-0.5 text-xs text-amber-400">
                      travado?
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {job.leadsCreated}
                  {job.totalToProcess ? ` / ${job.totalToProcess}` : ""}
                </td>
                <td className="px-4 py-3 text-muted">{new Date(job.createdAt).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
