import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <AuthCard title="Intotum Projetos" subtitle="Entre com seu e-mail e senha.">
      <LoginForm />
      <Link
        href="/esqueci-senha"
        className="mt-4 block text-sm text-blue-700 hover:underline"
      >
        Esqueci minha senha
      </Link>
    </AuthCard>
  );
}
