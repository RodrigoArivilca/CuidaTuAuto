import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function requireNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  const supported = (major === 22 && minor >= 13) || (major === 24 && minor >= 3) || major >= 25;
  if (!supported) throw new Error('Usa Node.js 24 LTS (24.3 o posterior) o Node.js 22 LTS (22.13 o posterior). Esta versión de Expo/React Native no admite todas las versiones intermedias de Node.');
}

export function npmCommand(args) {
  // npm run proporciona la ruta al CLI. Ejecutarlo con Node evita npm.cmd/shell
  // y conserva correctamente las rutas de Windows que contienen espacios.
  const cli = process.env.npm_execpath;
  if (!cli || !existsSync(cli)) {
    throw new Error('Ejecuta este archivo mediante los comandos npm run del README.');
  }
  return { command: process.execPath, args: [cli, ...args] };
}

export function runNpm(folder, args) {
  const command = npmCommand(args);
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command.command, command.args, {
      cwd: resolve(root, folder), stdio: 'inherit', env: process.env,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${folder}: npm ${args.join(' ')} terminó con ${signal || `código ${code}`}.`));
    });
  });
}

export function readBackendPort() {
  if (process.env.PORT) return process.env.PORT;
  const file = resolve(root, 'backend', '.env');
  if (!existsSync(file)) return '4000';
  const match = readFileSync(file, 'utf8').match(/^\s*PORT\s*=\s*["']?(\d+)/m);
  return match?.[1] || '4000';
}

export function assertDependencies() {
  for (const folder of ['backend', 'frontend']) {
    if (!existsSync(resolve(root, folder, 'node_modules'))) {
      throw new Error(`Faltan las dependencias de ${folder}. Ejecuta npm run setup primero.`);
    }
  }
}
