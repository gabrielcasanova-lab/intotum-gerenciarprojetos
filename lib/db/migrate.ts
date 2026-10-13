import "server-only";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/lib/db";

/**
 * Aplica as migrações pendentes da pasta drizzle/. Roda ao subir o servidor,
 * então publicar uma versão nova já atualiza o banco, sem precisar de terminal.
 * O servidor do pacote (server.js) muda para a própria pasta ao iniciar,
 * por isso o caminho relativo ao diretório atual funciona nos dois casos.
 */
export async function runMigrations() {
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
    // Controle das migrações no schema public: criar um schema próprio exige
    // permissão extra que o usuário do banco do cPanel pode não ter.
    migrationsSchema: "public",
  });
}
