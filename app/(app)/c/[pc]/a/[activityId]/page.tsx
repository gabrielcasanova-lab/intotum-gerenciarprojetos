import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { activities, clientModules, comments, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getClientAccess, isUuid } from "@/lib/data/access";
import { visibleCommentTypes } from "@/lib/permissions";
import {
  formatDate,
  priorityLabel,
  PRIORITIES,
  statusColor,
  statusLabel,
  STATUSES,
} from "@/lib/labels";
import * as ui from "@/lib/ui/styles";
import { ConfirmButton } from "@/components/confirm-button";
import { addComment, deleteActivity, updateActivity } from "../../../actions";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

async function ActivityDetail({
  params,
}: {
  params: Promise<{ pc: string; activityId: string }>;
}) {
  const user = await getCurrentUser();
  const { pc, activityId } = await params;
  if (!isUuid(activityId)) notFound();
  const access = await getClientAccess(user, pc);
  if (!access) notFound();
  const editable = access.level === "editar";

  const [activity] = await db
    .select({
      id: activities.id,
      parentId: activities.parentId,
      name: activities.name,
      description: activities.description,
      status: activities.status,
      priority: activities.priority,
      assigneeUserId: activities.assigneeUserId,
      clientContact: activities.clientContact,
      startDate: activities.startDate,
      dueDate: activities.dueDate,
      completedAt: activities.completedAt,
      moduleName: clientModules.name,
    })
    .from(activities)
    .innerJoin(clientModules, eq(clientModules.id, activities.clientModuleId))
    .where(
      and(eq(activities.id, activityId), eq(clientModules.projectClientId, pc)),
    );
  if (!activity) notFound();

  const [commentRows, team, parent] = await Promise.all([
    db
      .select({
        id: comments.id,
        body: comments.body,
        visibility: comments.visibility,
        createdAt: comments.createdAt,
        authorName: users.name,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.authorUserId))
      .where(
        and(
          eq(comments.activityId, activityId),
          inArray(comments.visibility, visibleCommentTypes(user.role)),
        ),
      )
      .orderBy(asc(comments.createdAt)),
    editable
      ? db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(and(ne(users.role, "cliente"), eq(users.active, true)))
          .orderBy(asc(users.name))
      : Promise.resolve([]),
    activity.parentId
      ? db
          .select({ id: activities.id, name: activities.name })
          .from(activities)
          .where(eq(activities.id, activity.parentId))
          .then((r) => r[0])
      : Promise.resolve(undefined),
  ]);

  const sections = visibleCommentTypes(user.role).map((v) => ({
    visibility: v,
    title: v === "interno" ? "Comentários internos" : "Comentários para o cliente",
    hint:
      v === "interno"
        ? "Só a equipe da Intotum vê."
        : user.role === "cliente"
          ? undefined
          : "O cliente vê estes comentários.",
    list: commentRows.filter((c) => c.visibility === v),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/c/${pc}`} className="text-sm text-blue-700 hover:underline">
          ← {access.clientName} · {activity.moduleName}
        </Link>
        {parent && (
          <p className="mt-1 text-sm text-slate-500">
            Subatividade de{" "}
            <Link href={`/c/${pc}/a/${parent.id}`} className="hover:underline">
              {parent.name}
            </Link>
          </p>
        )}
        <h1 className="mt-1 text-2xl font-semibold">{activity.name}</h1>
      </div>

      {editable ? (
        <form action={updateActivity} className={`${ui.card} grid gap-3 p-4 sm:grid-cols-2`}>
          <input type="hidden" name="projectClientId" value={pc} />
          <input type="hidden" name="activityId" value={activity.id} />
          <label className={`${ui.label} sm:col-span-2`}>
            Nome
            <input
              name="name"
              required
              maxLength={300}
              defaultValue={activity.name}
              className={ui.input}
            />
          </label>
          <label className={`${ui.label} sm:col-span-2`}>
            Descrição
            <textarea
              name="description"
              rows={3}
              maxLength={5000}
              defaultValue={activity.description ?? ""}
              className={ui.input}
            />
          </label>
          <label className={ui.label}>
            Status
            <select name="status" defaultValue={activity.status} className={ui.input}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.label}>
            Prioridade
            <select name="priority" defaultValue={activity.priority} className={ui.input}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {priorityLabel[p]}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.label}>
            Responsável (Intotum)
            <select
              name="assigneeUserId"
              defaultValue={activity.assigneeUserId ?? ""}
              className={ui.input}
            >
              <option value="">—</option>
              {team.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.label}>
            Contato no cliente
            <input
              name="clientContact"
              maxLength={200}
              defaultValue={activity.clientContact ?? ""}
              className={ui.input}
            />
          </label>
          <label className={ui.label}>
            Início
            <input
              name="startDate"
              type="date"
              defaultValue={activity.startDate ?? ""}
              className={ui.input}
            />
          </label>
          <label className={ui.label}>
            Prazo
            <input
              name="dueDate"
              type="date"
              defaultValue={activity.dueDate ?? ""}
              className={ui.input}
            />
          </label>
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <button className={ui.button}>Salvar</button>
            {activity.completedAt && (
              <span className="text-xs text-slate-500">
                Concluída em {dateTime.format(activity.completedAt)}
              </span>
            )}
          </div>
        </form>
      ) : (
        <dl className={`${ui.card} grid gap-3 p-4 text-sm sm:grid-cols-2`}>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${statusColor[activity.status]}`}
              >
                {statusLabel[activity.status]}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Prioridade</dt>
            <dd>{priorityLabel[activity.priority]}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Início</dt>
            <dd>{formatDate(activity.startDate) || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Prazo</dt>
            <dd>{formatDate(activity.dueDate) || "—"}</dd>
          </div>
          {activity.description && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Descrição</dt>
              <dd className="whitespace-pre-wrap">{activity.description}</dd>
            </div>
          )}
        </dl>
      )}

      {sections.map((s) => (
        <section key={s.visibility} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          {s.hint && <p className="-mt-2 text-xs text-slate-500">{s.hint}</p>}
          {s.list.length > 0 ? (
            <ul className={`${ui.card} divide-y divide-slate-100`}>
              {s.list.map((c) => (
                <li key={c.id} className="px-4 py-3 text-sm">
                  <p className="text-xs text-slate-500">
                    {c.authorName ?? "Usuário removido"} ·{" "}
                    {dateTime.format(c.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nenhum comentário.</p>
          )}
          {editable && (
            <form action={addComment} className="flex flex-col gap-2">
              <input type="hidden" name="projectClientId" value={pc} />
              <input type="hidden" name="activityId" value={activity.id} />
              <input type="hidden" name="visibility" value={s.visibility} />
              <textarea
                name="body"
                required
                rows={2}
                maxLength={5000}
                aria-label={s.title}
                placeholder={
                  s.visibility === "interno"
                    ? "Comentário interno"
                    : "Comentário que o cliente vai ver"
                }
                className={ui.input}
              />
              <div>
                <button className={ui.buttonSecondary}>Comentar</button>
              </div>
            </form>
          )}
        </section>
      ))}

      {editable && (
        <form action={deleteActivity}>
          <input type="hidden" name="projectClientId" value={pc} />
          <input type="hidden" name="activityId" value={activity.id} />
          <ConfirmButton
            className={ui.buttonDanger}
            message={`Excluir a atividade "${activity.name}" e os comentários dela?`}
          >
            Excluir atividade
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}

export default function ActivityPage({ params }: PageProps<"/c/[pc]/a/[activityId]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">Carregando…</p>}>
      <ActivityDetail params={params} />
    </Suspense>
  );
}
