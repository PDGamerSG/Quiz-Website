export type StorageFailureCode = "DATABASE_NOT_CONFIGURED" | "DATABASE_URL_INVALID" | "DATABASE_SCHEMA_MISSING" | "DATABASE_AUTH_FAILED" | "DATABASE_UNREACHABLE" | "DATABASE_ERROR";

export class DatabaseConfigurationError extends Error {
  constructor(public code: "DATABASE_NOT_CONFIGURED" | "DATABASE_URL_INVALID") {
    super(code);
    this.name = "DatabaseConfigurationError";
  }
}

export function databaseConnection(value: string | undefined): string {
  const connection = value?.trim();
  if (!connection) throw new DatabaseConfigurationError("DATABASE_NOT_CONFIGURED");
  try {
    if (/\s/.test(connection)) throw new Error();
    const url = new URL(connection);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2) throw new Error();
  } catch { throw new DatabaseConfigurationError("DATABASE_URL_INVALID"); }
  return connection;
}

// Return only fixed codes and safe messages. Neon errors may contain credentials.
export function storageFailure(error: unknown): { code: StorageFailureCode; message: string } {
  const data = error && typeof error === "object" ? error as { code?: unknown; sourceError?: unknown } : {};
  if (data.code === "DATABASE_NOT_CONFIGURED") return { code: data.code, message: "Quiz storage is not connected for this deployment. The site owner needs to finish database setup." };
  if (data.code === "DATABASE_URL_INVALID") return { code: data.code, message: "This deployment's database connection setting is invalid. The site owner needs to update it." };
  if (data.code === "42P01" || data.code === "42703") return { code: "DATABASE_SCHEMA_MISSING", message: "Quiz storage needs a database update. The site owner needs to run the database migration." };
  if (data.code === "28P01" || data.code === "28000" || data.code === "42501") return { code: "DATABASE_AUTH_FAILED", message: "Quiz storage cannot access the database. The site owner needs to check its connection credentials and permissions." };
  if (data.sourceError || (typeof data.code === "string" && /^(08|53|57)/.test(data.code))) return { code: "DATABASE_UNREACHABLE", message: "The database could not be reached. Your draft is safe; please try again." };
  return { code: "DATABASE_ERROR", message: "Database storage is temporarily unavailable. Your draft is safe; please try again." };
}
