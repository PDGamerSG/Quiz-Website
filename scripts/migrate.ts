import { loadEnvConfig } from "@next/env";
import { neon, neonConfig } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { databaseFetch } from "../lib/database-fetch";

async function main() {
  loadEnvConfig(process.cwd());
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Set DATABASE_URL before running the database migration.");
  neonConfig.fetchFunction = databaseFetch;
  const sql = neon(connectionString, { fetchOptions: { signal: AbortSignal.timeout(30000) } });
  const schema = await readFile(resolve(process.cwd(), "db/schema.sql"), "utf8");
  const statements = schema.split(";").map((statement) => statement.trim()).filter(Boolean);
  await sql.transaction(statements.map((statement) => sql.query(statement)));
  console.log("Quizly database tables and indexes are ready.");
}
void main().catch(() => {
  console.error("Database migration failed. Check DATABASE_URL and db/schema.sql.");
  process.exitCode = 1;
});
