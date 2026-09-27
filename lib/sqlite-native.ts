import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { ensureNativeSchema } from "@/lib/db-init";
import type { SqlDatabase, SqlStatement } from "@/lib/db-types";
import { runBatch } from "@/lib/db-types";
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

class NativePreparedStatement implements SqlStatement {
  constructor(
    private readonly sql: string,
    private readonly args: SqlValue[] = [],
  ) {}

  isSelect() {
    return this.sql.trim().toUpperCase().startsWith("SELECT");
  }

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
}

export function nativeDb(): SqlDatabase {
  return {
    prepare(sql: string) {
      return new NativePreparedStatement(sql);
    },
    batch(stmts: SqlStatement[]) {
      return runBatch(stmts);
    },
  };
}
