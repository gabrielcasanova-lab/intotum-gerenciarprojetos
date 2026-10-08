// Cria (ou redefine a senha de) um administrador.
// Uso: npm run create-admin -- "Nome" email@intotumse.com.br "SenhaForte#1"
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "../lib/db/schema";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const [name, rawEmail, password] = process.argv.slice(2);
  if (!name || !rawEmail || !password) {
    console.error('Uso: npm run create-admin -- "Nome" email senha');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("A senha precisa ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const email = rawEmail.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  await db
    .insert(users)
    .values({ name, email, passwordHash, role: "admin" })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name,
        passwordHash,
        role: "admin",
        active: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

  console.log(`Administrador pronto: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
