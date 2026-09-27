export type BatchResult = { results: unknown[] };

export interface SqlStatement {
  isSelect(): boolean;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<void>;
}

export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  batch(stmts: SqlStatement[]): Promise<BatchResult[]>;
}

export async function runBatch(stmts: SqlStatement[]): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  for (const stmt of stmts) {
    if (stmt.isSelect()) {
      results.push(await stmt.all());
    } else {
      await stmt.run();
      results.push({ results: [] });
    }
  }
  return results;
}
