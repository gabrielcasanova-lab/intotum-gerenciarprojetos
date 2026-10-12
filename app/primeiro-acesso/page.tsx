import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { count } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AuthCard } from "@/components/auth-card";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Primeiro acesso" };

async function Setup() {
  await connection();
  const [{ value }] = await db.select({ value: count() }).from(users);
  // Depois que existe qualquer usuário, esta tela deixa de existir.
  if (value > 0) redirect("/login");
  return (
    <AuthCard
      title="Primeiro acesso"
      subtitle="Crie o administrador do sistema. Esta tela só aparece enquanto não existe nenhum usuário."
    >
      <SetupForm />
    </AuthCard>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <Setup />
    </Suspense>
  );
}
