import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { dictionary } from "@/lib/i18n";
import { cookieLanguage } from "@/lib/language";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Esqueci minha senha" };

async function Forgot() {
  const language = await cookieLanguage();
  const t = dictionary(language).auth;
  return (
    <AuthCard title={t.forgot} subtitle={t.forgotSubtitle} language={language}>
      <ForgotForm
        text={{
          done: t.forgotDone,
          email: t.email,
          sending: t.sending,
          sendLink: t.sendLink,
        }}
      />
      <Link href="/login" className="mt-4 block text-sm text-blue-700 hover:underline">
        {t.backToLogin}
      </Link>
    </AuthCard>
  );
}

export default function ForgotPage() {
  return (
    <Suspense fallback={null}>
      <Forgot />
    </Suspense>
  );
}
