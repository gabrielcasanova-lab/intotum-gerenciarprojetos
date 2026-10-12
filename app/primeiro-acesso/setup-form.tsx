"use client";

import { useActionState, useState } from "react";
import * as ui from "@/lib/ui/styles";
import { createFirstAdmin } from "./actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(createFirstAdmin, undefined);
  // Controlados: o React limpa o formulário após a ação e um erro apagaria tudo.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className={ui.label}>
        Nome
        <input
          name="name"
          required
          maxLength={200}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        Senha
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={ui.input}
        />
      </label>
      <label className={ui.label}>
        Repita a senha
        <input
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className={ui.input}
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={ui.button}>
        {pending ? "Criando…" : "Criar administrador"}
      </button>
    </form>
  );
}
