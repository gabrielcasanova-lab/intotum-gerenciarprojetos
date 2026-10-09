import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectClients, projects } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/dal";
import { projectTypeLabel } from "@/lib/labels";
import * as ui from "@/lib/ui/styles";
import { createProject } from "./actions";

export const metadata: Metadata = { title: "Projetos" };

async function ProjectList() {
  await requireAdmin();
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      type: projects.type,
      active: projects.active,
      clients: count(projectClients.id),
    })
    .from(projects)
    .leftJoin(projectClients, eq(projectClients.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(asc(projects.name));

  if (rows.length === 0) {
    return <p className="text-slate-600">Nenhum projeto cadastrado ainda.</p>;
  }

  return (
    <ul className={`${ui.card} divide-y divide-slate-200`}>
      {rows.map((p) => (
        <li key={p.id}>
          <Link
            href={`/admin/projetos/${p.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
          >
            <span>
              {p.name}
              {!p.active && (
                <span className="ml-2 text-xs text-slate-500">(inativo)</span>
              )}
            </span>
            <span className="text-xs text-slate-500">
              {projectTypeLabel[p.type]} · {p.clients}{" "}
              {p.clients === 1 ? "cliente" : "clientes"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Projetos</h1>
      <Suspense fallback={<p className="text-slate-500">Carregando…</p>}>
        <ProjectList />
      </Suspense>

      <form action={createProject} className={`${ui.card} flex flex-col gap-3 p-4`}>
        <h2 className="font-semibold">Novo projeto</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className={ui.label}>
            Nome
            <input name="name" required maxLength={200} className={ui.input} />
          </label>
          <label className={ui.label}>
            Tipo
            <select name="type" className={ui.input} defaultValue="sistema">
              <option value="sistema">Sistema</option>
              <option value="servico">Serviço</option>
            </select>
          </label>
        </div>
        <label className={ui.label}>
          Descrição
          <textarea name="description" rows={2} className={ui.input} />
        </label>
        <div>
          <button className={ui.button}>Criar projeto</button>
        </div>
      </form>
    </div>
  );
}
