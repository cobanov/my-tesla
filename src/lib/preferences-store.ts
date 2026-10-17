import "server-only";
import { join } from "node:path";
import { readJsonFile, updateJsonFile } from "./json-file";

type StoreFile = {
  version: 1;
  users: Record<string, unknown>;
};

export const teslamateSettingsTag = "teslamate-settings";

export function userPreferencesTag(user: string): string {
  return `preferences:${user}`;
}

function preferencesPath(
  environment: Record<string, string | undefined> = process.env,
): string {
  const configured = environment.PREFERENCES_FILE?.trim();
  return configured || join(process.cwd(), ".data", "preferences.json");
}

function storeOf(parsed: unknown): StoreFile {
  if (
    parsed &&
    typeof parsed === "object" &&
    "users" in parsed &&
    parsed.users &&
    typeof parsed.users === "object"
  ) {
    return { version: 1, users: parsed.users as Record<string, unknown> };
  }
  return { version: 1, users: {} };
}

export async function readUserPreferences(user: string): Promise<unknown> {
  const store = storeOf(await readJsonFile(preferencesPath()));
  return Object.hasOwn(store.users, user) ? store.users[user] : null;
}

export function writeUserPreferences(
  user: string,
  preferences: unknown,
): Promise<void> {
  return updateJsonFile(preferencesPath(), (current) => {
    const store = storeOf(current);
    if (preferences === null) delete store.users[user];
    else store.users[user] = preferences;
    return store;
  });
}
