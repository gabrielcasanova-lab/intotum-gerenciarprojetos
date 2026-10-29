"use server";

import { and, asc, eq, inArray, max } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db } from "@/lib/db";
import {
  activities,
  attachments,
  auditLog,
  clientModules,
  comments,
  moduleCatalog,
  moduleTemplateActivities,
  projectClients,
  trainingVideos,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getClientAccess } from "@/lib/data/access";
import { logAudit } from "@/lib/audit";
import { IMPLEMENTATION_STATUSES, PRIORITIES, STATUSES } from "@/lib/labels";
import { moveInOrder } from "@/lib/order";
import { copyTree } from "@/lib/tree";
import { statusDates, todayInBrazil } from "@/lib/progress";
import { MAX_UPLOAD_BYTES, removeUploads, saveUpload } from "@/lib/uploads";

const id = z.guid();
const optionalText = (max = 5000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const optionalDate = z
  .union([z.iso.date(), z.literal("")])
  .transform((v) => v || null);

/** Confere que o usuário pode editar este cliente; devolve o acesso. */
async function requireEdit(projectClientId: string) {
  const user = await getCurrentUser();
  const access = await getClientAccess(user, projectClientId);
  if (access?.level !== "editar") throw new Error("Sem permissão para editar.");
  return { user, access };
}

/** Atividade que pertence de fato a este cliente (evita mexer em outra via id forjado). */
async function findActivity(projectClientId: string, activityId: string) {
  const [row] = await db
    .select({ id: activities.id, clientModuleId: activities.clientModuleId })
    .from(activities)
    .innerJoin(clientModules, eq(clientModules.id, activities.clientModuleId))
    .where(
      and(
        eq(activities.id, activityId),
        eq(clientModules.projectClientId, projectClientId),
      ),
    );
  if (!row) throw new Error("Atividade não encontrada.");
  return row;
}

/** Registro de quando foi concluída (mantém o original se já estava concluída). */
function completedAtFor(
  status: string,
  current: { status: string; completedAt: Date | null },
  now: Date,
) {
  if (status !== "concluido") return null;
  return current.status === "concluido" ? current.completedAt : now;
}

async function nextActivityPosition(clientModuleId: string) {
  const [row] = await db
    .select({ value: max(activities.position) })
    .from(activities)
    .where(eq(activities.clientModuleId, clientModuleId));
  return (row?.value ?? -1) + 1;
}

/** Ativa um módulo no cliente: do catálogo (copiando as atividades padrão) ou avulso. */
export async function activateModule(formData: FormData) {
  const data = z
    .object({
      projectClientId: id,
      moduleCatalogId: z.union([id, z.literal("")]),
      name: optionalText(200),
    })
    .parse(Object.fromEntries(formData));
  const { user, access } = await requireEdit(data.projectClientId);

  let name = data.name;
  let catalogId: string | null = null;
  if (data.moduleCatalogId) {
    const [mod] = await db
      .select()
      .from(moduleCatalog)
      .where(
        and(
          eq(moduleCatalog.id, data.moduleCatalogId),
          eq(moduleCatalog.projectId, access.projectId),
        ),
      );
    if (!mod) throw new Error("Módulo não encontrado neste projeto.");
    name = mod.name;
    catalogId = mod.id;
  }
  if (!name) throw new Error("Escolha um módulo do catálogo ou informe um nome.");

  const [{ value: lastPos } = { value: null }] = await db
    .select({ value: max(clientModules.position) })
    .from(clientModules)
    .where(eq(clientModules.projectClientId, data.projectClientId));

  await db.transaction(async (tx) => {
    const [cm] = await tx
      .insert(clientModules)
      .values({
        projectClientId: data.projectClientId,
        moduleCatalogId: catalogId,
        name,
        position: (lastPos ?? -1) + 1,
      })
      .returning();

    if (catalogId) {
      const templates = await tx
        .select()
        .from(moduleTemplateActivities)
        .where(eq(moduleTemplateActivities.moduleCatalogId, catalogId))
        .orderBy(asc(moduleTemplateActivities.position));
      // Subatividades padrão viram subatividades do cliente (pais gravados antes).
      const position = new Map(templates.map((t, i) => [t.id, i]));
      const { parents, children } = copyTree(templates, () => crypto.randomUUID());
      for (const group of [parents, children]) {
        if (group.length === 0) continue;
        await tx.insert(activities).values(
          group.map((r) => ({
            id: r.id,
            clientModuleId: cm.id,
            parentId: r.parentId,
            name: r.item.name,
            description: r.item.description,
            position: position.get(r.item.id)!,
          })),
        );
      }
    }
    await tx.insert(auditLog).values({
      userId: user.id,
      entity: "modulo_cliente",
      entityId: cm.id,
      action: "criar",
      changes: { name },
    });
  });
  refresh();
}

export async function removeClientModule(formData: FormData) {
  const { projectClientId, clientModuleId } = z
    .object({ projectClientId: id, clientModuleId: id })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(projectClientId);
  const files = await db
    .select({ storagePath: attachments.storagePath })
    .from(attachments)
    .innerJoin(activities, eq(activities.id, attachments.activityId))
    .innerJoin(clientModules, eq(clientModules.id, activities.clientModuleId))
    .where(
      and(
        eq(clientModules.id, clientModuleId),
        eq(clientModules.projectClientId, projectClientId),
      ),
    );
  await db
    .delete(clientModules)
    .where(
      and(
        eq(clientModules.id, clientModuleId),
        eq(clientModules.projectClientId, projectClientId),
      ),
    );
  await removeUploads(files.map((f) => f.storagePath));
  await logAudit(user.id, "modulo_cliente", clientModuleId, "excluir");
  refresh();
}

/** Muda o nome do módulo só neste cliente (atividades continuam). */
export async function renameClientModule(formData: FormData) {
  const { projectClientId, clientModuleId, name } = z
    .object({
      projectClientId: id,
      clientModuleId: id,
      name: z.string().trim().min(1).max(200),
    })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(projectClientId);
  const newName = name.replace(/\s+/g, " ");
  await db
    .update(clientModules)
    .set({ name: newName })
    .where(
      and(
        eq(clientModules.id, clientModuleId),
        eq(clientModules.projectClientId, projectClientId),
      ),
    );
  await logAudit(user.id, "modulo_cliente", clientModuleId, "alterar", {
    name: newName,
  });
  refresh();
}

/** Sobe ou desce o módulo uma posição na tela do cliente (e no PDF). */
export async function moveClientModule(formData: FormData) {
  const { projectClientId, clientModuleId, direction } = z
    .object({
      projectClientId: id,
      clientModuleId: id,
      direction: z.enum(["up", "down"]),
    })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(projectClientId);

  const list = await db
    .select({ id: clientModules.id })
    .from(clientModules)
    .where(eq(clientModules.projectClientId, projectClientId))
    .orderBy(asc(clientModules.position), asc(clientModules.name));
  const order = moveInOrder(
    list.map((m) => m.id),
    clientModuleId,
    direction === "up" ? -1 : 1,
  );
  if (!order) return refresh();

  await db.transaction(async (tx) => {
    for (const [position, mid] of order.entries()) {
      await tx
        .update(clientModules)
        .set({ position })
        .where(eq(clientModules.id, mid));
    }
  });
  await logAudit(user.id, "modulo_cliente", clientModuleId, "alterar", {
    mover: direction,
  });
  refresh();
}

/** Situação da implantação deste cliente no projeto. */
export async function updateImplementationStatus(formData: FormData) {
  const { projectClientId, status } = z
    .object({ projectClientId: id, status: z.enum(IMPLEMENTATION_STATUSES) })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(projectClientId);
  await db
    .update(projectClients)
    .set({ status })
    .where(eq(projectClients.id, projectClientId));
  await logAudit(user.id, "cliente_projeto", projectClientId, "alterar", {
    status,
  });
  refresh();
}

export async function addActivity(formData: FormData) {
  const data = z
    .object({
      projectClientId: id,
      clientModuleId: id,
      parentId: z.union([id, z.literal("")]).transform((v) => v || null),
      name: z.string().trim().min(1).max(300),
    })
    .parse(Object.fromEntries(formData));
  const { user, access } = await requireEdit(data.projectClientId);

  // O módulo precisa ser deste cliente.
  const [cm] = await db
    .select({ id: clientModules.id })
    .from(clientModules)
    .where(
      and(
        eq(clientModules.id, data.clientModuleId),
        eq(clientModules.projectClientId, data.projectClientId),
      ),
    );
  if (!cm) throw new Error("Módulo não encontrado.");

  if (data.parentId) {
    if (!access.allowSubactivities) {
      throw new Error("Este projeto não permite subatividades.");
    }
    const parent = await findActivity(data.projectClientId, data.parentId);
    if (parent.clientModuleId !== data.clientModuleId) {
      throw new Error("A atividade-pai é de outro módulo.");
    }
  }

  const [row] = await db
    .insert(activities)
    .values({
      clientModuleId: data.clientModuleId,
      parentId: data.parentId,
      name: data.name,
      position: await nextActivityPosition(data.clientModuleId),
    })
    .returning({ id: activities.id });
  await logAudit(user.id, "atividade", row.id, "criar", { name: data.name });
  refresh();
}

export async function updateStatus(formData: FormData) {
  const data = z
    .object({ projectClientId: id, activityId: id, status: z.enum(STATUSES) })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(data.projectClientId);
  await findActivity(data.projectClientId, data.activityId);
  const [current] = await db
    .select({
      status: activities.status,
      completedAt: activities.completedAt,
      startDate: activities.startDate,
      completedOn: activities.completedOn,
    })
    .from(activities)
    .where(eq(activities.id, data.activityId));

  const now = new Date();
  await db
    .update(activities)
    .set({
      status: data.status,
      ...statusDates(data.status, current, todayInBrazil(now)),
      completedAt: completedAtFor(data.status, current, now),
    })
    .where(eq(activities.id, data.activityId));
  await logAudit(user.id, "atividade", data.activityId, "alterar", {
    status: data.status,
  });
  refresh();
}

export async function updateActivity(formData: FormData) {
  const data = z
    .object({
      projectClientId: id,
      activityId: id,
      name: z.string().trim().min(1).max(300),
      description: optionalText(),
      status: z.enum(STATUSES),
      priority: z.enum(PRIORITIES),
      assigneeUserId: z.union([id, z.literal("")]).transform((v) => v || null),
      clientContact: optionalText(200),
      startDate: optionalDate,
      dueDate: optionalDate,
      completedOn: optionalDate,
    })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(data.projectClientId);
  await findActivity(data.projectClientId, data.activityId);

  const { projectClientId, activityId, ...values } = data;
  const [current] = await db
    .select({ status: activities.status, completedAt: activities.completedAt })
    .from(activities)
    .where(eq(activities.id, activityId));

  const now = new Date();
  await db
    .update(activities)
    .set({
      ...values,
      // Início e Conclusão vazios são preenchidos com hoje conforme o status.
      ...statusDates(values.status, values, todayInBrazil(now)),
      completedAt: completedAtFor(values.status, current, now),
    })
    .where(eq(activities.id, activityId));
  await logAudit(user.id, "atividade", activityId, "alterar", values);
  refresh();
  redirect(`/c/${projectClientId}/a/${activityId}`);
}

export async function deleteActivity(formData: FormData) {
  const { projectClientId, activityId } = z
    .object({ projectClientId: id, activityId: id })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(projectClientId);
  await findActivity(projectClientId, activityId);
  // Anexos da atividade e das subatividades.
  const subs = await db
    .select({ id: activities.id })
    .from(activities)
    .where(eq(activities.parentId, activityId));
  const files = await db
    .select({ storagePath: attachments.storagePath })
    .from(attachments)
    .where(inArray(attachments.activityId, [activityId, ...subs.map((a) => a.id)]));
  await db.delete(activities).where(eq(activities.id, activityId));
  await removeUploads(files.map((f) => f.storagePath));
  await logAudit(user.id, "atividade", activityId, "excluir");
  redirect(`/c/${projectClientId}`);
}

export async function addComment(formData: FormData) {
  const data = z
    .object({
      projectClientId: id,
      activityId: id,
      visibility: z.enum(["interno", "cliente"]),
      body: z.string().trim().min(1).max(5000),
    })
    .parse(Object.fromEntries(formData));

  // Só quem edita comenta (cliente e visualização apenas leem).
  const { user } = await requireEdit(data.projectClientId);
  await findActivity(data.projectClientId, data.activityId);

  const [row] = await db
    .insert(comments)
    .values({
      activityId: data.activityId,
      authorUserId: user.id,
      visibility: data.visibility,
      body: data.body,
    })
    .returning({ id: comments.id });
  await logAudit(user.id, "comentario", row.id, "criar", {
    visibility: data.visibility,
  });
  refresh();
}

/** Link de vídeo de treinamento: só http(s), para o link nunca executar nada no navegador. */
const videoUrl = z
  .string()
  .trim()
  .max(2000)
  .pipe(z.url({ protocol: /^https?$/, error: "Informe um link começando com https://" }));

export async function addTrainingVideo(formData: FormData) {
  const data = z
    .object({
      projectClientId: id,
      title: z.string().trim().min(1).max(300),
      url: videoUrl,
      recordedOn: optionalDate,
    })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(data.projectClientId);
  const [row] = await db
    .insert(trainingVideos)
    .values({ ...data, createdBy: user.id })
    .returning({ id: trainingVideos.id });
  await logAudit(user.id, "treinamento", row.id, "criar", {
    title: data.title,
    url: data.url,
  });
  refresh();
}

export async function deleteTrainingVideo(formData: FormData) {
  const { projectClientId, videoId } = z
    .object({ projectClientId: id, videoId: id })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(projectClientId);
  await db
    .delete(trainingVideos)
    .where(
      and(
        eq(trainingVideos.id, videoId),
        eq(trainingVideos.projectClientId, projectClientId),
      ),
    );
  await logAudit(user.id, "treinamento", videoId, "excluir");
  refresh();
}

export async function uploadAttachment(formData: FormData) {
  const data = z
    .object({
      projectClientId: id,
      activityId: id,
      visibility: z.enum(["interno", "cliente"]),
    })
    .parse(Object.fromEntries(formData));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Escolha um arquivo.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Arquivo maior que 20 MB.");
  }
  const { user } = await requireEdit(data.projectClientId);
  await findActivity(data.projectClientId, data.activityId);

  const fileName = file.name.trim().slice(0, 255) || "arquivo";
  const storagePath = await saveUpload(file);
  const [row] = await db
    .insert(attachments)
    .values({
      activityId: data.activityId,
      uploadedBy: user.id,
      fileName,
      storagePath,
      visibility: data.visibility,
      mimeType: file.type || null,
      sizeBytes: file.size,
    })
    .returning({ id: attachments.id });
  await logAudit(user.id, "anexo", row.id, "criar", {
    fileName,
    visibility: data.visibility,
  });
  refresh();
}

export async function deleteAttachment(formData: FormData) {
  const { projectClientId, activityId, attachmentId } = z
    .object({ projectClientId: id, activityId: id, attachmentId: id })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(projectClientId);
  await findActivity(projectClientId, activityId);
  const [row] = await db
    .delete(attachments)
    .where(
      and(
        eq(attachments.id, attachmentId),
        eq(attachments.activityId, activityId),
      ),
    )
    .returning({ storagePath: attachments.storagePath });
  if (row) await removeUploads([row.storagePath]);
  await logAudit(user.id, "anexo", attachmentId, "excluir");
  refresh();
}
