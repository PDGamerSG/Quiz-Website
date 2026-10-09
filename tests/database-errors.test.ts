import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseConnection, storageFailure } from "../lib/database-errors";

test("missing and malformed connection settings have distinct safe errors", () => {
  for (const value of [undefined, "", "  "]) assert.throws(() => databaseConnection(value), (error) => storageFailure(error).code === "DATABASE_NOT_CONFIGURED");
  for (const value of ["build-without-live-database", "https://example.com", "postgresql://user@host/", "postgresql://USER:PASSWORD@HOST/DATABASE\nOTHER=value"]) {
    assert.throws(() => databaseConnection(value), (error) => storageFailure(error).code === "DATABASE_URL_INVALID");
  }
  const connection = "postgresql://owner:secret@database.example/quiz?sslmode=require";
  assert.equal(databaseConnection(` ${connection} `), connection);
});

test("storage failures identify setup, schema, authentication and network problems without exposing secrets", () => {
  const detail = "postgresql://owner:private-password@database.example/quiz";
  const failures = [
    { error: { code: "42P01", message: detail }, code: "DATABASE_SCHEMA_MISSING" },
    { error: { code: "28P01", message: detail }, code: "DATABASE_AUTH_FAILED" },
    { error: { code: "42501", detail }, code: "DATABASE_AUTH_FAILED" },
    { error: { sourceError: new Error(detail) }, code: "DATABASE_UNREACHABLE" },
    { error: new Error(detail), code: "DATABASE_ERROR" },
  ];
  for (const { error, code } of failures) {
    const failure = storageFailure(error);
    assert.equal(failure.code, code);
    assert.equal(JSON.stringify(failure).includes("private-password"), false);
  }
});
