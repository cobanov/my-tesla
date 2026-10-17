import "server-only";
import { connection } from "next/server";
import { findCar } from "../queries";
import { getFormatter, getPreferences } from "../viewer";
import { apiUnauthorized } from "../auth/session";

const recordId = /^\d{1,9}$/;
const maxBodyLength = 4_096;

export function appJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export function appNotFound(): Response {
  return appJson({ error: "No such record." }, 404);
}

export function parseId(value: string): number | null {
  return recordId.test(value) ? Number(value) : null;
}

export async function appContext(params: Promise<{ carId: string }>) {
  await connection();
  if (await apiUnauthorized()) return null;
  const { carId } = await params;
  const id = parseId(carId);
  const [car, f, preferences] = await Promise.all([
    id === null ? null : findCar(id),
    getFormatter(),
    getPreferences(),
  ]);
  return car
    ? {
        car,
        f,
        preferences,
        showMaps: preferences.maps === "show",
        now: new Date(),
      }
    : null;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return undefined;
  }
  const text = await request.text();
  if (text.length > maxBodyLength) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
