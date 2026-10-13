import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { findUserByLink } from "@/lib/auth/tokens";
import { AuthCard } from "@/components/auth-card";
import { PasswordForm } from "../password-form";

export const metadata: Metadata = { title: "Criar senha" };

async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await findUserByLink(token);

  if (!link) {
    return (
      <AuthCard title="Link inválido">
        <p className="text-sm text-slate-600">
          Este link expirou ou já foi usado. Peça um novo ao administrador ou use{" "}
          <Link href="/esqueci-senha" className="text-blue-700 hover:underline">
            Esqueci minha senha
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={link.purpose === "convite" ? `Bem-vindo, ${link.name}` : "Nova senha"}
      subtitle={`Crie a senha de ${link.email}.`}
    >
      <PasswordForm token={token} />
    </AuthCard>
  );
}

export default function InvitePage({ params }: PageProps<"/convite/[token]">) {
  return (
    <Suspense fallback={null}>
      <Invite params={params} />
    </Suspense>
  );
}
