import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { logout } from "@/app/login/actions";

import { roleLabel } from "@/lib/labels";

const navLink = "rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100";

async function Nav() {
  const user = await getCurrentUser();
  if (user.role !== "admin") return null;
  return (
    <nav className="flex items-center gap-1">
      <Link href="/" className={navLink}>
        Clientes
      </Link>
      <Link href="/admin/projetos" className={navLink}>
        Projetos
      </Link>
      <Link href="/admin/usuarios" className={navLink}>
        Usuários
      </Link>
    </nav>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-slate-600">
        {user.name} · {roleLabel[user.role]}
      </span>
      <form action={logout}>
        <button className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100">
          Sair
        </button>
      </form>
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <header className="flex flex-wrap items-center gap-2 justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="font-semibold">
            Intotum Projetos
          </Link>
          <Suspense fallback={null}>
            <Nav />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
