import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { backendRoot, type Config } from './config.js';

export interface Sql {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, any>[]; rowCount?: number | null }>;
  exec(sql: string): Promise<unknown>;
}
export interface Database extends Sql {
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export async function openDatabase(config: Config): Promise<Database> {
  if (config.databaseMode === 'postgres') {
    const pool = new pg.Pool({ connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: true } : undefined,
      max: 10, connectionTimeoutMillis: 10_000 });
    await pool.query('SELECT 1');
    return {
      query: async (sql, params) => pool.query(sql, params),
      exec: sql => pool.query(sql),
      transaction: async fn => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await fn({ query: (sql, params) => client.query(sql, params), exec: sql => client.query(sql) });
          await client.query('COMMIT'); return result;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      },
      close: () => pool.end(),
    };
  }
  const embedded = await PGlite.create(path.join(config.dataDir, 'database'));
  return {
    query: async (sql, params) => embedded.query<Record<string, any>>(sql, params),
    exec: sql => embedded.exec(sql),
    transaction: async fn => embedded.transaction(tx => fn({
      query: async (sql, params) => tx.query<Record<string, any>>(sql, params), exec: sql => tx.exec(sql),
    })),
    close: () => embedded.close(),
  };
}

export async function migrate(db: Database): Promise<void> {
  const directory = path.join(backendRoot, 'migrations');
  const files = (await readdir(directory)).filter(name => /^\d+_.+\.sql$/.test(name)).sort();
  await db.transaction(async tx => {
    for (const name of files) await tx.exec(await readFile(path.join(directory, name), 'utf8'));
  });
}
