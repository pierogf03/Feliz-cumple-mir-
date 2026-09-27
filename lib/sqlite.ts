import { createClient, type Client } from "@libsql/client";
import {
  ensureRemoteSchema,
  resolveDatabaseUrl,
  usesRemoteDatabase,
} from "@/lib/db-init";
import { nativeDb, NativePreparedStatement } from "@/lib/sqlite-native";

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

export class PreparedStatement {
  constructor(
    private readonly sql: string,
    private readonly args: unknown[] = [],
  ) {}

  bind(...args: unknown[]) {
    return new PreparedStatement(this.sql, args);
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
    await this.execute();
  }

  async execute() {
    return (await getRemoteClient()).execute({
      sql: this.sql,
      args: this.args as (string | number | null)[],
    });
  }
}

export function db() {
  if (!usesRemoteDatabase()) {
    return nativeDb();
  }
  return {
    prepare(sql: string) {
      return new PreparedStatement(sql);
    },
    async batch(stmts: PreparedStatement[]) {
      const results: { results: unknown[] }[] = [];
      for (const stmt of stmts) {
        const rs = await stmt.execute();
        results.push({ results: rs.rows });
      }
      return results;
    },
  };
}

export type DbPreparedStatement = PreparedStatement | NativePreparedStatement;
