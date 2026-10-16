"use server";

import { and, asc, eq, inArray, max } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db } from "@/lib/db";
import {
  activities,
  attachments,
  clientModules,
  clients,
  moduleCatalog,
  moduleTemplateActivities,
  projectClients,
  projects,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";
import { splitNames } from "@/lib/names";
import { moveInOrder } from "@/lib/order";
import { removeUploads } from "@/lib/uploads";

const text = (max = 200) => z.string().trim().min(1).max(max);
const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const id = z.guid();

export async function createProject(formData: FormData) {
  const admin = await requireAdmin();
  const data = z
    .object({
      name: text(),
      type: z.enum(["sistema", "servico"]),
      description: optionalText(),
    })
    .parse(Object.fromEntries(formData));

  const [project] = await db.insert(projects).values(data).returning();
  await logAudit(admin.id, "projeto", project.id, "criar", data);
  redirect(`/admin/projetos/${project.id}`);
}

export async function updateProject(formData: FormData) {
  const admin = await requireAdmin();
  const data = z
    .object({
      id,
      name: text(),
      type: z.enum(["sistema", "servico"]),
      description: optionalText(),
      allowSubactivities: z.coerce.boolean(),
      active: z.coerce.boolean(),
    })
    .parse({
      ...Object.fromEntries(formData),
      // Checkbox desmarcado não é enviado no formulário.
      allowSubactivities: formData.get("allowSubactivities") === "on",
      active: formData.get("active") === "on",
    });

  const { id: projectId, ...values } = data;
  await db.update(projects).set(values).where(eq(projects.id, projectId));
  await logAudit(admin.id, "projeto", projectId, "alterar", values);
  refresh();
}

async function nextPosition(
  table: typeof moduleCatalog | typeof moduleTemplateActivities,
  where: ReturnType<typeof eq>,
) {
  const [row] = await db
    .select({ value: max(table.position) })
    .from(table)
    .where(where);
  return (row?.value ?? -1) + 1;
}

export async function addModule(formData: FormData) {
  const admin = await requireAdmin();
  const { projectId, name } = z
    .object({ projectId: id, name: text(2000) })
    .parse(Object.fromEntries(formData));

  // Aceita vários de uma vez: "Estoque, Vendas, Fiscal".
  const existing = await db
    .select({ name: moduleCatalog.name })
    .from(moduleCatalog)
    .where(eq(moduleCatalog.projectId, projectId));
  const names = splitNames(
    name,
    existing.map((m) => m.name),
  ).map((n) => text().parse(n));
  if (names.length === 0) return refresh();

  const position = await nextPosition(
    moduleCatalog,
    eq(moduleCatalog.projectId, projectId),
  );
  const mods = await db
    .insert(moduleCatalog)
    .values(
      names.map((n, i) => ({ projectId, name: n, position: position + i })),
    )
    .returning();
  for (const mod of mods) {
    await logAudit(admin.id, "modulo_catalogo", mod.id, "criar", {
      name: mod.name,
    });
  }
  refresh();
}

/**
 * Copia o catálogo de outro projeto (módulos e atividades padrão). Módulos com
 * o mesmo nome que já existem aqui ficam como estão.
 */
export async function copyModulesFrom(formData: FormData) {
  const admin = await requireAdmin();
  const { projectId, sourceProjectId } = z
    .object({ projectId: id, sourceProjectId: id })
    .parse(Object.fromEntries(formData));
  if (projectId === sourceProjectId) return refresh();

  const [source, existing] = await Promise.all([
    db
      .select()
      .from(moduleCatalog)
      .where(eq(moduleCatalog.projectId, sourceProjectId))
      .orderBy(asc(moduleCatalog.position)),
    db
      .select({ name: moduleCatalog.name })
      .from(moduleCatalog)
      .where(eq(moduleCatalog.projectId, projectId)),
  ]);
  // Mesma regra do cadastro: ignora nomes repetidos ou já existentes aqui.
  const names = new Set(
    splitNames(
      source.map((m) => m.name).join("\n"),
      existing.map((m) => m.name),
    ),
  );
  const toCopy = source.filter((m) =>
    names.delete(m.name.trim().replace(/\s+/g, " ")),
  );
  if (toCopy.length === 0) return refresh();

  const templates = await db
    .select()
    .from(moduleTemplateActivities)
    .where(
      inArray(
        moduleTemplateActivities.moduleCatalogId,
        toCopy.map((m) => m.id),
      ),
    )
    .orderBy(asc(moduleTemplateActivities.position));
  const first = await nextPosition(
    moduleCatalog,
    eq(moduleCatalog.projectId, projectId),
  );

  await db.transaction(async (tx) => {
    for (const [i, m] of toCopy.entries()) {
      const [mod] = await tx
        .insert(moduleCatalog)
        .values({ projectId, name: m.name, position: first + i })
        .returning({ id: moduleCatalog.id });
      const list = templates.filter((t) => t.moduleCatalogId === m.id);
      if (list.length) {
        await tx.insert(moduleTemplateActivities).values(
          list.map((t) => ({
            moduleCatalogId: mod.id,
            name: t.name,
            description: t.description,
            position: t.position,
          })),
        );
      }
    }
  });
  await logAudit(admin.id, "projeto", projectId, "alterar", {
    copiouModulosDe: sourceProjectId,
    modulos: toCopy.map((m) => m.name),
  });
  refresh();
}

/**
 * Renomeia um módulo do catálogo. Nos clientes que ativaram o módulo e ainda
 * usam o nome antigo, o nome muda junto (atividades e andamento ficam iguais).
 */
export async function renameModule(formData: FormData) {
  const admin = await requireAdmin();
  const { moduleId, name } = z
    .object({ moduleId: id, name: text() })
    .parse(Object.fromEntries(formData));
  const newName = name.replace(/\s+/g, " ");

  const [mod] = await db
    .select()
    .from(moduleCatalog)
    .where(eq(moduleCatalog.id, moduleId));
  if (!mod) throw new Error("Módulo não encontrado.");
  if (mod.name === newName) return refresh();

  await db.transaction(async (tx) => {
    await tx
      .update(moduleCatalog)
      .set({ name: newName })
      .where(eq(moduleCatalog.id, moduleId));
    await tx
      .update(clientModules)
      .set({ name: newName })
      .where(
        and(
          eq(clientModules.moduleCatalogId, moduleId),
          eq(clientModules.name, mod.name),
        ),
      );
  });
  await logAudit(admin.id, "modulo_catalogo", moduleId, "alterar", {
    de: mod.name,
    para: newName,
  });
  refresh();
}

/** Sobe ou desce um módulo uma posição no catálogo. */
export async function moveModule(formData: FormData) {
  const admin = await requireAdmin();
  const { moduleId, direction } = z
    .object({ moduleId: id, direction: z.enum(["up", "down"]) })
    .parse(Object.fromEntries(formData));

  const [mod] = await db
    .select({ projectId: moduleCatalog.projectId })
    .from(moduleCatalog)
    .where(eq(moduleCatalog.id, moduleId));
  if (!mod) throw new Error("Módulo não encontrado.");
  const list = await db
    .select({ id: moduleCatalog.id })
    .from(moduleCatalog)
    .where(eq(moduleCatalog.projectId, mod.projectId))
    .orderBy(asc(moduleCatalog.position), asc(moduleCatalog.name));
  const order = moveInOrder(
    list.map((m) => m.id),
    moduleId,
    direction === "up" ? -1 : 1,
  );
  if (!order) return refresh();

  // Renumera tudo (0, 1, 2...) para não sobrar posição repetida.
  await db.transaction(async (tx) => {
    for (const [position, mid] of order.entries()) {
      await tx
        .update(moduleCatalog)
        .set({ position })
        .where(eq(moduleCatalog.id, mid));
    }
  });
  await logAudit(admin.id, "modulo_catalogo", moduleId, "alterar", {
    mover: direction,
  });
  refresh();
}

export async function deleteModule(formData: FormData) {
  const admin = await requireAdmin();
  const moduleId = id.parse(formData.get("moduleId"));
  // Módulos já ativados nos clientes continuam; só perdem o vínculo com o catálogo.
  await db.delete(moduleCatalog).where(eq(moduleCatalog.id, moduleId));
  await logAudit(admin.id, "modulo_catalogo", moduleId, "excluir");
  refresh();
}

export async function addTemplateActivity(formData: FormData) {
  const admin = await requireAdmin();
  const { moduleCatalogId, name } = z
    .object({ moduleCatalogId: id, name: text() })
    .parse(Object.fromEntries(formData));

  const position = await nextPosition(
    moduleTemplateActivities,
    eq(moduleTemplateActivities.moduleCatalogId, moduleCatalogId),
  );
  const [row] = await db
    .insert(moduleTemplateActivities)
    .values({ moduleCatalogId, name, position })
    .returning();
  await logAudit(admin.id, "atividade_modelo", row.id, "criar", { name });
  refresh();
}

/**
 * Renomeia uma atividade padrão. Nos clientes que ativaram o módulo, as
 * atividades criadas a partir dela que ainda têm o nome antigo mudam junto.
 */
export async function renameTemplateActivity(formData: FormData) {
  const admin = await requireAdmin();
  const { templateId, name } = z
    .object({ templateId: id, name: text() })
    .parse(Object.fromEntries(formData));
  const newName = name.replace(/\s+/g, " ");

  const [tpl] = await db
    .select()
    .from(moduleTemplateActivities)
    .where(eq(moduleTemplateActivities.id, templateId));
  if (!tpl) throw new Error("Atividade padrão não encontrada.");
  if (tpl.name === newName) return refresh();

  await db.transaction(async (tx) => {
    await tx
      .update(moduleTemplateActivities)
      .set({ name: newName })
      .where(eq(moduleTemplateActivities.id, templateId));
    const linked = tx
      .select({ id: clientModules.id })
      .from(clientModules)
      .where(eq(clientModules.moduleCatalogId, tpl.moduleCatalogId));
    await tx
      .update(activities)
      .set({ name: newName })
      .where(
        and(
          inArray(activities.clientModuleId, linked),
          eq(activities.name, tpl.name),
        ),
      );
  });
  await logAudit(admin.id, "atividade_modelo", templateId, "alterar", {
    de: tpl.name,
    para: newName,
  });
  refresh();
}

export async function deleteTemplateActivity(formData: FormData) {
  const admin = await requireAdmin();
  const templateId = id.parse(formData.get("templateId"));
  await db
    .delete(moduleTemplateActivities)
    .where(eq(moduleTemplateActivities.id, templateId));
  await logAudit(admin.id, "atividade_modelo", templateId, "excluir");
  refresh();
}

/** Liga um cliente ao projeto: um já cadastrado ou um novo. */
export async function addClientToProject(formData: FormData) {
  const admin = await requireAdmin();
  const data = z
    .object({
      projectId: id,
      existingClientId: z.union([id, z.literal("")]),
      name: optionalText(200),
      cnpj: optionalText(30),
      contactName: optionalText(200),
      email: optionalText(200),
      phone: optionalText(50),
    })
    .parse(Object.fromEntries(formData));

  let clientId = data.existingClientId;
  if (!clientId) {
    if (!data.name) throw new Error("Informe o nome do cliente.");
    const [client] = await db
      .insert(clients)
      .values({
        name: data.name,
        cnpj: data.cnpj,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
      })
      .returning();
    clientId = client.id;
    await logAudit(admin.id, "cliente", clientId, "criar", { name: data.name });
  }

  const [link] = await db
    .insert(projectClients)
    .values({ projectId: data.projectId, clientId })
    .onConflictDoNothing()
    .returning();
  if (link) {
    await logAudit(admin.id, "cliente_projeto", link.id, "criar", {
      projectId: data.projectId,
      clientId,
    });
  }
  refresh();
}

export async function updateClient(formData: FormData) {
  const admin = await requireAdmin();
  const { clientId, ...values } = z
    .object({
      clientId: id,
      name: text(),
      cnpj: optionalText(30),
      contactName: optionalText(200),
      email: optionalText(200),
      phone: optionalText(50),
    })
    .parse(Object.fromEntries(formData));

  await db.update(clients).set(values).where(eq(clients.id, clientId));
  await logAudit(admin.id, "cliente", clientId, "alterar", values);
  refresh();
}

export async function unlinkClient(formData: FormData) {
  const admin = await requireAdmin();
  const { projectId, projectClientId } = z
    .object({ projectId: id, projectClientId: id })
    .parse(Object.fromEntries(formData));
  const files = await db
    .select({ storagePath: attachments.storagePath })
    .from(attachments)
    .innerJoin(activities, eq(activities.id, attachments.activityId))
    .innerJoin(clientModules, eq(clientModules.id, activities.clientModuleId))
    .innerJoin(projectClients, eq(projectClients.id, clientModules.projectClientId))
    .where(
      and(
        eq(projectClients.id, projectClientId),
        eq(projectClients.projectId, projectId),
      ),
    );
  // Apaga também os módulos e atividades desse cliente neste projeto (cascata).
  await db
    .delete(projectClients)
    .where(
      and(
        eq(projectClients.id, projectClientId),
        eq(projectClients.projectId, projectId),
      ),
    );
  await removeUploads(files.map((f) => f.storagePath));
  await logAudit(admin.id, "cliente_projeto", projectClientId, "excluir");
  refresh();
}
