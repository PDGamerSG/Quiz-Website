import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";
import { databaseFetch } from "../database-fetch";

neonConfig.fetchFunction = databaseFetch;

export function database() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_NOT_CONFIGURED");
  return neon(connectionString, { fetchOptions: { cache: "no-store", signal: AbortSignal.timeout(20000) } });
}
