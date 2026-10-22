import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Database } from './db.js';

export async function seedDemo(db: Database): Promise<void> {
  await db.transaction(async tx => {
    const passwordHash = await bcrypt.hash('Demo2026!', 12);
    for (const [name, email, role] of [
      ['Ana Torres', 'propietario@demo.com', 'owner'],
      ['Luis Mendoza', 'cuidador@demo.com', 'caretaker'],
    ]) await tx.query('INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) ON CONFLICT(email) DO NOTHING', [randomUUID(), name, email, passwordHash, role]);
    const owner = (await tx.query('SELECT id FROM users WHERE email=$1 AND role=$2', ['propietario@demo.com', 'owner'])).rows[0];
    if (owner) await tx.query('INSERT INTO vehicles(id,owner_id,plate,brand,model,color) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(plate) DO NOTHING', [randomUUID(), owner.id, 'DEM-001', 'Toyota', 'Corolla', 'Gris']);
  });
}
