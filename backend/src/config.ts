import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export type Config = {
  port: number; host: string; databaseMode: 'pglite' | 'postgres'; databaseUrl?: string;
  databaseSsl: boolean; dataDir: string; demoMode: boolean; jwtSecret: string;
  corsOrigins: string[]; assetsDir: string;
};

export async function loadConfig(): Promise<Config> {
  const dataDir = path.resolve(backendRoot, process.env.DATA_DIR || 'data');
  const production = process.env.NODE_ENV === 'production';
  const mode = process.env.DATABASE_MODE || (process.env.DATABASE_URL ? 'postgres' : 'pglite');
  if (mode !== 'postgres' && mode !== 'pglite') throw new Error('DATABASE_MODE debe ser pglite o postgres.');
  if (mode === 'postgres' && !process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL para usar PostgreSQL.');
  await mkdir(dataDir, { recursive: true });
  let jwtSecret = process.env.JWT_SECRET?.trim();
  if (jwtSecret && jwtSecret.length < 32) throw new Error('JWT_SECRET debe contener al menos 32 caracteres.');
  if (!jwtSecret) {
    if (production) throw new Error('Configura JWT_SECRET antes de iniciar en producción.');
    const secretPath = path.join(dataDir, 'jwt-secret');
    try { jwtSecret = (await readFile(secretPath, 'utf8')).trim(); }
    catch (error: any) {
      if (error.code !== 'ENOENT') throw error;
      jwtSecret = randomBytes(48).toString('base64url');
      await writeFile(secretPath, jwtSecret, { flag: 'wx', mode: 0o600 });
    }
    if (jwtSecret.length < 32) throw new Error('El secreto JWT local está dañado. Revisa data/jwt-secret.');
  }
  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT no es válido.');
  const demoMode = process.env.DEMO_MODE === undefined ? !production : process.env.DEMO_MODE === 'true';
  if (production && demoMode) throw new Error('Desactiva DEMO_MODE antes de iniciar en producción.');
  return {
    port, host: process.env.HOST || '0.0.0.0', databaseMode: mode,
    databaseUrl: process.env.DATABASE_URL, databaseSsl: process.env.DATABASE_SSL === 'true',
    dataDir, demoMode, jwtSecret,
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006').split(',').map(v => v.trim()).filter(Boolean),
    assetsDir: path.join(backendRoot, 'assets'),
  };
}
