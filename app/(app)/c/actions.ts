"use server";

import { and, asc, eq, max } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db } from "@/lib/db";
import {
  activities,
  auditLog,
  clientModules,
  comments,
  moduleCatalog,
  moduleTemplateActivities,
} from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { getClientAccess } from "@/lib/data/access";
import { logAudit } from "@/lib/audit";
import { PRIORITIES, STATUSES } from "@/lib/labels";

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
      if (templates.length) {
        await tx.insert(activities).values(
          templates.map((t, i) => ({
            clientModuleId: cm.id,
            name: t.name,
            description: t.description,
            position: i,
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
  await db
    .delete(clientModules)
    .where(
      and(
        eq(clientModules.id, clientModuleId),
        eq(clientModules.projectClientId, projectClientId),
      ),
    );
  await logAudit(user.id, "modulo_cliente", clientModuleId, "excluir");
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

  await db
    .update(activities)
    .set({
      status: data.status,
      completedAt: data.status === "concluido" ? new Date() : null,
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
    })
    .parse(Object.fromEntries(formData));
  const { user } = await requireEdit(data.projectClientId);
  await findActivity(data.projectClientId, data.activityId);

  const { projectClientId, activityId, ...values } = data;
  const [current] = await db
    .select({ status: activities.status, completedAt: activities.completedAt })
    .from(activities)
    .where(eq(activities.id, activityId));

  await db
    .update(activities)
    .set({
      ...values,
      // Data de conclusão automática ao marcar Concluído (mantém a original se já estava).
      completedAt:
        values.status === "concluido"
          ? current.status === "concluido"
            ? current.completedAt
            : new Date()
          : null,
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
  await db.delete(activities).where(eq(activities.id, activityId));
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
