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
  const address = clientAddress(await headers());
  const now = Date.now();
  if (
    address &&
    (limits.address().blocked(address, now) ||
      limits.attempt().waitMs(`pair|${address}`, now) > 0)
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
    if (address) {
      limits.address().fail(address, now);
      limits.attempt().fail(`pair|${address}`, now);
    }
    return appJson(
      {
        error:
          "This code does not work. If the page on the web now asks to allow a phone, press Deny there, then show a new code.",
      },
      400,
    );
  }
  const body: PairClaim = {
    token: claimed.token,
    check: claimed.check,
    status: "pending",
    user: { name: claimed.user.name },
  };
  return appJson(body, 201);
}
