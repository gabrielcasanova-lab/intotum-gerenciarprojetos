"use client";

import { useActionState, useState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  // Controlado: o React limpa o formulário após a ação e o e-mail não pode sumir.
  const [email, setEmail] = useState("");

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        E-mail
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base font-normal outline-none focus:border-blue-600"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Senha
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-base font-normal outline-none focus:border-blue-600"
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
