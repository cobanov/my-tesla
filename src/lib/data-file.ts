import { dirname, join } from "node:path";

type Environment = Record<string, string | undefined>;

export function dataFile(environment: Environment, name: string): string {
  const preferences =
    environment.PREFERENCES_FILE?.trim() ||
    join(process.cwd(), ".data", "preferences.json");
  return join(dirname(preferences), name);
}
