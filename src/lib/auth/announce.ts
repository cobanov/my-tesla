import "server-only";
import { isDemoMode } from "../demo/mode";
import { siteLink } from "../site";
import { serverOrigin } from "./reset-link";
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
  const link = siteLink(
    serverOrigin(process.env),
    `setup?token=${setupToken()}`,
  );
  console.info(
    `My Tesla has no account yet. Open ${link} to create the admin account. The link works until the account exists.`,
  );
}
