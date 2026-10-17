import "server-only";
import { isDemoMode } from "../demo/mode";
import { siteUrl } from "../site";
import { authStore, setupToken } from "./session";

export function announceSetup(): void {
  if (isDemoMode() || process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  try {
    if (authStore().userCount() > 0) return;
  } catch (error) {
    console.error("My Tesla could not open its account store.", error);
    return;
  }
  const origin =
    siteUrl(process.env)?.href.replace(/\/$/, "") ??
    `http://localhost:${process.env.PORT ?? "3000"}`;
  console.info(
    `My Tesla has no account yet. Open ${origin}/setup?token=${setupToken()} to create the admin account. The link works until the account exists.`,
  );
}
