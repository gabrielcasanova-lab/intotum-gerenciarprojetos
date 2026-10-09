import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accessGrants,
  clients,
  projectClients,
  projects,
  users,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/dal";
import { isUuid } from "@/lib/data/access";
import { roleLabel } from "@/lib/labels";
import * as ui from "@/lib/ui/styles";
import { ConfirmButton } from "@/components/confirm-button";
import { addGrant, removeGrant, setUserActive } from "../actions";
import { ResetPasswordForm } from "../forms";

async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) notFound();

  const [grants, projectList, clientList] = await Promise.all([
    db
      .select({
        id: accessGrants.id,
        level: accessGrants.level,
        projectName: projects.name,
        projectClientId: accessGrants.projectClientId,
      })
      .from(accessGrants)
      .leftJoin(projects, eq(projects.id, accessGrants.projectId))
      .where(eq(accessGrants.userId, id)),
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .orderBy(asc(projects.name)),
    db
      .select({
        id: projectClients.id,
        projectName: projects.name,
        clientName: clients.name,
      })
      .from(projectClients)
      .innerJoin(projects, eq(projects.id, projectClients.projectId))
      .innerJoin(clients, eq(clients.id, projectClients.clientId))
      .orderBy(asc(projects.name), asc(clients.name)),
  ]);

  const clientLabel = new Map(
    clientList.map((c) => [c.id, `${c.projectName} › ${c.clientName}`]),
  );
  const isClientUser = user.role === "cliente";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/usuarios" className="text-sm text-blue-700 hover:underline">
          ← Usuários
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{user.name}</h1>
        <p className="text-sm text-slate-600">
          {user.email} · {roleLabel[user.role]}
          {!user.active && " · desativado"}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Acessos</h2>
        {user.role === "admin" ? (
          <p className="text-sm text-slate-600">
            Administrador acessa todos os projetos sem precisar de vínculo.
          </p>
        ) : (
          <>
            {grants.length > 0 ? (
              <ul className={`${ui.card} divide-y divide-slate-200`}>
                {grants.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between gap-2 px-4 py-2 text-sm"
                  >
                    <span>
                      {g.projectClientId
                        ? clientLabel.get(g.projectClientId)
                        : `${g.projectName} (projeto inteiro)`}
                      <span className="ml-2 text-slate-500">
                        {g.level === "editar" ? "Edição" : "Visualização"}
                      </span>
                    </span>
                    <form action={removeGrant}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="grantId" value={g.id} />
                      <button className={ui.buttonDanger}>Remover</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">
                Sem acessos. A pessoa entra mas não vê nenhum cliente.
              </p>
            )}

            <form
              action={addGrant}
              className={`${ui.card} flex flex-wrap items-end gap-3 p-4`}
            >
              <input type="hidden" name="userId" value={user.id} />
              <label className={`${ui.label} min-w-60 flex-1`}>
                Dar acesso a
                <select name="scope" required className={ui.input}>
                  {!isClientUser && (
                    <optgroup label="Projeto inteiro">
                      {projectList.map((p) => (
                        <option key={p.id} value={`p:${p.id}`}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Um cliente">
                    {clientList.map((c) => (
                      <option key={c.id} value={`pc:${c.id}`}>
                        {c.projectName} › {c.clientName}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              {isClientUser ? (
                <input type="hidden" name="level" value="visualizar" />
              ) : (
                <label className={ui.label}>
                  Nível
                  <select name="level" defaultValue="editar" className={ui.input}>
                    <option value="editar">Edição</option>
                    <option value="visualizar">Visualização</option>
                  </select>
                </label>
              )}
              <button className={ui.button}>Dar acesso</button>
            </form>
            {isClientUser && (
              <p className="text-xs text-slate-500">
                Usuário de cliente só vê o cliente vinculado e nunca edita.
              </p>
            )}
          </>
        )}
      </section>

      <section className={`${ui.card} flex flex-col gap-4 p-4`}>
        <h2 className="font-semibold">Conta</h2>
        <ResetPasswordForm userId={user.id} />
        {user.id !== admin.id && (
          <form action={setUserActive}>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="active" value={String(!user.active)} />
            {user.active ? (
              <ConfirmButton
                className={ui.buttonSecondary}
                message={`Desativar ${user.name}? A pessoa perde o acesso na hora.`}
              >
                Desativar usuário
              </ConfirmButton>
            ) : (
              <button className={ui.buttonSecondary}>Reativar usuário</button>
            )}
          </form>
        )}
      </section>
    </div>
  );
}

export default function UserPage({ params }: PageProps<"/admin/usuarios/[id]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">Carregando…</p>}>
      <UserDetail params={params} />
    </Suspense>
  );
}
