import { requireNode, runNpm } from './lib.mjs';

const tasks = {
  backend: [['backend', 'dev']],
  web: [['frontend', 'web']],
  android: [['frontend', 'android']],
  check: [['backend', 'typecheck'], ['frontend', 'typecheck']],
  test: [['backend', 'test']],
  build: [['backend', 'build'], ['frontend', 'build:web']],
  migrate: [['backend', 'migrate']],
  seed: [['backend', 'seed']],
};

try {
  requireNode();
  const task = tasks[process.argv[2]];
  if (!task) throw new Error(`Tarea desconocida. Opciones: ${Object.keys(tasks).join(', ')}`);
  for (const [folder, script] of task) await runNpm(folder, ['run', script]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
