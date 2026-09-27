import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const dataRoot = join(process.cwd(), ".data");

export function localDatabasePath() {
  return join(dataRoot, "local.db");
}

export function localMediaPath(id: string) {
  return join(dataRoot, "media", id);
}

export async function ensureDataDirs() {
  await mkdir(join(dataRoot, "media"), { recursive: true });
}
