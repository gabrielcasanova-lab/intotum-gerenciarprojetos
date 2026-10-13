import type { ReactNode } from "react";

/** Cartão centralizado das telas fora do sistema (login, convite, senha). */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mb-6 text-sm text-slate-600">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
