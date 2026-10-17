import { accessHeaders, type Connection } from "@/connection/server";
import { responseProblem } from "./responses";

const timeoutMs = 15_000;

export class ApiError extends Error {
  name = "ApiError";
}

type RequestOptions = {
  method?: "GET" | "PUT" | "POST" | "DELETE";
  body?: unknown;
};

async function serverMessage(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    const error = (body as { error?: unknown } | null)?.error;
    return typeof error === "string" ? error : null;
  } catch {
    return null;
  }
}

export async function request(
  connection: Connection,
  path: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${connection.url}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
        ...accessHeaders(connection),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      "The server did not answer. Check the address and the network.",
    );
  } finally {
    clearTimeout(timer);
  }
  const contentType = response.headers.get("content-type");
  const message = response.ok ? null : await serverMessage(response);
  const problem = responseProblem(response.status, contentType, message);
  if (problem) throw new ApiError(problem);
  return response.status === 204 ? null : response.json();
}
