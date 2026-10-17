import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

let queue: Promise<unknown> = Promise.resolve();

export async function readJsonFile(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function updateJsonFile(
  path: string,
  update: (current: unknown) => unknown,
): Promise<void> {
  const write = queue.then(async () => {
    const next = update(await readJsonFile(path));
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, {
      mode: 0o600,
    });
    await rename(temporary, path);
  });
  queue = write.catch(() => undefined);
  return write;
}
