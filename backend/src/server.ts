import { loadConfig } from './config.js';
import { openDatabase, migrate } from './db.js';
import { seedDemo } from './seed.js';
import { createApp } from './app.js';

async function main() {
  const config=await loadConfig();
  const db=await openDatabase(config);
  await migrate(db);
  if(config.demoMode) await seedDemo(db);
  const app=createApp(db,config);
  const server=app.listen(config.port,config.host,()=>{
    console.log(`CuidaTuAuto API: http://localhost:${config.port}`);
    console.log(`Persistencia: ${config.databaseMode}; modo demostración: ${config.demoMode?'activado':'desactivado'}.`);
    if(config.demoMode) console.log('Cuentas de demostración disponibles. Consulta README.md.');
  });
  server.on('error',error=>{ console.error('No se pudo iniciar la API:',error.message); void db.close().finally(()=>process.exit(1)); });
  let stopping=false;
  const stop=()=>{
    if(stopping) return; stopping=true;
    server.close(()=>{ void db.close().then(()=>process.exit(0)); });
    server.closeIdleConnections();
    setTimeout(()=>process.exit(1),10_000).unref();
  };
  process.once('SIGTERM',stop); process.once('SIGINT',stop);
}
main().catch(error=>{ console.error('No se pudo iniciar CuidaTuAuto:',error.message); process.exit(1); });
