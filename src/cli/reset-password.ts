import { existsSync } from "node:fs";
import { authDatabasePath } from "../lib/auth/paths";
import { passwordResetLink } from "../lib/auth/reset-link";
import { AuthStore } from "../lib/auth/store";

process.umask(0o077);
const path = authDatabasePath(process.env);
if (!existsSync(path)) {
  console.error(
    `My Tesla has no account store at ${path}. Start the server once, then open the setup link from its log.`,
  );
  process.exit(1);
}
const store = new AuthStore(path);
try {
  const result = passwordResetLink(
    store,
    process.argv[2] ?? "",
    process.env,
    Date.now(),
  );
  if (result.ok) console.info(result.message);
  else console.error(result.message);
  process.exitCode = result.ok ? 0 : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  store.close();
}
