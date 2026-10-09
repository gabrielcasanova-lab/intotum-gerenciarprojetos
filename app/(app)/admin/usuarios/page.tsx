import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/dal";
import { roleLabel } from "@/lib/labels";
import * as ui from "@/lib/ui/styles";
import { CreateUserForm } from "./forms";

export const metadata: Metadata = { title: "Usuários" };

async function UserList() {
  await requireAdmin();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
    })
    .from(users)
    .orderBy(asc(users.name));

  return (
    <ul className={`${ui.card} divide-y divide-slate-200`}>
      {rows.map((u) => (
        <li key={u.id}>
          <Link
            href={`/admin/usuarios/${u.id}`}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
          >
            <span>
              {u.name}
              <span className="ml-2 text-sm text-slate-500">{u.email}</span>
            </span>
            <span className="text-xs text-slate-500">
              {roleLabel[u.role]}
              {!u.active && " · desativado"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Usuários</h1>
      <Suspense fallback={<p className="text-slate-500">Carregando…</p>}>
        <UserList />
      </Suspense>
      <CreateUserForm />
    </div>
  );
}
