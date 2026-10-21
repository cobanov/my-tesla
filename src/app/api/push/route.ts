import { connection } from "next/server";
import type { PushCatalog } from "@/lib/app/contract";
import { readJsonBody } from "@/lib/app/request";
import { apiUnauthorized, authStore, currentSession } from "@/lib/auth/session";
import { deliver, pushEnabled } from "@/lib/push/alerts";
import {
  readDevices,
  removeDevices,
  saveDevice,
} from "@/lib/push/device-store";
import {
  isPushToken,
  parseDevice,
  testMessage,
  type PushDevice,
} from "@/lib/push/devices";
import { carEvents } from "@/lib/push/events";

const noStore = { "Cache-Control": "private, no-store" };

function ownedByOther(
  device: PushDevice | undefined,
  sessionId: string | null,
  now: number,
): boolean {
  return Boolean(
    device?.sessionId &&
    device.sessionId !== sessionId &&
    authStore().sessionActive(device.sessionId, now),
  );
}

function problem(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: noStore });
}

async function bodyToken(request: Request): Promise<string | null> {
  const body = await readJsonBody(request);
  const token = (body as { token?: unknown } | undefined)?.token;
  return isPushToken(token) ? token : null;
}

export async function GET() {
  await connection();
  const denied = await apiUnauthorized();
  if (denied) return denied;
  return Response.json(
    { enabled: pushEnabled(), events: carEvents } satisfies PushCatalog,
    { headers: noStore },
  );
}

export async function PUT(request: Request) {
  const denied = await apiUnauthorized();
  if (denied) return denied;
  if (!pushEnabled()) return problem(409, "Push alerts need the MQTT feed.");
  const signedIn = await currentSession();
  const device = parseDevice(
    await readJsonBody(request),
    new Date(),
    signedIn?.session.id ?? null,
  );
  if (!device) {
    return problem(400, "Send a JSON body with an Expo push token and events.");
  }
  const saved = (await readDevices()).find(
    (entry) => entry.token === device.token,
  );
  if (ownedByOther(saved, device.sessionId, Date.now())) {
    return problem(409, "Another signed-in phone uses this push token.");
  }
  await saveDevice(device);
  return Response.json(device, { headers: noStore });
}

export async function DELETE(request: Request) {
  const denied = await apiUnauthorized();
  if (denied) return denied;
  const token = await bodyToken(request);
  if (!token) return problem(400, "Send a JSON body with an Expo push token.");
  const signedIn = await currentSession();
  const saved = (await readDevices()).find((entry) => entry.token === token);
  if (!ownedByOther(saved, signedIn?.session.id ?? null, Date.now())) {
    await removeDevices([token]);
  }
  return new Response(null, { status: 204, headers: noStore });
}

export async function POST(request: Request) {
  const denied = await apiUnauthorized();
  if (denied) return denied;
  if (!pushEnabled()) return problem(409, "Push alerts need the MQTT feed.");
  const token = await bodyToken(request);
  if (!token) return problem(400, "Send a JSON body with an Expo push token.");
  const signedIn = await currentSession();
  const saved = (await readDevices()).find((entry) => entry.token === token);
  if (!saved || saved.sessionId !== (signedIn?.session.id ?? null)) {
    return problem(404, "Turn on an alert on this phone first.");
  }
  try {
    await deliver([testMessage(token)]);
  } catch {
    return problem(502, "The Expo push service did not take the alert.");
  }
  return new Response(null, { status: 204, headers: noStore });
}
