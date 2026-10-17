import { connection } from "next/server";
import type { PushCatalog } from "@/lib/app/contract";
import { readJsonBody } from "@/lib/app/request";
import { currentSession } from "@/lib/auth/session";
import { deliver, pushEnabled } from "@/lib/push/alerts";
import {
  readDevices,
  removeDevices,
  saveDevice,
} from "@/lib/push/device-store";
import { isPushToken, parseDevice, testMessage } from "@/lib/push/devices";
import { carEvents } from "@/lib/push/events";

const noStore = { "Cache-Control": "private, no-store" };

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
  return Response.json(
    { enabled: pushEnabled(), events: carEvents } satisfies PushCatalog,
    { headers: noStore },
  );
}

export async function PUT(request: Request) {
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
  await saveDevice(device);
  return Response.json(device, { headers: noStore });
}

export async function DELETE(request: Request) {
  const token = await bodyToken(request);
  if (!token) return problem(400, "Send a JSON body with an Expo push token.");
  await removeDevices([token]);
  return new Response(null, { status: 204, headers: noStore });
}

export async function POST(request: Request) {
  if (!pushEnabled()) return problem(409, "Push alerts need the MQTT feed.");
  const token = await bodyToken(request);
  if (!token) return problem(400, "Send a JSON body with an Expo push token.");
  const devices = await readDevices();
  if (!devices.some((device) => device.token === token)) {
    return problem(404, "Turn on an alert on this phone first.");
  }
  try {
    await deliver([testMessage(token)]);
  } catch {
    return problem(502, "The Expo push service did not take the alert.");
  }
  return new Response(null, { status: 204, headers: noStore });
}
