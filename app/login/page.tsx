import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { dictionary } from "@/lib/i18n";
import { cookieLanguage } from "@/lib/language";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

async function Login() {
  const language = await cookieLanguage();
  const t = dictionary(language).auth;
  return (
    <AuthCard title={t.loginTitle} subtitle={t.loginSubtitle} language={language}>
      <LoginForm
        text={{ email: t.email, password: t.password, entering: t.entering, enter: t.enter }}
      />
      <Link
        href="/esqueci-senha"
        className="mt-4 block text-sm text-blue-700 hover:underline"
      >
        {t.forgot}
      </Link>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
