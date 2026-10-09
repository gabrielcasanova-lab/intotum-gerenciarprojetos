"use client";

import { useActionState } from "react";
import * as ui from "@/lib/ui/styles";
import { createUser, resetPassword } from "./actions";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
  return (
    <form action={action} className={`${ui.card} flex flex-col gap-3 p-4`}>
      <h2 className="font-semibold">Novo usuário</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={ui.label}>
          Nome
          <input name="name" required maxLength={200} className={ui.input} />
        </label>
        <label className={ui.label}>
          E-mail
          <input name="email" type="email" required className={ui.input} />
        </label>
        <label className={ui.label}>
          Perfil
          <select name="role" defaultValue="equipe" className={ui.input}>
            <option value="equipe">Equipe</option>
            <option value="cliente">Cliente</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <label className={ui.label}>
          Senha provisória
          <input
            name="password"
            type="text"
            required
            minLength={8}
            autoComplete="off"
            className={ui.input}
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Passe a senha provisória para a pessoa. O convite por e-mail vem numa
        próxima etapa.
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
