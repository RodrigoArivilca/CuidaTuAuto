import { loadConfig } from './config.js';
import { openDatabase,migrate } from './db.js';
import { seedDemo } from './seed.js';

const command=process.argv[2];
if(!['migrate','seed'].includes(command)) { console.error('Usa npm run migrate o npm run seed.'); process.exit(1); }
const config=await loadConfig();
if(command==='seed'&&!config.demoMode) { console.error('El seed de demostración requiere DEMO_MODE=true.'); process.exit(1); }
const db=await openDatabase(config);
try {
  await migrate(db);
  if(command==='seed') await seedDemo(db);
  console.log(command==='seed'?'Datos de demostración disponibles (seed idempotente).':'Esquema SQL actualizado.');
} finally { await db.close(); }
