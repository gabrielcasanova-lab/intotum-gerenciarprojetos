import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  activities,
  clientModules,
  moduleCatalog,
  trainingVideos,
  users,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getClientAccess } from "@/lib/data/access";
import {
  formatDate,
  IMPLEMENTATION_STATUSES,
  implementationStatusColor,
  implementationStatusLabel,
  statusColor,
  statusLabel,
  STATUSES,
  type Status,
} from "@/lib/labels";
import { isOverdue, percentDone, todayInBrazil } from "@/lib/progress";
import * as ui from "@/lib/ui/styles";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { ConfirmButton } from "@/components/confirm-button";
import { ImplementationBadge } from "@/components/implementation-badge";
import { MoveButtons } from "@/components/move-buttons";
import {
  activateModule,
  addActivity,
  addTrainingVideo,
  deleteActivity,
  deleteTrainingVideo,
  moveClientModule,
  removeClientModule,
  renameClientModule,
  updateImplementationStatus,
  updateStatus,
} from "../actions";

type Row = {
  id: string;
  clientModuleId: string;
  parentId: string | null;
  name: string;
  status: Status;
  dueDate: string | null;
  assigneeName: string | null;
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full bg-green-600" style={{ width: `${value}%` }} />
      </div>
      {value}%
    </div>
  );
}

async function ClientDetail({ params }: { params: Promise<{ pc: string }> }) {
  const user = await getCurrentUser();
  const { pc } = await params;
  const access = await getClientAccess(user, pc);
  if (!access) notFound();
  const editable = access.level === "editar";

  const modules = await db
    .select()
    .from(clientModules)
    .where(eq(clientModules.projectClientId, pc))
    .orderBy(asc(clientModules.position), asc(clientModules.name));

  const [rows, catalog, videos] = await Promise.all([
    modules.length
      ? db
          .select({
            id: activities.id,
            clientModuleId: activities.clientModuleId,
            parentId: activities.parentId,
            name: activities.name,
            status: activities.status,
            dueDate: activities.dueDate,
            assigneeName: users.name,
          })
          .from(activities)
          .leftJoin(users, eq(users.id, activities.assigneeUserId))
          .where(
            inArray(
              activities.clientModuleId,
              modules.map((m) => m.id),
            ),
          )
          .orderBy(asc(activities.position), asc(activities.createdAt))
      : Promise.resolve([] as Row[]),
    editable
      ? db
          .select({ id: moduleCatalog.id, name: moduleCatalog.name })
          .from(moduleCatalog)
          .where(eq(moduleCatalog.projectId, access.projectId))
          .orderBy(asc(moduleCatalog.position), asc(moduleCatalog.name))
      : Promise.resolve([]),
    db
      .select()
      .from(trainingVideos)
      .where(eq(trainingVideos.projectClientId, pc))
      .orderBy(desc(trainingVideos.recordedOn), desc(trainingVideos.createdAt)),
  ]);

  const today = todayInBrazil(new Date());
  const byModule = Map.groupBy(rows, (r: Row) => r.clientModuleId);
  const children = Map.groupBy(
    rows.filter((r) => r.parentId),
    (r: Row) => r.parentId!,
  );
  const overall = percentDone(rows.map((r) => r.status));
  const usedCatalog = new Set(modules.map((m) => m.moduleCatalogId));

  const activityLine = (a: Row, sub = false) => (
    <li
      key={a.id}
      className={`flex flex-wrap items-center gap-2 py-2 ${sub ? "pl-6" : ""}`}
    >
      <Link
        href={`/c/${pc}/a/${a.id}`}
        className="min-w-0 flex-1 text-sm hover:text-blue-700 hover:underline"
      >
        {sub && <span className="text-slate-400">↳ </span>}
        {a.name}
      </Link>
      {a.assigneeName && (
        <span className="text-xs text-slate-500">{a.assigneeName}</span>
      )}
      {a.dueDate && (
        <span
          className={`text-xs ${
            isOverdue(a.dueDate, a.status, today)
              ? "font-semibold text-red-700"
              : "text-slate-500"
          }`}
        >
          {formatDate(a.dueDate)}
        </span>
      )}
      {editable ? (
        // key: o React limpa o formulário após a ação; remontar mostra o status salvo.
        <form key={a.status} action={updateStatus}>
          <input type="hidden" name="projectClientId" value={pc} />
          <input type="hidden" name="activityId" value={a.id} />
          <AutoSubmitSelect
            name="status"
            defaultValue={a.status}
            aria-label={`Status de ${a.name}`}
            className={`rounded-full border-0 px-2 py-0.5 text-xs ${statusColor[a.status]}`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </AutoSubmitSelect>
        </form>
      ) : (
        <StatusBadge status={a.status} />
      )}
      {editable && (
        <form action={deleteActivity}>
          <input type="hidden" name="projectClientId" value={pc} />
          <input type="hidden" name="activityId" value={a.id} />
          <ConfirmButton
            className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
            aria-label={`Excluir ${a.name}`}
            title="Excluir atividade"
            message={`Excluir a atividade "${a.name}" deste cliente? Os comentários dela também serão apagados.`}
          >
            ×
          </ConfirmButton>
        </form>
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-blue-700 hover:underline">
          ← Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{access.clientName}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span>{access.projectName}</span>
          {editable ? (
            <form key={access.status} action={updateImplementationStatus}>
              <input type="hidden" name="projectClientId" value={pc} />
              <AutoSubmitSelect
                name="status"
                defaultValue={access.status}
                aria-label="Situação da implantação"
                title="Situação da implantação"
                className={`rounded-full border-0 px-2 py-0.5 text-xs ${implementationStatusColor[access.status]}`}
              >
                {IMPLEMENTATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {implementationStatusLabel[s]}
                  </option>
                ))}
              </AutoSubmitSelect>
            </form>
          ) : (
            <ImplementationBadge status={access.status} />
          )}
          {rows.length > 0 && <ProgressBar value={overall} />}
          {/* Link comum (não Link): o navegador abre o PDF numa aba nova. */}
          <a
            href={`/c/${pc}/pdf`}
            target="_blank"
            rel="noopener"
            className={ui.buttonSecondary}
          >
            Baixar PDF
          </a>
          <a
            href={`/c/${pc}/pdf?comentarios=1`}
            target="_blank"
            rel="noopener"
            className="text-sm text-blue-700 hover:underline"
          >
            PDF com comentários para o cliente
          </a>
        </div>
      </div>

      {modules.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-slate-600">
          Nenhum módulo ativado para este cliente ainda.
        </p>
      )}

      {modules.map((m, i) => {
        const list = byModule.get(m.id) ?? [];
        const top = list.filter((a) => !a.parentId);
        return (
          <section key={m.id} className={`${ui.card} p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {editable && (
                  <MoveButtons
                    action={moveClientModule}
                    fields={{ projectClientId: pc, clientModuleId: m.id }}
                    name={m.name}
                    first={i === 0}
                    last={i === modules.length - 1}
                  />
                )}
                <h2 className="text-lg font-semibold">{m.name}</h2>
              </div>
              <div className="flex items-center gap-3">
                {list.length > 0 && (
                  <ProgressBar value={percentDone(list.map((a) => a.status))} />
                )}
                {editable && (
                  <form action={removeClientModule}>
                    <input type="hidden" name="projectClientId" value={pc} />
                    <input type="hidden" name="clientModuleId" value={m.id} />
                    <ConfirmButton
                      className={ui.buttonDanger}
                      message={`Remover o módulo ${m.name} e todas as atividades dele?`}
                    >
                      Remover módulo
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </div>

            {editable && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-blue-700 hover:underline">
                  Renomear módulo
                </summary>
                <form
                  key={m.name}
                  action={renameClientModule}
                  className="mt-2 flex gap-2"
                >
                  <input type="hidden" name="projectClientId" value={pc} />
                  <input type="hidden" name="clientModuleId" value={m.id} />
                  <input
                    name="name"
                    required
                    maxLength={200}
                    defaultValue={m.name}
                    aria-label={`Novo nome de ${m.name}`}
                    className={`${ui.input} flex-1`}
                  />
                  <button className={ui.buttonSecondary}>Salvar nome</button>
                </form>
              </details>
            )}

            {top.length > 0 ? (
              <ul className="mt-2 divide-y divide-slate-100">
                {top.map((a) => [
                  activityLine(a),
                  ...(children.get(a.id) ?? []).map((s) => activityLine(s, true)),
                ])}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Sem atividades.</p>
            )}

            {editable && (
              <form action={addActivity} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="projectClientId" value={pc} />
                <input type="hidden" name="clientModuleId" value={m.id} />
                <input
                  name="name"
                  required
                  maxLength={300}
                  placeholder="Nova atividade"
                  aria-label={`Nova atividade em ${m.name}`}
                  className={`${ui.input} min-w-48 flex-1`}
                />
                {access.allowSubactivities && top.length > 0 ? (
                  <select
                    name="parentId"
                    defaultValue=""
                    aria-label="Dentro de"
                    className={ui.input}
                  >
                    <option value="">Atividade principal</option>
                    {top.map((a) => (
                      <option key={a.id} value={a.id}>
                        Subatividade de: {a.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="hidden" name="parentId" value="" />
                )}
                <button className={ui.buttonSecondary}>Adicionar</button>
              </form>
            )}
          </section>
        );
      })}

      <section className={`${ui.card} flex flex-col gap-3 p-4`}>
        <h2 className="text-lg font-semibold">Treinamentos gravados</h2>
        {videos.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {videos.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2 py-2">
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 text-sm text-blue-700 hover:underline"
                >
                  ▶ {v.title}
                </a>
                {v.recordedOn && (
                  <span className="text-xs text-slate-500">
                    {formatDate(v.recordedOn)}
                  </span>
                )}
                {editable && (
                  <form action={deleteTrainingVideo}>
                    <input type="hidden" name="projectClientId" value={pc} />
                    <input type="hidden" name="videoId" value={v.id} />
                    <ConfirmButton
                      className={ui.buttonDanger}
                      message={`Remover o link "${v.title}"? O vídeo em si não é apagado.`}
                    >
                      Remover
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nenhum treinamento gravado ainda.</p>
        )}
        {editable && (
          <form action={addTrainingVideo} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectClientId" value={pc} />
            <label className={`${ui.label} min-w-48 flex-1`}>
              Título
              <input
                name="title"
                required
                maxLength={300}
                placeholder="Ex.: Treinamento de Estoque"
                className={ui.input}
              />
            </label>
            <label className={`${ui.label} min-w-48 flex-[2]`}>
              Link do vídeo
              <input
                name="url"
                type="url"
                required
                maxLength={2000}
                placeholder="https://..."
                className={ui.input}
              />
            </label>
            <label className={ui.label}>
              Data
              <input name="recordedOn" type="date" className={ui.input} />
            </label>
            <button className={ui.buttonSecondary}>Adicionar</button>
          </form>
        )}
      </section>

      {editable && (
        <form
          action={activateModule}
          className={`${ui.card} flex flex-wrap items-end gap-3 p-4`}
        >
          <input type="hidden" name="projectClientId" value={pc} />
          <label className={`${ui.label} min-w-48 flex-1`}>
            Ativar módulo do catálogo
            <select name="moduleCatalogId" defaultValue="" className={ui.input}>
              <option value="">— módulo avulso (use o nome ao lado) —</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {usedCatalog.has(c.id) ? " (já ativado)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className={`${ui.label} min-w-48 flex-1`}>
            Nome do módulo avulso
            <input name="name" maxLength={200} className={ui.input} />
          </label>
          <button className={ui.button}>Ativar módulo</button>
        </form>
      )}
    </div>
  );
}

export default function ClientPage({ params }: PageProps<"/c/[pc]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">Carregando…</p>}>
      <ClientDetail params={params} />
    </Suspense>
  );
}
