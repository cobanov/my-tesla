import { siteLink, siteUrl } from "../site";
import type { AuthStore } from "./store";

type Environment = Record<string, string | undefined>;

export function serverOrigin(environment: Environment): URL {
  return (
    siteUrl(environment) ??
    new URL(`http://localhost:${environment.PORT ?? "3000"}`)
  );
}

export function passwordResetLink(
  store: AuthStore,
  email: string,
  environment: Environment,
  now: number,
): { ok: boolean; message: string } {
  const wanted = email.trim().toLowerCase();
  const users = store.listUsers();
  if (users.length === 0) {
    return {
      ok: false,
      message:
        "My Tesla has no account yet. Open the setup link from the server log.",
    };
  }
  const user = users.find((each) => each.email.toLowerCase() === wanted);
  if (!user) {
    const known = users.map((each) => each.email).join(", ");
    return {
      ok: false,
      message: wanted
        ? `No account has the email ${wanted}. The accounts are: ${known}.`
        : `Name the account: node reset-password.mjs EMAIL. The accounts are: ${known}.`,
    };
  }
  const { token } = store.createPasswordReset(user.id, now);
  const link = siteLink(serverOrigin(environment), `reset?token=${token}`);
  return {
    ok: true,
    message: `Open ${link} within 30 minutes to set a new password for ${user.email}. The link works once and signs out every browser, phone, and script token of this account.`,
  };
}
