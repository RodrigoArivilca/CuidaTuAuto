import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { assertDependencies, npmCommand, readBackendPort, requireNode, root } from './lib.mjs';

const children = new Set();
let stopping = false;

function prefixOutput(stream, destination, label) {
  let lineStart = true;
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    // Imprime también fragmentos sin salto de línea para no ocultar prompts.
    for (const part of chunk.match(/[^\n]*\n|[^\n]+$/g) || []) {
      destination.write(`${lineStart ? `[${label}] ` : ''}${part}`);
      lineStart = part.endsWith('\n');
    }
  });
}

function start(folder, script, interactive = false) {
  const command = npmCommand(['run', script]);
  const child = spawn(command.command, command.args, {
    cwd: resolve(root, folder),
    env: process.env,
    detached: process.platform !== 'win32',
    stdio: [interactive ? 'inherit' : 'ignore', 'pipe', 'pipe'],
  });
  children.add(child);
  prefixOutput(child.stdout, process.stdout, folder);
  prefixOutput(child.stderr, process.stderr, folder);
  child.on('error', (error) => {
    console.error(`[${folder}] ${error.message}`);
    void stop(1);
  });
  child.on('exit', (code, signal) => {
    // Conserva el PID hasta el cierre conjunto para alcanzar su grupo de
    // procesos en Unix aunque npm haya terminado antes que un descendiente.
    if (!stopping) {
      console.error(`[${folder}] El proceso terminó (${signal || code}).`);
      void stop(code === 0 ? 0 : 1);
    }
  });
  return child;
}

function terminate(child) {
  if (!child.pid) return Promise.resolve();
  if (process.platform === 'win32') {
    return new Promise((done) => {
      // /T solicita el cierre del árbol, incluidos Metro/tsx iniciados por npm.
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      killer.once('error', done);
      killer.once('exit', done);
    });
  }
  return new Promise((done) => {
    let timer;
    const finish = () => { clearTimeout(timer); done(); };
    if (child.exitCode === null && child.signalCode === null) child.once('exit', finish);
    try { process.kill(-child.pid, 'SIGTERM'); } catch { finish(); return; }
    timer = setTimeout(() => {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { /* ya terminó */ }
      done();
    }, 4000);
  });
}

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  await Promise.all([...children].map(terminate));
  process.exit(code);
}

process.on('SIGINT', () => void stop(0));
process.on('SIGTERM', () => void stop(0));

async function waitForBackend(port) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline && !stopping) {
    try {
      const result = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) });
      if (result.ok) {
        const body = await result.json();
        if (body.ok && body.databaseMode) return;
      }
    } catch { /* Arranque de PGlite o compilación inicial. */ }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`El backend no respondió en el puerto ${port}. Revisa los mensajes anteriores y backend/.env.`);
}

try {
  requireNode();
  assertDependencies();
  const platform = process.argv[2] || 'web';
  if (!['web', 'android'].includes(platform)) throw new Error('Plataforma desconocida. Usa web o android.');
  const port = readBackendPort();
  console.log('CuidaTuAuto · Ctrl+C detiene ambos procesos.');
  start('backend', 'dev');
  await waitForBackend(port);
  if (!stopping) {
    console.log(`API lista en http://localhost:${port}. Iniciando ${platform}…`);
    start('frontend', platform, true);
  }
} catch (error) {
  console.error(error.message);
  await stop(1);
}
