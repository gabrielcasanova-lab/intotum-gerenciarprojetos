import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function ForgotPage() {
  return (
    <AuthCard
      title="Esqueci minha senha"
      subtitle="Enviamos um link para o seu e-mail criar uma senha nova."
    >
      <ForgotForm />
      <Link href="/login" className="mt-4 block text-sm text-blue-700 hover:underline">
        ← Voltar para o login
      </Link>
    </AuthCard>
  );
}
