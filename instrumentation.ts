// Chamado uma vez quando o servidor do Next.js sobe.
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.SKIP_MIGRATIONS !== "1"
  ) {
    const { runMigrations } = await import("@/lib/db/migrate");
    await runMigrations();
    console.log("Banco de dados atualizado.");
  }
}
