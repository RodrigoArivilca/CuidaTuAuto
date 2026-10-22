import { constants, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireNode, root, runNpm } from './lib.mjs';

try {
  requireNode();
  console.log('CuidaTuAuto · preparación del proyecto');
  console.log('Se descargarán las dependencias. Los archivos .env existentes se conservan.');
  for (const folder of ['backend', 'frontend']) {
    const lock = resolve(root, folder, 'package-lock.json');
    const command = existsSync(lock) ? 'ci' : 'install';
    console.log(`\nPreparando ${folder} con npm ${command}…`);
    await runNpm(folder, [command, '--no-fund']);
    const example = resolve(root, folder, '.env.example');
    const destination = resolve(root, folder, '.env');
    if (!existsSync(destination) && existsSync(example)) {
      copyFileSync(example, destination, constants.COPYFILE_EXCL);
      console.log(`Creado ${folder}/.env desde el ejemplo.`);
    } else if (existsSync(destination)) {
      console.log(`Se conserva ${folder}/.env.`);
    }
  }
  console.log('\nPreparación terminada. Ejecuta npm run dev para abrir backend + web.');
  console.log('Para el emulador Android ya abierto: npm run dev:android.');
} catch (error) {
  console.error(`\nNo se pudo completar la preparación: ${error.message}`);
  console.error('Corrige el error indicado y repite npm run setup. No se han borrado tus datos locales.');
  process.exitCode = 1;
}
