import { connection } from "next/server";
import type { PushCatalog } from "@/lib/app/contract";
import { deliver, pushEnabled } from "@/lib/push/alerts";
import {
  readDevices,
  removeDevices,
  saveDevice,
} from "@/lib/push/device-store";
import { isPushToken, parseDevice, testMessage } from "@/lib/push/devices";
import { carEvents } from "@/lib/push/events";

const maxBodyLength = 4_096;
const noStore = { "Cache-Control": "private, no-store" };

function problem(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: noStore });
}

async function jsonBody(request: Request): Promise<unknown> {
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

async function bodyToken(request: Request): Promise<string | null> {
  const body = await jsonBody(request);
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
  const device = parseDevice(await jsonBody(request), new Date());
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
