import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { ensureNativeSchema } from "@/lib/db-init";
import { dataRoot, localDatabasePath } from "@/lib/local-paths";

let db: Database.Database | undefined;

function getNativeDatabase() {
  if (!db) {
    mkdirSync(dataRoot, { recursive: true });
    db = new Database(localDatabasePath());
    db.pragma("journal_mode = WAL");
    ensureNativeSchema(db);
  }
  return db;
}

type SqlValue = string | number | null;

export class NativePreparedStatement {
  constructor(
    private readonly sql: string,
    private readonly args: SqlValue[] = [],
  ) {}

  bind(...args: SqlValue[]) {
    return new NativePreparedStatement(this.sql, args);
  }

  async first<T>(): Promise<T | null> {
    const row = getNativeDatabase().prepare(this.sql).get(...this.args);
    return (row as T | undefined) ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    const rows = getNativeDatabase().prepare(this.sql).all(...this.args);
    return { results: rows as T[] };
  }

  async run(): Promise<void> {
    getNativeDatabase().prepare(this.sql).run(...this.args);
  }

  async execute() {
    const result = getNativeDatabase().prepare(this.sql).run(...this.args);
    return { rows: [] as unknown[], result };
  }
}

export function nativeDb() {
  return {
    prepare(sql: string) {
      return new NativePreparedStatement(sql);
    },
    async batch(stmts: NativePreparedStatement[]) {
      const results: { results: unknown[] }[] = [];
      for (const stmt of stmts) {
        if (stmt.sql.trim().toUpperCase().startsWith("SELECT")) {
          results.push(await stmt.all());
        } else {
          await stmt.run();
          results.push({ results: [] });
        }
      }
      return results;
    },
  };
}
