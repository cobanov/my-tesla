import "server-only";
import { dirname, join } from "node:path";
import { readJsonFile, updateJsonFile } from "../json-file";
import { preferencesPath } from "../preferences-store";
import { parseDevices, withDevice, type PushDevice } from "./devices";

function devicesPath(): string {
  return join(dirname(preferencesPath()), "push-devices.json");
}

export async function readDevices(): Promise<PushDevice[]> {
  return parseDevices(await readJsonFile(devicesPath()));
}

export function saveDevice(device: PushDevice): Promise<void> {
  return updateJsonFile(devicesPath(), (current) => ({
    version: 1,
    devices: withDevice(parseDevices(current), device),
  }));
}

export function removeDevices(tokens: string[]): Promise<void> {
  const removed = new Set(tokens);
  return updateJsonFile(devicesPath(), (current) => ({
    version: 1,
    devices: parseDevices(current).filter(
      (device) => !removed.has(device.token),
    ),
  }));
}
