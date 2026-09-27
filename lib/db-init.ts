import { readFileSync } from "node:fs";
import { readFile as readFileAsync } from "node:fs/promises";
import { join } from "node:path";
import type { Client } from "@libsql/client";
import type Database from "better-sqlite3";
import { ensureDataDirs, localDatabasePath } from "@/lib/local-paths";

const SCHEMA_FILE = join(process.cwd(), "drizzle", "0000_our_memories.sql");

let initializedRemote = false;
let initializedNative = false;

export function usesRemoteDatabase(): boolean {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) return false;
  if (url.startsWith("file:")) return false;
  return (
    url.startsWith("libsql:") ||
    url.startsWith("https:") ||
    url.startsWith("http:")
  );
}

function schemaStatementsFrom(sql: string) {
  return sql
    .split(/--> statement-breakpoint\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function tableExistsNative(db: Database.Database): boolean {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'",
    )
    .get();
  return Boolean(row);
}

export function ensureNativeSchema(db: Database.Database) {
  if (initializedNative) return;
  const sql = readFileSync(SCHEMA_FILE, "utf8");
  if (!tableExistsNative(db)) {
    for (const statement of schemaStatementsFrom(sql)) {
      db.exec(statement);
    }
  }
  initializedNative = true;
}

export async function ensureRemoteSchema(client: Client) {
  if (initializedRemote) return;
  await ensureDataDirs();

  const exists = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'",
  );
  if (exists.rows.length === 0) {
    const sql = await readFileAsync(SCHEMA_FILE, "utf8");
    for (const statement of schemaStatementsFrom(sql)) {
      await client.execute(statement);
    }
  }

  initializedRemote = true;
}

export function resolveDatabaseUrl(): string {
  const configured = process.env.TURSO_DATABASE_URL?.trim();
  if (!configured) return localDatabasePath();
  return configured;
}
