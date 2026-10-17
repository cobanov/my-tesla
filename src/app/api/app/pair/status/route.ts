import { headers } from "next/headers";
import type { PairStatus } from "@/lib/app/contract";
import { appJson } from "@/lib/app/request";
import { bearerToken } from "@/lib/auth/paths";
import { authStore } from "@/lib/auth/session";

export async function GET() {
  const token = bearerToken((await headers()).get("authorization"));
  const found = authStore().deviceStatus(token, Date.now());
  if (!found) {
    return appJson(
      { error: "The pairing ended. Scan a new code on the web." },
      401,
    );
  }
  const { user, session } = found;
  const body: PairStatus = {
    status: session.status,
    user: { name: user.name, email: user.email, role: user.role },
  };
  return appJson(body);
}
