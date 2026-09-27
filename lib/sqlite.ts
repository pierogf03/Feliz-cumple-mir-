import { createClient, type Client } from "@libsql/client";

let client: Client | undefined;

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("Database unavailable");
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
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
    const rs = await getClient().execute({
      sql: this.sql,
      args: this.args as (string | number | null)[],
    });
    return (rs.rows[0] as T | undefined) ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    const rs = await getClient().execute({
      sql: this.sql,
      args: this.args as (string | number | null)[],
    });
    return { results: rs.rows as T[] };
  }

  async run(): Promise<void> {
    await this.execute();
  }

  async execute() {
    return getClient().execute({
      sql: this.sql,
      args: this.args as (string | number | null)[],
    });
  }
}

export function db() {
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
