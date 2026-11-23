import type { ReactNode } from "react";
import type { Language } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/language-switch";

/** Cartão centralizado das telas fora do sistema (login, convite, senha). */
export function AuthCard({
  title,
  subtitle,
  children,
  language,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Mostra a troca de idioma (Português | Español) no canto do cartão. */
  language?: Language;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        {language && (
          <div className="-mt-4 mb-2 flex justify-end">
            <LanguageSwitch current={language} />
          </div>
        )}
        <h1 className="mb-1 text-xl font-semibold">{title}</h1>
        {subtitle && <p className="mb-6 text-sm text-slate-600">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
