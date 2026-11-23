import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { findUserByLink } from "@/lib/auth/tokens";
import { AuthCard } from "@/components/auth-card";
import { PasswordForm } from "../password-form";
import { dictionary } from "@/lib/i18n";
import { cookieLanguage } from "@/lib/language";

export const metadata: Metadata = { title: "Criar senha" };

async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await findUserByLink(token);
  // O idioma é o do usuário convidado; sem link válido, o do navegador.
  const language = link?.language ?? (await cookieLanguage());
  const t = dictionary(language).auth;

  if (!link) {
    return (
      <AuthCard title={t.invalidLinkTitle} language={language}>
        <p className="text-sm text-slate-600">
          {t.invalidLinkBefore}{" "}
          <Link href="/esqueci-senha" className="text-blue-700 hover:underline">
            {t.forgot}
          </Link>
          .
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={link.purpose === "convite" ? t.welcome(link.name) : t.newPasswordTitle}
      subtitle={t.createPasswordOf(link.email)}
    >
      <PasswordForm
        token={token}
        text={{
          newPassword: t.newPassword,
          repeatPassword: t.repeatPassword,
          saving: t.saving,
          savePassword: t.savePassword,
        }}
      />
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
