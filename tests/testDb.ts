import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * Creates an in-memory SQLite database adhering to Cloudflare D1Database interface for testing
 */
export function createTestD1Database(): D1Database {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');

  // Load and execute initial schema migration
  const migrationPath = path.resolve(__dirname, '../migrations/0001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  sqlite.exec(sql);

  function createStatement(query: string, params: any[] = []): any {
    return {
      bind(...newParams: any[]) {
        return createStatement(query, newParams);
      },
      async first<T = unknown>(colName?: string): Promise<T | null> {
        const stmt = sqlite.prepare(query);
        const row = stmt.get(...params);
        if (!row) return null;
        if (colName && typeof row === 'object') {
          return (row as any)[colName] as T;
        }
        return row as T;
      },
      async all<T = unknown>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(query);
        const rows = stmt.all(...params);
        return {
          results: rows as T[],
          success: true,
          meta: {} as any,
        };
      },
      runSync(): D1Response {
        const stmt = sqlite.prepare(query);
        const info = stmt.run(...params);
        return {
          success: true,
          meta: {
            changes: info.changes,
            last_row_id: Number(info.lastInsertRowid),
          } as any,
        };
      },
      async run(): Promise<D1Response> {
        return this.runSync();
      },
      raw(): Promise<unknown[]> {
        const stmt = sqlite.prepare(query);
        return Promise.resolve(stmt.raw().all(...params));
      },
    };
  }

  const d1Mock: any = {
    prepare(query: string) {
      return createStatement(query);
    },
    async batch(statements: any[]) {
      const runBatch = sqlite.transaction(() => {
        const results = [];
        for (const s of statements) {
          const res = s.runSync ? s.runSync() : null;
          results.push(res);
        }
        return results;
      });
      return runBatch();
    },
    async exec(query: string) {
      sqlite.exec(query);
      return { count: 1, duration: 0 };
    },
    dump() {
      throw new Error('Not implemented');
    },
  };

  return d1Mock as D1Database;
}
