import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activities,
  attachments,
  clientModules,
  comments,
  users,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getClientAccess, isUuid } from "@/lib/data/access";
import { visibleCommentTypes } from "@/lib/permissions";
import { formatDate, PRIORITIES, statusColor, STATUSES } from "@/lib/labels";
import { dateTimeFormat, dictionary } from "@/lib/i18n";
import * as ui from "@/lib/ui/styles";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { ConfirmButton } from "@/components/confirm-button";
import { FileInput } from "@/components/file-input";
import {
  addComment,
  deleteActivity,
  deleteAttachment,
  updateActivity,
  uploadAttachment,
} from "../../../actions";

function fileSize(bytes: number | null) {
  if (bytes === null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

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
  const t = dictionary(user.language);
  const dateTime = dateTimeFormat(user.language);

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
      completedOn: activities.completedOn,
      moduleName: clientModules.name,
    })
    .from(activities)
    .innerJoin(clientModules, eq(clientModules.id, activities.clientModuleId))
    .where(
      and(eq(activities.id, activityId), eq(clientModules.projectClientId, pc)),
    );
  if (!activity) notFound();

  const [commentRows, team, parent, files] = await Promise.all([
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
    db
      .select({
        id: attachments.id,
        fileName: attachments.fileName,
        visibility: attachments.visibility,
        sizeBytes: attachments.sizeBytes,
        createdAt: attachments.createdAt,
        uploaderName: users.name,
      })
      .from(attachments)
      .leftJoin(users, eq(users.id, attachments.uploadedBy))
      .where(
        and(
          eq(attachments.activityId, activityId),
          inArray(attachments.visibility, visibleCommentTypes(user.role)),
        ),
      )
      .orderBy(asc(attachments.createdAt)),
  ]);

  const sections = visibleCommentTypes(user.role).map((v) => ({
    visibility: v,
    title: v === "interno" ? t.internalComments : t.clientComments,
    hint:
      v === "interno"
        ? t.internalHint
        : user.role === "cliente"
          ? undefined
          : t.clientHint,
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
            {t.subactivityOf}{" "}
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
            {t.name}
            <input
              name="name"
              required
              maxLength={300}
              defaultValue={activity.name}
              className={ui.input}
            />
          </label>
          <label className={`${ui.label} sm:col-span-2`}>
            {t.description}
            <textarea
              name="description"
              rows={3}
              maxLength={5000}
              defaultValue={activity.description ?? ""}
              className={ui.input}
            />
          </label>
          <label className={ui.label}>
            {t.statusField}
            <select name="status" defaultValue={activity.status} className={ui.input}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t.status[s]}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.label}>
            {t.priorityField}
            <select name="priority" defaultValue={activity.priority} className={ui.input}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t.priority[p]}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.label}>
            {t.assignee}
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
            {t.clientContact}
            <input
              name="clientContact"
              maxLength={200}
              defaultValue={activity.clientContact ?? ""}
              className={ui.input}
            />
          </label>
          <label className={ui.label}>
            {t.start}
            <input
              name="startDate"
              type="date"
              defaultValue={activity.startDate ?? ""}
              className={ui.input}
            />
          </label>
          <label className={ui.label}>
            {t.due}
            <input
              name="dueDate"
              type="date"
              defaultValue={activity.dueDate ?? ""}
              className={ui.input}
            />
          </label>
          <label className={ui.label}>
            {t.completed}
            <input
              name="completedOn"
              type="date"
              defaultValue={activity.completedOn ?? ""}
              className={ui.input}
            />
          </label>
          <p className="self-end pb-2 text-xs text-slate-500">
            {t.autoDatesHint}
          </p>
          <div className="sm:col-span-2">
            <button className={ui.button}>{t.save}</button>
          </div>
        </form>
      ) : (
        <dl className={`${ui.card} grid gap-3 p-4 text-sm sm:grid-cols-2`}>
          <div>
            <dt className="text-slate-500">{t.statusField}</dt>
            <dd>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${statusColor[activity.status]}`}
              >
                {t.status[activity.status]}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.priorityField}</dt>
            <dd>{t.priority[activity.priority]}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.start}</dt>
            <dd>{formatDate(activity.startDate) || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.due}</dt>
            <dd>{formatDate(activity.dueDate) || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t.completed}</dt>
            <dd>{formatDate(activity.completedOn) || "—"}</dd>
          </div>
          {activity.description && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">{t.description}</dt>
              <dd className="whitespace-pre-wrap">{activity.description}</dd>
            </div>
          )}
        </dl>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.attachments}</h2>
        {files.length > 0 ? (
          <ul className={`${ui.card} divide-y divide-slate-100`}>
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
                {/* Link comum: o arquivo abre (PDF/imagem) ou é baixado. */}
                <a
                  href={`/c/${pc}/anexos/${f.id}`}
                  target="_blank"
                  rel="noopener"
                  className="min-w-0 flex-1 break-all text-blue-700 hover:underline"
                >
                  📎 {f.fileName}
                </a>
                <span className="text-xs text-slate-500">
                  {fileSize(f.sizeBytes)} · {f.uploaderName ?? t.removedUser} ·{" "}
                  {dateTime.format(f.createdAt)}
                </span>
                {user.role !== "cliente" && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      f.visibility === "interno"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {f.visibility === "interno" ? t.internal : t.clientSees}
                  </span>
                )}
                {editable && (
                  <form action={deleteAttachment}>
                    <input type="hidden" name="projectClientId" value={pc} />
                    <input type="hidden" name="activityId" value={activity.id} />
                    <input type="hidden" name="attachmentId" value={f.id} />
                    <ConfirmButton
                      className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                      aria-label={t.deleteNamed(f.fileName)}
                      title={t.deleteAttachment}
                      message={t.confirmDeleteAttachment(f.fileName)}
                    >
                      ×
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{t.noAttachments}</p>
        )}
        {editable && (
          <form action={uploadAttachment} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectClientId" value={pc} />
            <input type="hidden" name="activityId" value={activity.id} />
            <label className={`${ui.label} min-w-48 flex-1`}>
              {t.fileUpTo}
              <FileInput
                tooBigMessage={t.fileTooBig(Math.round(MAX_UPLOAD_BYTES / 1024 / 1024))}
                name="file"
                required
                maxBytes={MAX_UPLOAD_BYTES}
                className={ui.input}
              />
            </label>
            <label className={ui.label}>
              {t.whoSees}
              <select name="visibility" defaultValue="interno" className={ui.input}>
                <option value="interno">{t.teamOnly}</option>
                <option value="cliente">{t.teamAndClient}</option>
              </select>
            </label>
            <button className={ui.buttonSecondary}>{t.attach}</button>
          </form>
        )}
      </section>

      {sections.map((s) => (
        <section key={s.visibility} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{s.title}</h2>
          {s.hint && <p className="-mt-2 text-xs text-slate-500">{s.hint}</p>}
          {s.list.length > 0 ? (
            <ul className={`${ui.card} divide-y divide-slate-100`}>
              {s.list.map((c) => (
                <li key={c.id} className="px-4 py-3 text-sm">
                  <p className="text-xs text-slate-500">
                    {c.authorName ?? t.removedUser} ·{" "}
                    {dateTime.format(c.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{t.noComments}</p>
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
                    ? t.internalPlaceholder
                    : t.clientPlaceholder
                }
                className={ui.input}
              />
              <div>
                <button className={ui.buttonSecondary}>{t.comment}</button>
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
            message={t.confirmDeleteActivity(activity.name)}
          >
            {t.deleteActivity}
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}

export default function ActivityPage({ params }: PageProps<"/c/[pc]/a/[activityId]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">…</p>}>
      <ActivityDetail params={params} />
    </Suspense>
  );
}
