"use server";

import { and, eq, max } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db } from "@/lib/db";
import {
  clients,
  moduleCatalog,
  moduleTemplateActivities,
  projectClients,
  projects,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/dal";
import { logAudit } from "@/lib/audit";
import { splitNames } from "@/lib/names";

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

export async function unlinkClient(formData: FormData) {
  const admin = await requireAdmin();
  const { projectId, projectClientId } = z
    .object({ projectId: id, projectClientId: id })
    .parse(Object.fromEntries(formData));
  // Apaga também os módulos e atividades desse cliente neste projeto (cascata).
  await db
    .delete(projectClients)
    .where(
      and(
        eq(projectClients.id, projectClientId),
        eq(projectClients.projectId, projectId),
      ),
    );
  await logAudit(admin.id, "cliente_projeto", projectClientId, "excluir");
  refresh();
}
