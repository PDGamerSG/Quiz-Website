import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseFetch } from "../lib/database-fetch";

test("database transport retries network failures and returns a successful response", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { if (++calls < 3) throw new TypeError("network unavailable"); return new Response("ok"); };
  try { assert.equal(await (await databaseFetch("https://database.test")).text(), "ok"); assert.equal(calls, 3); }
  finally { globalThis.fetch = original; }
});

test("database transport never retries an HTTP database error", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("conflict", { status: 409 }); };
  try { assert.equal((await databaseFetch("https://database.test")).status, 409); assert.equal(calls, 1); }
  finally { globalThis.fetch = original; }
});

test("database transport stops after three failures or a cancelled request", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new TypeError("network unavailable"); };
  try {
    await assert.rejects(databaseFetch("https://database.test"), /network unavailable/);
    assert.equal(calls, 3);
    calls = 0;
    await assert.rejects(databaseFetch("https://database.test", { signal: AbortSignal.abort() }), /network unavailable/);
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; }
});
