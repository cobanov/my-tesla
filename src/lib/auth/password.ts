import { argon2, randomBytes, timingSafeEqual } from "node:crypto";
import { passwordLength } from "./password-rules";

const parameters = { memory: 19_456, passes: 2, parallelism: 1 } as const;
const saltBytes = 16;
const hashBytes = 32;
const maxRunning = 2;
const maxWaiting = 32;

export class PasswordBusyError extends Error {
  name = "PasswordBusyError";
}

let running = 0;
const waiting: (() => void)[] = [];

async function withSlot<T>(work: () => Promise<T>): Promise<T> {
  if (running >= maxRunning) {
    if (waiting.length >= maxWaiting) throw new PasswordBusyError();
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  running += 1;
  try {
    return await work();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

function derive(
  password: string,
  salt: Buffer,
  cost: { memory: number; passes: number; parallelism: number },
): Promise<Buffer> {
  return withSlot(
    () =>
      new Promise((resolve, reject) =>
        argon2(
          "argon2id",
          {
            message: password.normalize("NFKC"),
            nonce: salt,
            tagLength: hashBytes,
            ...cost,
          },
          (error, key) => (error ? reject(error) : resolve(key)),
        ),
      ),
  );
}

export function passwordProblem(password: string): string | null {
  const length = [...password.normalize("NFKC")].length;
  if (length < passwordLength.min) {
    return `Use at least ${passwordLength.min} characters. A few words in a row work well.`;
  }
  if (length > passwordLength.max) {
    return `Use at most ${passwordLength.max} characters.`;
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(saltBytes);
  const key = await derive(password, salt, parameters);
  const { memory, passes, parallelism } = parameters;
  return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

const phc =
  /^\$argon2id\$v=19\$m=(\d{1,7}),t=(\d{1,2}),p=(\d{1,2})\$([A-Za-z0-9_-]{16,64})\$([A-Za-z0-9_-]{32,128})$/;

export async function verifyPassword(
  stored: string,
  password: string,
): Promise<boolean> {
  const match = phc.exec(stored);
  if (!match) return false;
  const [, memory, passes, parallelism, salt, hash] = match;
  const expected = Buffer.from(hash ?? "", "base64url");
  const key = await derive(password, Buffer.from(salt ?? "", "base64url"), {
    memory: Number(memory),
    passes: Number(passes),
    parallelism: Number(parallelism),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const decoy = hashPassword(randomBytes(24).toString("base64url"));

export async function verifyNobody(password: string): Promise<false> {
  await verifyPassword(await decoy, password);
  return false;
}
