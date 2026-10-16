import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listVisibleClients, type VisibleClient } from "@/lib/data/access";
import { ImplementationBadge } from "@/components/implementation-badge";

async function ClientList() {
  const user = await getCurrentUser();
  const visible = await listVisibleClients(user);

  if (visible.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-slate-600">
        {user.role === "admin"
          ? "Nenhum cliente cadastrado ainda."
          : "Você ainda não foi vinculado a nenhum projeto. Fale com o administrador."}
      </p>
    );
  }

  const byProject = Map.groupBy(visible, (c: VisibleClient) => c.projectName);

  return (
    <div className="flex flex-col gap-6">
      {[...byProject].map(([project, list]) => (
        <section key={project}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {project}
          </h2>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {list.map((c) => (
              <li key={c.projectClientId}>
                <Link
                  href={`/c/${c.projectClientId}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    {c.clientName}
                    <ImplementationBadge status={c.status} />
                  </span>
                  <span className="text-xs text-slate-500">
                    {c.level === "editar" ? "Edição" : "Visualização"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Clientes</h1>
      <Suspense fallback={<p className="text-slate-500">Carregando…</p>}>
        <ClientList />
      </Suspense>
    </>
  );
}
