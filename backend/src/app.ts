import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Config } from './config.js';
import type { Database, Sql } from './db.js';

type User = { id: string; name: string; email: string; role: 'owner' | 'caretaker' };
declare global { namespace Express { interface Request { authUser?: User } } }
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
const fail = (status: number, code: string, message: string): never => { throw new ApiError(status, code, message); };
const uuid = z.string().uuid();
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const locationSchema = {
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  locationSource: z.enum(['manual', 'device', 'demo']).default('manual'),
};
const vehicleSchema = z.object({
  plate: text(3, 12).regex(/^[A-Za-z0-9 -]+$/, 'La placa admite letras, números y guiones.').transform(p => p.toUpperCase().replace(/\s/g, '')),
  brand: text(1, 60), model: text(1, 60), color: text(1, 40),
});
const newCustodySchema = z.object({
  vehicleId: uuid, locationLabel: text(2, 160),
  roundIntervalMinutes: z.number().int().min(1).max(240).default(20), ...locationSchema,
});
const photoSchema = z.object({
  phase: z.enum(['initial', 'final']), imageData: z.string().max(2_800_000),
  source: z.enum(['upload', 'camera']), position: text(0, 40).default(''), note: text(0, 500).default(''),
});
const roundSchema = z.object({
  status: z.enum(['ok', 'incident']), note: text(0, 1000).default(''), ...locationSchema,
  imageData: z.string().max(2_800_000).optional(), source: z.enum(['upload', 'camera']).optional(),
  useDemoImage: z.boolean().default(false),
});

function camel(row: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
    value instanceof Date ? value.toISOString() : value,
  ]));
}
function userSafe(row: Record<string, any>): User {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}
function current(req: Request): User {
  if (!req.authUser) return fail(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.');
  return req.authUser;
}
function role(req: Request, expected: User['role']): User {
  const user = current(req);
  if (user.role !== expected) fail(403, 'FORBIDDEN', expected === 'owner' ? 'Esta acción corresponde al propietario.' : 'Esta acción corresponde al cuidador.');
  return user;
}
function routeId(req: Request): string { return uuid.parse(req.params.id); }
function checkCoordinates(value: {latitude?: number | null; longitude?: number | null; locationSource: string}, config: Config) {
  const hasLat = value.latitude != null, hasLng = value.longitude != null;
  if (hasLat !== hasLng) fail(400, 'INVALID_LOCATION', 'Indica latitud y longitud juntas.');
  if (value.locationSource !== 'manual' && !hasLat) fail(400, 'INVALID_LOCATION', 'Esta ubicación necesita latitud y longitud.');
  if (value.locationSource === 'demo' && !config.demoMode) fail(403, 'DEMO_DISABLED', 'Las ubicaciones de prueba están desactivadas.');
}
function checkImage(data: string): void {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match || match[2].length % 4 !== 0) fail(400, 'INVALID_IMAGE', 'Adjunta una imagen PNG, JPEG o WebP válida.');
  const bytes = Buffer.from(match![2], 'base64');
  if (bytes.length > 2 * 1024 * 1024) fail(413, 'IMAGE_TOO_LARGE', 'Cada fotografía debe pesar como máximo 2 MiB.');
  const format = match![1];
  const isPng = bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const isJpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const isWebp = bytes.length >= 16 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!(format === 'png' && isPng || format === 'jpeg' && isJpeg || format === 'webp' && isWebp)) fail(400, 'INVALID_IMAGE', 'El contenido no coincide con el formato de la imagen.');
}
async function lockCustody(tx: Sql, id: string, user: User) {
  const row = (await tx.query('SELECT * FROM custodies WHERE id=$1 FOR UPDATE', [id])).rows[0];
  if (!row || row.owner_id !== user.id && row.caretaker_id !== user.id) return fail(404, 'NOT_FOUND', 'No se encontró la custodia.');
  return row;
}
function requireStatus(row: Record<string, any>, status: string) {
  if (row.status !== status) fail(409, 'INVALID_STATE', 'La custodia cambió de estado. Actualiza la pantalla para continuar.');
}
function checkPhotoPermission(row: Record<string, any>, user: User, phase: string) {
  if (phase === 'initial') {
    if (user.role !== 'owner' || row.owner_id !== user.id) fail(403, 'FORBIDDEN', 'Las evidencias iniciales las registra el propietario.');
    requireStatus(row, 'pending');
  } else {
    if (user.role !== 'caretaker' || row.caretaker_id !== user.id) fail(403, 'FORBIDDEN', 'Las evidencias finales las registra el cuidador asignado.');
    requireStatus(row, 'active');
  }
}
async function photoCount(tx: Sql, custodyId: string, phase: string): Promise<number> {
  return Number((await tx.query('SELECT COUNT(*) AS count FROM evidence WHERE custody_id=$1 AND phase=$2', [custodyId, phase])).rows[0].count);
}
async function insertPhoto(tx: Sql, value: { custodyId: string; roundId?: string; phase: string; position?: string; note?: string; source: string; imageData: string }) {
  checkImage(value.imageData);
  await tx.query('INSERT INTO evidence(id,custody_id,round_id,phase,position,note,source,image_data) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
    [randomUUID(), value.custodyId, value.roundId || null, value.phase, value.position || '', value.note || '', value.source, value.imageData]);
}
async function demoPhoto(config: Config, angle: string): Promise<string> {
  const bytes = await readFile(path.join(config.assetsDir, `demo-${angle}.png`));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}
const custodySelect = `SELECT c.*, o.name AS owner_name, t.name AS caretaker_name
  FROM custodies c JOIN users o ON o.id=c.owner_id LEFT JOIN users t ON t.id=c.caretaker_id`;
async function enrichCustody(db: Sql, row: Record<string, any>, detail: boolean) {
  const result = camel(row);
  result.qrPayload = `cuidatuauto:v1:${row.code}`;
  result.vehicle = row.vehicle_snapshot;
  delete result.vehicleSnapshot;
  if (detail) {
    result.rounds = (await db.query('SELECT * FROM rounds WHERE custody_id=$1 ORDER BY created_at,id', [row.id])).rows.map(camel);
    result.evidence = (await db.query('SELECT * FROM evidence WHERE custody_id=$1 ORDER BY created_at,id', [row.id])).rows.map(camel);
  } else {
    result.rounds = []; result.evidence = [];
    result.roundCount = Number((await db.query('SELECT count(*) AS count FROM rounds WHERE custody_id=$1', [row.id])).rows[0].count);
    result.initialEvidenceCount = await photoCount(db, row.id, 'initial');
    result.finalEvidenceCount = await photoCount(db, row.id, 'final');
  }
  return result;
}
async function custodyDetail(db: Sql, id: string, user: User) {
  const row = (await db.query(`${custodySelect} WHERE c.id=$1`, [id])).rows[0];
  if (!row || row.owner_id !== user.id && row.caretaker_id !== user.id) return fail(404, 'NOT_FOUND', 'No se encontró la custodia.');
  return enrichCustody(db, row, true);
}

export function createApp(db: Database, config: Config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin(origin, callback) {
    if (!origin || config.corsOrigins.includes(origin)) callback(null, true);
    else callback(new ApiError(403, 'CORS_ORIGIN', 'Origen web no autorizado. Revisa CORS_ORIGINS en el backend.'));
  }}));
  app.use(express.json({ limit: '4mb' }));
  app.get('/health', async (_req, res) => {
    await db.query('SELECT 1'); res.json({ ok: true, databaseMode: config.databaseMode, demoMode: config.demoMode });
  });
  const authLimiter = rateLimit({ windowMs: 60_000, limit: 40, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: { code: 'RATE_LIMIT', message: 'Demasiados intentos. Espera un minuto y vuelve a intentar.' } } });
  const issueToken = (user: User) => jwt.sign({}, config.jwtSecret, { algorithm: 'HS256', subject: user.id, issuer: 'cuidatuauto', audience: 'cuidatuauto-app', expiresIn: '12h' });
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    const data = z.object({ name: text(2,100), email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
      password: z.string().min(8).max(72).refine(value => Buffer.byteLength(value,'utf8') <= 72, 'La contraseña debe ocupar como máximo 72 bytes UTF-8.'), role: z.enum(['owner','caretaker']) }).parse(req.body);
    const hash = await bcrypt.hash(data.password, 12);
    const inserted = await db.query('INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role',
      [randomUUID(), data.name, data.email, hash, data.role]);
    const user = userSafe(inserted.rows[0]); res.status(201).json({ token: issueToken(user), user });
  });
  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const data = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(72).refine(value => Buffer.byteLength(value,'utf8') <= 72, 'La contraseña debe ocupar como máximo 72 bytes UTF-8.') }).parse(req.body);
    const row = (await db.query('SELECT * FROM users WHERE email=$1', [data.email])).rows[0];
    if (!row || !await bcrypt.compare(data.password, row.password_hash)) fail(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
    const user = userSafe(row); res.json({ token: issueToken(user), user });
  });
  app.use('/api', async (req, _res, next) => {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
    if (!match) return next(new ApiError(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.'));
    try {
      const payload = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'], issuer: 'cuidatuauto', audience: 'cuidatuauto-app' });
      if (typeof payload === 'string' || typeof payload.sub !== 'string' || !uuid.safeParse(payload.sub).success) return next(new ApiError(401, 'UNAUTHORIZED', 'Tu sesión no es válida.'));
      const row = (await db.query('SELECT id,name,email,role FROM users WHERE id=$1', [payload.sub])).rows[0];
      if (!row) return next(new ApiError(401, 'UNAUTHORIZED', 'Tu sesión ya no está disponible.'));
      req.authUser = userSafe(row); next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) next(new ApiError(401, 'UNAUTHORIZED', 'Tu sesión venció. Vuelve a ingresar.'));
      else next(error);
    }
  });
  app.get('/api/auth/me', (req, res) => { res.json({ user: current(req) }); });
  app.get('/api/vehicles', async (req, res) => {
    const user = current(req);
    const rows = user.role === 'owner' ? (await db.query('SELECT * FROM vehicles WHERE owner_id=$1 ORDER BY created_at DESC', [user.id])).rows : [];
    res.json({ vehicles: rows.map(camel) });
  });
  app.post('/api/vehicles', async (req, res) => {
    const user = role(req, 'owner'), data = vehicleSchema.parse(req.body);
    const row = (await db.query('INSERT INTO vehicles(id,owner_id,plate,brand,model,color) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [randomUUID(), user.id, data.plate, data.brand, data.model, data.color])).rows[0];
    res.status(201).json({ vehicle: camel(row) });
  });
  app.patch('/api/vehicles/:id', async (req, res) => {
    const user = role(req, 'owner'), id = routeId(req), data = vehicleSchema.parse(req.body);
    const row = await db.transaction(async tx => {
      const vehicle = (await tx.query('SELECT * FROM vehicles WHERE id=$1 AND owner_id=$2 FOR UPDATE', [id, user.id])).rows[0];
      if (!vehicle) fail(404, 'NOT_FOUND', 'No se encontró el vehículo.');
      const existing = (await tx.query("SELECT id FROM custodies WHERE vehicle_id=$1 AND status IN ('pending','active','awaiting_confirmation')", [id])).rows;
      if (existing.length) fail(409, 'VEHICLE_IN_CUSTODY', 'Finaliza o cancela la custodia antes de editar el vehículo.');
      return (await tx.query('UPDATE vehicles SET plate=$1,brand=$2,model=$3,color=$4 WHERE id=$5 RETURNING *', [data.plate,data.brand,data.model,data.color,id])).rows[0];
    });
    res.json({ vehicle: camel(row) });
  });
  app.delete('/api/vehicles/:id', async (req, res) => {
    const user = role(req, 'owner'), id = routeId(req);
    await db.transaction(async tx => {
      const row = (await tx.query('SELECT * FROM vehicles WHERE id=$1 AND owner_id=$2 FOR UPDATE', [id,user.id])).rows[0];
      if (!row) fail(404,'NOT_FOUND','No se encontró el vehículo.');
      const linked = (await tx.query('SELECT id FROM custodies WHERE vehicle_id=$1 LIMIT 1', [id])).rows;
      if (linked.length) fail(409, 'HAS_HISTORY', 'Este vehículo tiene historial y no puede eliminarse.');
      await tx.query('DELETE FROM vehicles WHERE id=$1', [id]);
    });
    res.json({ ok: true });
  });
  app.get('/api/custodies', async (req, res) => {
    const user = current(req);
    const rows = (await db.query(`${custodySelect} WHERE c.owner_id=$1 OR c.caretaker_id=$1 ORDER BY c.created_at DESC LIMIT 100`, [user.id])).rows;
    const custodies = [];
    for (const row of rows) custodies.push(await enrichCustody(db, row, false));
    res.json({ custodies });
  });
  app.post('/api/custodies', async (req, res) => {
    const user = role(req, 'owner'), data = newCustodySchema.parse(req.body); checkCoordinates(data, config);
    const id = randomUUID(), code = randomBytes(5).toString('hex').toUpperCase();
    await db.transaction(async tx => {
      const vehicle = (await tx.query('SELECT * FROM vehicles WHERE id=$1 AND owner_id=$2 FOR UPDATE', [data.vehicleId, user.id])).rows[0];
      if (!vehicle) fail(404,'NOT_FOUND','No se encontró el vehículo.');
      await tx.query('INSERT INTO custodies(id,owner_id,vehicle_id,code,location_label,latitude,longitude,location_source,round_interval_minutes,vehicle_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [id,user.id,data.vehicleId,code,data.locationLabel,data.latitude ?? null,data.longitude ?? null,data.locationSource,data.roundIntervalMinutes,JSON.stringify(camel(vehicle))]);
    });
    res.status(201).json({ custody: await custodyDetail(db,id,user) });
  });
  app.post('/api/custodies/accept', async (req, res) => {
    const user = role(req, 'caretaker');
    const raw = text(1,100).parse(req.body?.code);
    const code = raw.replace(/^cuidatuauto:v1:/i, '').trim().toUpperCase();
    if (!/^[A-F0-9]{10}$/.test(code)) fail(400,'INVALID_CODE','El código de custodia no es válido.');
    const id = await db.transaction(async tx => {
      const row = (await tx.query('SELECT * FROM custodies WHERE code=$1 FOR UPDATE', [code])).rows[0];
      if (!row) fail(404,'NOT_FOUND','No se encontró una custodia con ese código.');
      requireStatus(row, 'pending');
      if (await photoCount(tx,row.id,'initial') < 4) fail(409,'MISSING_EVIDENCE','El propietario debe registrar 4 evidencias iniciales.');
      await tx.query("UPDATE custodies SET caretaker_id=$1,status='active',started_at=NOW() WHERE id=$2", [user.id,row.id]);
      return row.id;
    });
    res.json({ custody: await custodyDetail(db,id,user) });
  });
  app.get('/api/custodies/:id', async (req,res) => { res.json({ custody: await custodyDetail(db,routeId(req),current(req)) }); });
  app.post('/api/custodies/:id/evidence', async (req,res) => {
    const user = current(req), id = routeId(req), data = photoSchema.parse(req.body); checkImage(data.imageData);
    await db.transaction(async tx => {
      const row = await lockCustody(tx,id,user); checkPhotoPermission(row,user,data.phase);
      if (await photoCount(tx,id,data.phase) >= 8) fail(409,'PHOTO_LIMIT','Ya hay 8 imágenes en esta fase.');
      await insertPhoto(tx,{ custodyId:id, ...data });
    });
    res.status(201).json({ custody: await custodyDetail(db,id,user) });
  });
  app.post('/api/custodies/:id/demo-evidence', async (req,res) => {
    if (!config.demoMode) fail(403,'DEMO_DISABLED','Las imágenes de prueba están desactivadas.');
    const user = current(req), id = routeId(req), data = z.object({phase:z.enum(['initial','final'])}).parse(req.body);
    const angles = ['front','back','left','right'];
    const photos = await Promise.all(angles.map(angle => demoPhoto(config,angle)));
    await db.transaction(async tx => {
      const row = await lockCustody(tx,id,user); checkPhotoPermission(row,user,data.phase);
      const count = await photoCount(tx,id,data.phase);
      for (let index=count; index<4; index++) await insertPhoto(tx,{ custodyId:id,phase:data.phase,position:angles[index],note:'Ilustración de prueba; no es una fotografía real.',source:'demo',imageData:photos[index] });
    });
    res.json({ custody: await custodyDetail(db,id,user) });
  });
  app.post('/api/custodies/:id/rounds', async (req,res) => {
    const user = role(req,'caretaker'), id = routeId(req), data = roundSchema.parse(req.body); checkCoordinates(data,config);
    if (data.status === 'incident' && !data.note) fail(400,'NOTE_REQUIRED','Describe la incidencia para registrarla.');
    if (data.useDemoImage && !config.demoMode) fail(403,'DEMO_DISABLED','Las imágenes de prueba están desactivadas.');
    if (data.useDemoImage && data.imageData) fail(400,'INVALID_IMAGE','Selecciona una imagen o una evidencia de prueba, no ambas.');
    const imageData = data.useDemoImage ? await demoPhoto(config,'front') : data.imageData;
    if (!imageData || !data.useDemoImage && !data.source) fail(400,'PHOTO_REQUIRED','Adjunta una fotografía a la ronda.');
    checkImage(imageData!);
    await db.transaction(async tx => {
      const row = await lockCustody(tx,id,user); requireStatus(row,'active');
      if (row.caretaker_id !== user.id) fail(403,'FORBIDDEN','Solo el cuidador asignado puede registrar una ronda.');
      const roundId=randomUUID();
      await tx.query('INSERT INTO rounds(id,custody_id,caretaker_id,status,note,latitude,longitude,location_source) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [roundId,id,user.id,data.status,data.note,data.latitude??null,data.longitude??null,data.locationSource]);
      await insertPhoto(tx,{custodyId:id,roundId,phase:'round',note:data.note,source:data.useDemoImage?'demo':data.source!,imageData:imageData!});
    });
    res.status(201).json({ custody: await custodyDetail(db,id,user) });
  });
  app.post('/api/custodies/:id/request-close', async (req,res) => {
    const user=role(req,'caretaker'), id=routeId(req);
    await db.transaction(async tx => {
      const row=await lockCustody(tx,id,user); requireStatus(row,'active');
      if (row.caretaker_id!==user.id) fail(403,'FORBIDDEN','Solo el cuidador asignado puede solicitar el cierre.');
      if (await photoCount(tx,id,'final')<4) fail(409,'MISSING_EVIDENCE','Registra las 4 evidencias finales antes de solicitar el cierre.');
      await tx.query("UPDATE custodies SET status='awaiting_confirmation' WHERE id=$1",[id]);
    });
    res.json({custody:await custodyDetail(db,id,user)});
  });
  app.post('/api/custodies/:id/close', async (req,res) => {
    const user=role(req,'owner'), id=routeId(req), data=z.object({outcome:z.enum(['conforme','observacion']),note:text(0,1000).default('')}).parse(req.body);
    if(data.outcome==='observacion'&&!data.note) fail(400,'NOTE_REQUIRED','Describe la observación antes de cerrar.');
    await db.transaction(async tx=>{
      const row=await lockCustody(tx,id,user); requireStatus(row,'awaiting_confirmation');
      if(row.owner_id!==user.id) fail(403,'FORBIDDEN','Solo el propietario puede confirmar el cierre.');
      await tx.query("UPDATE custodies SET status='closed',ended_at=NOW(),close_outcome=$1,close_note=$2 WHERE id=$3",[data.outcome,data.note,id]);
    });
    res.json({custody:await custodyDetail(db,id,user)});
  });
  app.post('/api/custodies/:id/cancel',async(req,res)=>{
    const user=role(req,'owner'), id=routeId(req);
    await db.transaction(async tx=>{
      const row=await lockCustody(tx,id,user); requireStatus(row,'pending');
      if(row.owner_id!==user.id) fail(403,'FORBIDDEN','Solo el propietario puede cancelar.');
      await tx.query("UPDATE custodies SET status='cancelled',ended_at=NOW() WHERE id=$1",[id]);
    });
    res.json({custody:await custodyDetail(db,id,user)});
  });
  app.use((_req,_res,next)=>next(new ApiError(404,'NOT_FOUND','Ruta no encontrada.')));
  app.use((error:any,_req:Request,res:Response,_next:NextFunction)=>{
    if(error instanceof ApiError) { res.status(error.status).json({error:{code:error.code,message:error.message}}); return; }
    if(error instanceof z.ZodError) { res.status(400).json({error:{code:'VALIDATION_ERROR',message:'Revisa los campos del formulario.',details:error.issues.map(issue=>({field:issue.path.join('.'),message:issue.message}))}}); return; }
    if(error.type==='entity.too.large') { res.status(413).json({error:{code:'BODY_TOO_LARGE',message:'La imagen o solicitud supera el tamaño permitido.'}}); return; }
    if(error instanceof SyntaxError && 'body' in error) { res.status(400).json({error:{code:'INVALID_JSON',message:'El contenido enviado no es JSON válido.'}}); return; }
    if(error.code==='23505') {
      const message = error.constraint==='one_open_custody_per_vehicle' ? 'El vehículo ya tiene una custodia abierta.' : error.constraint==='users_email_key' ? 'Ese correo ya está registrado.' : error.constraint==='vehicles_plate_key' ? 'Esa placa ya está registrada.' : 'El registro ya existe.';
      res.status(409).json({error:{code:'CONFLICT',message}}); return;
    }
    if(error.code==='23503') { res.status(409).json({error:{code:'RELATED_RECORD',message:'El registro tiene información vinculada o dejó de estar disponible.'}}); return; }
    console.error('[API] Error interno:', error?.message || 'error desconocido');
    res.status(500).json({error:{code:'INTERNAL_ERROR',message:'No se pudo completar la operación. Intenta nuevamente.'}});
  });
  return app;
}
