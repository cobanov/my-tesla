import { headers } from "next/headers";
import type { PairClaim } from "@/lib/app/contract";
import { deviceClaim } from "@/lib/app/pairing-request";
import { appJson, readJsonBody } from "@/lib/app/request";
import { authStore, clientAddress, limits } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/mode";

export async function POST(request: Request) {
  if (isDemoMode()) {
    return appJson({ error: "The demo needs no pairing." }, 404);
  }
  const address = clientAddress(await headers()) ?? "unknown";
  const now = Date.now();
  if (
    !limits.address().take(address, now) ||
    limits.account().waitMs(`pair:${address}`, now) > 0
  ) {
    return appJson({ error: "Too many tries. Wait a while." }, 429);
  }
  const claim = deviceClaim(await readJsonBody(request));
  const claimed = claim
    ? authStore().claimPairingCode(
        claim.code,
        { name: claim.name, platform: claim.platform, ip: address },
        now,
      )
    : null;
  if (!claimed) {
    limits.account().fail(`pair:${address}`, now);
    return appJson(
      { error: "This code does not work. Show a new code on the web." },
      400,
    );
  }
  const body: PairClaim = {
    token: claimed.token,
    status: "pending",
    user: { name: claimed.user.name },
  };
  return appJson(body, 201);
}
