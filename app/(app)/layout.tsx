import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { logout } from "@/app/login/actions";

const roleLabel = { admin: "Administrador", equipe: "Equipe", cliente: "Cliente" };

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
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <span className="font-semibold">Intotum Projetos</span>
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
