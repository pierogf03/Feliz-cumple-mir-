import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { canUseLocalDisk } from "@/lib/runtime-env";

export const dataRoot = join(process.cwd(), ".data");

export function localDatabasePath() {
  return join(dataRoot, "local.db");
}

export function localMediaPath(id: string) {
  return join(dataRoot, "media", id);
}

export async function ensureDataDirs() {
  if (!canUseLocalDisk()) return;
  await mkdir(join(dataRoot, "media"), { recursive: true });
}
