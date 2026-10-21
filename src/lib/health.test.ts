import { describe, expect, test } from "bun:test";
import { checkHealth } from "./health";

const hidden = "The database did not answer. The server log has the reason.";

describe("checkHealth", () => {
  test("reports ok when the database answers", async () => {
    expect(await checkHealth(async () => [{ "?column?": 1 }])).toEqual({
      httpStatus: 200,
      body: { status: "ok", database: "ok" },
    });
  });

  test("reports a database error as degraded without its text", async () => {
    const result = await checkHealth(async () => {
      throw new Error('password authentication failed for user "reader"');
    });
    expect(result).toEqual({
      httpStatus: 503,
      body: { status: "degraded", database: "unreachable", detail: hidden },
    });
  });

  test("reports a database that does not answer in time", async () => {
    const result = await checkHealth(() => new Promise(() => {}), 20);
    expect(result.httpStatus).toBe(503);
    expect(result.body).toMatchObject({ detail: hidden });
  });
});
