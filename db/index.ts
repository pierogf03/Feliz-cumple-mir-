/** Runtime persistence lives in `lib/store.ts`. This module is kept for Drizzle schema tooling. */
export function getDb(): never {
  throw new Error("Use lib/store.ts for persistence.");
}
