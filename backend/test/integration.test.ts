import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createApp } from '../src/app.js';
import { openDatabase, migrate, type Database } from '../src/db.js';
import { seedDemo } from '../src/seed.js';
import { backendRoot, type Config } from '../src/config.js';

test('API integrada: flujo de custodia, permisos, concurrencia y persistencia', {timeout:120_000}, async t => {
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'cuidatuauto-api-test-'));
  const config: Config={port:0,host:'127.0.0.1',databaseMode:'pglite',databaseSsl:false,
    dataDir,demoMode:true,jwtSecret:randomBytes(48).toString('hex'),corsOrigins:['http://localhost:8081'],assetsDir:path.join(backendRoot,'assets')};
  let db:Database|undefined, server:Server|undefined, base='';
  async function start() {
    db=await openDatabase(config); await migrate(db); await seedDemo(db);
    server=createApp(db,config).listen(0,'127.0.0.1'); await once(server,'listening');
    const address=server.address(); assert.ok(address&&typeof address==='object'); base=`http://127.0.0.1:${address.port}`;
  }
  async function stop() {
    if(server) { const closed=once(server,'close'); server.close(); server.closeAllConnections(); await closed; server=undefined; }
    if(db) {await db.close(); db=undefined;}
  }
  t.after(async()=>{await stop();await rm(dataDir,{recursive:true,force:true});});
  await start();
  async function req(route:string,method='GET',body?:unknown,token?:string) {
    const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,body:await response.json() as any};
  }
  async function login(email:string) { const r=await req('/api/auth/login','POST',{email,password:'Demo2026!'});assert.equal(r.status,200,JSON.stringify(r));return r.body; }
  let owner:any,care:any,otherOwner:any,otherCare:any;
  let vehicle:any,custody:any,winner:any,loser:any;

  await t.test('salud, seed idempotente y contraseñas verificadas',async()=>{
    assert.equal((await req('/health')).body.databaseMode,'pglite');
    await seedDemo(db!);
    assert.equal(Number((await db!.query('SELECT count(*) AS count FROM users')).rows[0].count),2);
    const bad=await req('/api/auth/login','POST',{email:'propietario@demo.com',password:'incorrecta'});assert.equal(bad.status,401);
    owner=await login('propietario@demo.com'); care=await login('cuidador@demo.com');
    assert.equal(owner.user.role,'owner');assert.equal(care.user.role,'caretaker');assert.ok(!('passwordHash' in owner.user));
    const registration=await req('/api/auth/register','POST',{name:'Otro propietario',email:'otro@demo.com',password:'OtraClave2026!',role:'owner'});
    assert.equal(registration.status,201);otherOwner=registration.body;
    const registration2=await req('/api/auth/register','POST',{name:'Otro cuidador',email:'otro.cuidador@demo.com',password:'OtraClave2026!',role:'caretaker'});
    assert.equal(registration2.status,201);otherCare=registration2.body;
    assert.equal((await req('/api/auth/register','POST',{name:'Duplicado',email:'OTRO@demo.com',password:'OtraClave2026!',role:'owner'})).status,409);
    assert.equal((await req('/api/auth/register','POST',{name:'Administrador',email:'admin@demo.com',password:'OtraClave2026!',role:'admin'})).status,400);
    assert.equal((await req('/api/auth/register','POST',{name:'Unicode',email:'unicode@demo.com',password:'á'.repeat(37),role:'owner'})).status,400);
  });
  await t.test('autorización y vehículos únicos',async()=>{
    assert.equal((await req('/api/vehicles')).status,401);
    assert.equal((await req('/api/vehicles','GET',undefined,'invalid')).status,401);
    assert.equal((await req('/api/vehicles','POST',{plate:'ABC-123',brand:'Marca',model:'Modelo',color:'Azul'},care.token)).status,403);
    const list=await req('/api/vehicles','GET',undefined,owner.token);assert.equal(list.status,200);assert.equal(list.body.vehicles.length,1);vehicle=list.body.vehicles[0];
    assert.equal((await req('/api/vehicles','GET',undefined,otherOwner.token)).body.vehicles.length,0);
    const duplicate=await req('/api/vehicles','POST',{plate:vehicle.plate.toLowerCase(),brand:'Toyota',model:'Otro',color:'Rojo'},owner.token);assert.equal(duplicate.status,409);
    const create=await req('/api/vehicles','POST',{plate:'NEW-123',brand:'Kia',model:'Rio',color:'Blanco'},owner.token);assert.equal(create.status,201);
    const id=create.body.vehicle.id;
    assert.equal((await req(`/api/vehicles/${id}`,'PATCH',{plate:'NEW-123',brand:'Kia',model:'Rio',color:'Gris'},owner.token)).body.vehicle.color,'Gris');
    assert.equal((await req(`/api/vehicles/${id}`,'DELETE',undefined,otherOwner.token)).status,404);
    assert.equal((await req(`/api/vehicles/${id}`,'DELETE',undefined,owner.token)).status,200);
  });
  await t.test('crear custodia y proteger datos de otros usuarios',async()=>{
    const payload={vehicleId:vehicle.id,locationLabel:'Estacionamiento de demostración',roundIntervalMinutes:20,latitude:-12.0464,longitude:-77.0428,locationSource:'demo'};
    const r=await req('/api/custodies','POST',payload,owner.token);assert.equal(r.status,201,JSON.stringify(r));custody=r.body.custody;
    assert.equal(custody.status,'pending');assert.equal(custody.vehicle.id,vehicle.id);assert.ok(custody.qrPayload.startsWith('cuidatuauto:v1:'));
    assert.equal((await req('/api/custodies','POST',payload,owner.token)).status,409);
    assert.equal((await req(`/api/custodies/${custody.id}`,'GET',undefined,otherOwner.token)).status,404);
    assert.equal((await req(`/api/custodies/${custody.id}`,'GET',undefined,care.token)).status,404);
    assert.equal((await req('/api/custodies','POST',payload,otherOwner.token)).status,404);
    assert.equal((await req(`/api/vehicles/${vehicle.id}`,'PATCH',{plate:vehicle.plate,brand:'X',model:'X',color:'X'},owner.token)).status,409);
  });
  await t.test('evidencias válidas, requisito de cuatro y demo idempotente',async()=>{
    assert.equal((await req('/api/custodies/accept','POST',{code:custody.code},care.token)).status,409);
    const bad=await req(`/api/custodies/${custody.id}/evidence`,'POST',{phase:'initial',source:'upload',imageData:'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='},owner.token);assert.equal(bad.status,400);
    assert.equal((await req(`/api/custodies/${custody.id}/evidence`,'POST',{phase:'initial',source:'upload',imageData:'data:image/png;base64,aGVsbG8='},owner.token)).status,400);
    const initial=await req(`/api/custodies/${custody.id}/demo-evidence`,'POST',{phase:'initial'},owner.token);assert.equal(initial.status,200,JSON.stringify(initial));assert.equal(initial.body.custody.evidence.length,4);
    assert.ok(initial.body.custody.evidence.every((e:any)=>e.source==='demo'&&e.imageData.startsWith('data:image/png;base64,')));
    assert.equal((await req(`/api/custodies/${custody.id}/demo-evidence`,'POST',{phase:'initial'},owner.token)).body.custody.evidence.length,4);
  });
  await t.test('aceptación atómica: un único cuidador gana, QR y código comparten validación',async()=>{
    const responses=await Promise.all([
      req('/api/custodies/accept','POST',{code:custody.qrPayload},care.token),
      req('/api/custodies/accept','POST',{code:custody.code.toLowerCase()},otherCare.token),
    ]);
    assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
    winner=responses[0].status===200?care:otherCare; loser=responses[0].status===200?otherCare:care;
    const detail=await req(`/api/custodies/${custody.id}`,'GET',undefined,winner.token);assert.equal(detail.status,200);assert.equal(detail.body.custody.caretakerId,winner.user.id);assert.equal(detail.body.custody.status,'active');
    assert.equal((await req(`/api/custodies/${custody.id}`,'GET',undefined,loser.token)).status,404);
    assert.equal((await req('/api/custodies/accept','POST',{code:custody.code},winner.token)).status,409);
  });
  await t.test('rondas con foto, incidencia obligatoria y roles',async()=>{
    const payload={status:'incident',note:'Ejemplo de observación de prueba.',useDemoImage:true,latitude:-12.0464,longitude:-77.0428,locationSource:'demo'};
    assert.equal((await req(`/api/custodies/${custody.id}/rounds`,'POST',payload,owner.token)).status,403);
    assert.equal((await req(`/api/custodies/${custody.id}/rounds`,'POST',payload,loser.token)).status,404);
    assert.equal((await req(`/api/custodies/${custody.id}/rounds`,'POST',{status:'incident',note:'',useDemoImage:true},winner.token)).status,400);
    assert.equal((await req(`/api/custodies/${custody.id}/rounds`,'POST',{status:'ok',note:'Sin foto'},winner.token)).status,400);
    const r=await req(`/api/custodies/${custody.id}/rounds`,'POST',payload,winner.token);assert.equal(r.status,201,JSON.stringify(r));assert.equal(r.body.custody.rounds.length,1);assert.equal(r.body.custody.evidence.length,5);
    assert.equal(r.body.custody.evidence.find((e:any)=>e.phase==='round').roundId,r.body.custody.rounds[0].id);
    assert.equal((await req(`/api/custodies/${custody.id}/demo-evidence`,'POST',{phase:'initial'},owner.token)).status,409);
  });
  await t.test('cierre con cuatro imágenes finales y confirmación del propietario',async()=>{
    assert.equal((await req(`/api/custodies/${custody.id}/request-close`,'POST',{},winner.token)).status,409);
    assert.equal((await req(`/api/custodies/${custody.id}/demo-evidence`,'POST',{phase:'final'},owner.token)).status,403);
    const finals=await req(`/api/custodies/${custody.id}/demo-evidence`,'POST',{phase:'final'},winner.token);assert.equal(finals.status,200);assert.equal(finals.body.custody.evidence.filter((e:any)=>e.phase==='final').length,4);
    const requested=await req(`/api/custodies/${custody.id}/request-close`,'POST',{},winner.token);assert.equal(requested.status,200);assert.equal(requested.body.custody.status,'awaiting_confirmation');
    assert.equal((await req(`/api/custodies/${custody.id}/close`,'POST',{outcome:'conforme'},winner.token)).status,403);
    assert.equal((await req(`/api/custodies/${custody.id}/close`,'POST',{outcome:'observacion'},owner.token)).status,400);
    const closed=await req(`/api/custodies/${custody.id}/close`,'POST',{outcome:'observacion',note:'Observación de demostración revisada.'},owner.token);assert.equal(closed.status,200);assert.equal(closed.body.custody.status,'closed');assert.ok(closed.body.custody.endedAt);assert.equal(closed.body.custody.closeOutcome,'observacion');
    assert.equal((await req(`/api/custodies/${custody.id}/rounds`,'POST',{status:'ok',note:'Tardía',useDemoImage:true},winner.token)).status,409);
    assert.equal((await req(`/api/vehicles/${vehicle.id}`,'DELETE',undefined,owner.token)).status,409);
  });
  await t.test('historial autorizado y nueva custodia cancelable',async()=>{
    const listed=await req('/api/custodies','GET',undefined,owner.token);assert.equal(listed.body.custodies.length,1);assert.equal(listed.body.custodies[0].roundCount,1);
    assert.equal((await req('/api/custodies','GET',undefined,otherOwner.token)).body.custodies.length,0);
    const fresh=await req('/api/custodies','POST',{vehicleId:vehicle.id,locationLabel:'Nueva sesión',roundIntervalMinutes:20},owner.token);assert.equal(fresh.status,201);
    assert.equal((await req(`/api/custodies/${fresh.body.custody.id}/cancel`,'POST',{},owner.token)).body.custody.status,'cancelled');
  });
  await t.test('editar un vehículo no cambia los datos históricos de la custodia',async()=>{
    const update=await req(`/api/vehicles/${vehicle.id}`,'PATCH',{plate:vehicle.plate,brand:vehicle.brand,model:vehicle.model,color:'Negro'},owner.token);
    assert.equal(update.status,200);assert.equal(update.body.vehicle.color,'Negro');
    const old=await req(`/api/custodies/${custody.id}`,'GET',undefined,owner.token);
    assert.equal(old.body.custody.vehicle.color,'Gris');assert.equal(old.body.custody.vehicle.plate,'DEM-001');
  });
  await t.test('persistencia después de cerrar y reabrir base y servidor',async()=>{
    await stop();await start();
    const r=await req(`/api/custodies/${custody.id}`,'GET',undefined,owner.token);assert.equal(r.status,200,JSON.stringify(r));
    assert.equal(r.body.custody.status,'closed');assert.equal(r.body.custody.rounds.length,1);assert.equal(r.body.custody.evidence.length,9);assert.equal(r.body.custody.closeNote,'Observación de demostración revisada.');
    assert.equal(Number((await db!.query('SELECT count(*) AS count FROM users')).rows[0].count),4);
  });
  await t.test('CORS y autenticación no permiten un origen web desconocido',async()=>{
    const response=await fetch(base+'/health',{headers:{Origin:'https://no-autorizado.example'}});assert.equal(response.status,403);
    const ok=await fetch(base+'/health',{headers:{Origin:'http://localhost:8081'}});assert.equal(ok.headers.get('access-control-allow-origin'),'http://localhost:8081');
  });
});
