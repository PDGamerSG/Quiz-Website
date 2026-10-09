import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";
import { databaseFetch } from "../database-fetch";
import { databaseConnection } from "../database-errors";

neonConfig.fetchFunction = databaseFetch;

export function database() {
  const connectionString = databaseConnection(process.env.DATABASE_URL);
  return neon(connectionString, { fetchOptions: { cache: "no-store", signal: AbortSignal.timeout(20000) } });
}
