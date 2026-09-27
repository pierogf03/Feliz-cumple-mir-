import { createClient, type Client } from "@libsql/client";
import {
  ensureRemoteSchema,
  resolveDatabaseUrl,
  usesRemoteDatabase,
} from "@/lib/db-init";
import type { SqlDatabase, SqlStatement } from "@/lib/db-types";
import { runBatch } from "@/lib/db-types";
import { nativeDb } from "@/lib/sqlite-native";

let client: Client | undefined;
let ready: Promise<void> | undefined;

async function getRemoteClient(): Promise<Client> {
  if (!client) {
    client = createClient({
      url: resolveDatabaseUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
    ready = ensureRemoteSchema(client);
  }
  await ready;
  return client;
}

class RemotePreparedStatement implements SqlStatement {
  constructor(
    private readonly sql: string,
    private readonly args: unknown[] = [],
  ) {}

  isSelect() {
    return this.sql.trim().toUpperCase().startsWith("SELECT");
  }

  bind(...args: unknown[]) {
    return new RemotePreparedStatement(this.sql, args);
  }

  async first<T>(): Promise<T | null> {
    const rs = await (await getRemoteClient()).execute({
      sql: this.sql,
      args: this.args as (string | number | null)[],
    });
    return (rs.rows[0] as T | undefined) ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    const rs = await (await getRemoteClient()).execute({
      sql: this.sql,
      args: this.args as (string | number | null)[],
    });
    return { results: rs.rows as T[] };
  }

  async run(): Promise<void> {
    await (await getRemoteClient()).execute({
      sql: this.sql,
      args: this.args as (string | number | null)[],
    });
  }
}

function remoteDb(): SqlDatabase {
  return {
    prepare(sql: string) {
      return new RemotePreparedStatement(sql);
    },
    batch(stmts: SqlStatement[]) {
      return runBatch(stmts);
    },
  };
}

export function db(): SqlDatabase {
  return usesRemoteDatabase() ? remoteDb() : nativeDb();
}
