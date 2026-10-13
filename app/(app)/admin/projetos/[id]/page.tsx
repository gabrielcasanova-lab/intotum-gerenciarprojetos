import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { asc, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  clients,
  moduleCatalog,
  moduleTemplateActivities,
  projectClients,
  projects,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/dal";
import { isUuid } from "@/lib/data/access";
import * as ui from "@/lib/ui/styles";
import { ConfirmButton } from "@/components/confirm-button";
import {
  addClientToProject,
  addModule,
  addTemplateActivity,
  deleteModule,
  deleteTemplateActivity,
  unlinkClient,
  updateClient,
  updateProject,
} from "../actions";

async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const [modules, templates, linked] = await Promise.all([
    db
      .select()
      .from(moduleCatalog)
      .where(eq(moduleCatalog.projectId, id))
      .orderBy(asc(moduleCatalog.position)),
    db
      .select({
        id: moduleTemplateActivities.id,
        moduleCatalogId: moduleTemplateActivities.moduleCatalogId,
        name: moduleTemplateActivities.name,
      })
      .from(moduleTemplateActivities)
      .innerJoin(
        moduleCatalog,
        eq(moduleCatalog.id, moduleTemplateActivities.moduleCatalogId),
      )
      .where(eq(moduleCatalog.projectId, id))
      .orderBy(asc(moduleTemplateActivities.position)),
    db
      .select({
        projectClientId: projectClients.id,
        clientId: clients.id,
        name: clients.name,
        cnpj: clients.cnpj,
        contactName: clients.contactName,
        email: clients.email,
        phone: clients.phone,
      })
      .from(projectClients)
      .innerJoin(clients, eq(clients.id, projectClients.clientId))
      .where(eq(projectClients.projectId, id))
      .orderBy(asc(clients.name)),
  ]);

  const linkedIds = linked.map((c) => c.clientId);
  const otherClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(linkedIds.length ? notInArray(clients.id, linkedIds) : undefined)
    .orderBy(asc(clients.name));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin/projetos" className="text-sm text-blue-700 hover:underline">
          ← Projetos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{project.name}</h1>
      </div>

      {/* Dados do projeto */}
      <form action={updateProject} className={`${ui.card} flex flex-col gap-3 p-4`}>
        <h2 className="font-semibold">Dados do projeto</h2>
        <input type="hidden" name="id" value={project.id} />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className={ui.label}>
            Nome
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={project.name}
              className={ui.input}
            />
          </label>
          <label className={ui.label}>
            Tipo
            <select name="type" defaultValue={project.type} className={ui.input}>
              <option value="sistema">Sistema</option>
              <option value="servico">Serviço</option>
            </select>
          </label>
        </div>
        <label className={ui.label}>
          Descrição
          <textarea
            name="description"
            rows={2}
            defaultValue={project.description ?? ""}
            className={ui.input}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allowSubactivities"
            defaultChecked={project.allowSubactivities}
          />
          Permitir subatividades
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={project.active} />
          Projeto ativo
        </label>
        <div>
          <button className={ui.button}>Salvar</button>
        </div>
      </form>

      {/* Clientes */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Clientes</h2>
        {linked.length > 0 ? (
          <ul className={`${ui.card} divide-y divide-slate-200`}>
            {linked.map((c) => (
              <li key={c.projectClientId} className="px-4 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/c/${c.projectClientId}`} className="hover:underline">
                    {c.name}
                  </Link>
                  <form action={unlinkClient}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input
                      type="hidden"
                      name="projectClientId"
                      value={c.projectClientId}
                    />
                    <ConfirmButton
                      className={ui.buttonDanger}
                      message={`Remover ${c.name} deste projeto? Os módulos e atividades dele neste projeto serão apagados.`}
                    >
                      Remover
                    </ConfirmButton>
                  </form>
                </div>
                <details className="mt-1">
                  <summary className="cursor-pointer text-sm text-blue-700 hover:underline">
                    Editar dados
                  </summary>
                  {/* key: depois de salvar, o formulário volta com os dados novos. */}
                  <form
                    key={[c.name, c.cnpj, c.contactName, c.email, c.phone].join("|")}
                    action={updateClient}
                    className="mt-2 flex flex-col gap-3"
                  >
                    <input type="hidden" name="clientId" value={c.clientId} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["name", "Nome", c.name, 200],
                          ["cnpj", "CNPJ", c.cnpj, 30],
                          ["contactName", "Contato principal", c.contactName, 200],
                          ["email", "E-mail", c.email, 200],
                          ["phone", "Telefone", c.phone, 50],
                        ] as const
                      ).map(([name, label, value, max]) => (
                        <label key={name} className={ui.label}>
                          {label}
                          <input
                            name={name}
                            type={name === "email" ? "email" : "text"}
                            required={name === "name"}
                            maxLength={max}
                            defaultValue={value ?? ""}
                            className={ui.input}
                          />
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      O cadastro é único: a alteração vale em todos os projetos deste cliente.
                    </p>
                    <div>
                      <button className={ui.button}>Salvar dados</button>
                    </div>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">Nenhum cliente neste projeto.</p>
        )}

        <form
          action={addClientToProject}
          className={`${ui.card} flex flex-col gap-3 p-4`}
        >
          <h3 className="font-medium">Adicionar cliente</h3>
          <input type="hidden" name="projectId" value={project.id} />
          {otherClients.length > 0 && (
            <label className={ui.label}>
              Cliente já cadastrado
              <select name="existingClientId" defaultValue="" className={ui.input}>
                <option value="">— Cadastrar um novo (preencha abaixo) —</option>
                {otherClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {otherClients.length === 0 && (
            <input type="hidden" name="existingClientId" value="" />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={ui.label}>
              Nome do novo cliente
              <input name="name" maxLength={200} className={ui.input} />
            </label>
            <label className={ui.label}>
              CNPJ
              <input name="cnpj" maxLength={30} className={ui.input} />
            </label>
            <label className={ui.label}>
              Contato principal
              <input name="contactName" maxLength={200} className={ui.input} />
            </label>
            <label className={ui.label}>
              E-mail
              <input name="email" type="email" maxLength={200} className={ui.input} />
            </label>
            <label className={ui.label}>
              Telefone
              <input name="phone" maxLength={50} className={ui.input} />
            </label>
          </div>
          <div>
            <button className={ui.button}>Adicionar cliente</button>
          </div>
        </form>
      </section>

      {/* Catálogo de módulos */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Módulos e atividades padrão</h2>
          <p className="text-sm text-slate-600">
            Ao ativar um módulo num cliente, as atividades padrão são criadas
            automaticamente.
          </p>
        </div>
        {modules.map((m) => (
          <div key={m.id} className={`${ui.card} flex flex-col gap-2 p-4`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">{m.name}</h3>
              <form action={deleteModule}>
                <input type="hidden" name="moduleId" value={m.id} />
                <ConfirmButton
                  className={ui.buttonDanger}
                  message={`Excluir o módulo ${m.name} do catálogo? Clientes que já usam o módulo não perdem nada.`}
                >
                  Excluir módulo
                </ConfirmButton>
              </form>
            </div>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
              {templates
                .filter((t) => t.moduleCatalogId === m.id)
                .map((t) => (
                  <li key={t.id}>
                    <span className="inline-flex items-center gap-2">
                      {t.name}
                      <form action={deleteTemplateActivity}>
                        <input type="hidden" name="templateId" value={t.id} />
                        <button
                          className="text-xs text-red-700 hover:underline"
                          aria-label={`Excluir ${t.name}`}
                        >
                          excluir
                        </button>
                      </form>
                    </span>
                  </li>
                ))}
            </ol>
            <form action={addTemplateActivity} className="flex gap-2">
              <input type="hidden" name="moduleCatalogId" value={m.id} />
              <input
                name="name"
                required
                maxLength={200}
                placeholder="Nova atividade padrão"
                className={`${ui.input} flex-1`}
              />
              <button className={ui.buttonSecondary}>Adicionar</button>
            </form>
          </div>
        ))}
        <form action={addModule} className="flex gap-2">
          <input type="hidden" name="projectId" value={project.id} />
          <input
            name="name"
            required
            maxLength={2000}
            placeholder="Um ou vários, separados por vírgula (ex.: Estoque, Vendas)"
            className={`${ui.input} flex-1`}
          />
          <button className={ui.button}>Adicionar módulo</button>
        </form>
      </section>
    </div>
  );
}

export default function ProjectPage({ params }: PageProps<"/admin/projetos/[id]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">Carregando…</p>}>
      <ProjectDetail params={params} />
    </Suspense>
  );
}
