"use client";

import { useActionState, useState } from "react";
import * as ui from "@/lib/ui/styles";
import { createUser, resetPassword, sendLink } from "./actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
  // Controlados: o React limpa o formulário após a ação e um erro apagaria tudo.
  const [fields, setFields] = useState({ name: "", email: "", role: "equipe" });
  const bind = (key: keyof typeof fields) => ({
    name: key,
    value: fields[key],
    onChange: (e: { target: { value: string } }) =>
      setFields((f) => ({ ...f, [key]: e.target.value })),
  });
  return (
    <form action={action} className={`${ui.card} flex flex-col gap-3 p-4`}>
      <h2 className="font-semibold">Novo usuário</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={ui.label}>
          Nome
          <input {...bind("name")} required maxLength={200} className={ui.input} />
        </label>
        <label className={ui.label}>
          E-mail
          <input {...bind("email")} type="email" required className={ui.input} />
        </label>
        <label className={ui.label}>
          Perfil
          <select {...bind("role")} className={ui.input}>
            <option value="equipe">Equipe</option>
            <option value="cliente">Cliente</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <label className={ui.label}>
          Senha provisória (opcional)
          <input
            name="password"
            type="text"
            minLength={8}
            autoComplete="off"
            className={ui.input}
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Deixe a senha em branco para enviar um convite por e-mail: a pessoa cria
        a própria senha pelo link.
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div>
        <button disabled={pending} className={ui.button}>
          {pending ? "Criando…" : "Criar usuário"}
        </button>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className={ui.label}>
        Nova senha provisória
        <input
          name="password"
          type="text"
          required
          minLength={8}
          autoComplete="off"
          className={ui.input}
        />
      </label>
      <button disabled={pending} className={ui.buttonSecondary}>
        Redefinir senha
      </button>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-green-700">
          Senha redefinida. As sessões abertas dessa pessoa foram encerradas.
        </p>
      )}
    </form>
  );
}

export function SendLinkForm({
  userId,
  hasPassword,
}: {
  userId: string;
  hasPassword: boolean;
}) {
  const [state, action, pending] = useActionState(sendLink, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <div>
        <button disabled={pending} className={ui.buttonSecondary}>
          {hasPassword ? "Enviar link para nova senha" : "Reenviar convite"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.sent && (
        <p role="status" className="text-sm text-green-700">
          E-mail enviado.
        </p>
      )}
      {state?.link && (
        <div role="status" className="flex flex-col gap-1 text-sm">
          <span className="text-amber-800">
            O e-mail não foi enviado. Copie o link e mande para a pessoa:
          </span>
          <input
            readOnly
            value={state.link}
            aria-label="Link para criar senha"
            onFocus={(e) => e.currentTarget.select()}
            className={`${ui.input} font-mono text-xs`}
          />
        </div>
      )}
    </form>
  );
}
