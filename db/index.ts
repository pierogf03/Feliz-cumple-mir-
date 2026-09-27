import { createClient } from "@libsql/client";
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import {
  resolveDatabaseUrl,
  usesRemoteDatabase,
  ensureNativeSchema,
} from "@/lib/db-init";
import { dataRoot, localDatabasePath } from "@/lib/local-paths";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";

export function getDb() {
  if (usesRemoteDatabase()) {
    const client = createClient({
      url: resolveDatabaseUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
    return drizzleLibsql(client, { schema });
  }
  mkdirSync(dataRoot, { recursive: true });
  const sqlite = new Database(localDatabasePath());
  ensureNativeSchema(sqlite);
  return drizzleSqlite(sqlite, { schema });
}
