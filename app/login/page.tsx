import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Intotum Projetos</h1>
        <p className="mb-6 text-sm text-slate-600">
          Entre com seu e-mail e senha.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
