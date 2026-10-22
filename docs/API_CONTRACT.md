# CuidaTuAuto · contrato de integración v1

Alcance: prototipo académico Android/web con Expo, API Express y SQL PostgreSQL.
Modo inicial: PGlite persistente en disco; modo externo: `DATABASE_URL` PostgreSQL.
Este contrato coordina frontend y backend. JSON camelCase. API bajo `/api`.

## Modelos

- `User`: `{id,name,email,role:'owner'|'caretaker'}`.
- `Vehicle`: `{id,ownerId,plate,brand,model,color,createdAt}`.
- `Custody`: `{id,ownerId,caretakerId,vehicleId,code,qrPayload,status,locationLabel,latitude,longitude,locationSource,roundIntervalMinutes,createdAt,startedAt,endedAt,closeOutcome,closeNote,vehicle,ownerName,caretakerName,rounds,evidence}`.
- `status`: `pending`, `active`, `awaiting_confirmation`, `closed`, `cancelled`.
- `locationSource`: `manual`, `device`, `demo`. Latitud/longitud pueden ser null.
- `Round`: `{id,custodyId,caretakerId,status:'ok'|'incident',note,latitude,longitude,locationSource,createdAt}`.
- `Evidence`: `{id,custodyId,roundId,phase:'initial'|'round'|'final',position,note,source:'upload'|'camera'|'demo',imageData,createdAt}`. `imageData` es data URL PNG/JPEG/WebP. Fotos pequeñas del prototipo se guardan en SQL; máximo 2 MiB binarios por foto. Se documenta el límite y futura migración a almacenamiento de objetos.
- `qrPayload`: `cuidatuauto:v1:<code>`; código aleatorio por custodia, no ID predecible. Solo participantes ven detalles.

## Respuestas

Errores HTTP: `{error:{code,message,details?}}`. Auth: `Authorization: Bearer <token>`.
Fechas ISO UTC, presentación en hora local. Los listados devuelven evidencia/rounds (o arrays vacíos si lista ligera); detalle siempre completo. Listado solo registros autorizados.

## Rutas

- `GET /health` -> `{ok:true,databaseMode:'pglite'|'postgres',demoMode:boolean}` (ruta fuera de `/api`).
- `POST /api/auth/login` `{email,password}` -> `{token,user}`.
- `POST /api/auth/register` `{name,email,password,role}` -> `{token,user}`. Password >=8.
- `GET /api/auth/me` -> `{user}`.
- `GET /api/vehicles` -> `{vehicles:Vehicle[]}`; propietario solo los propios.
- `POST /api/vehicles` `{plate,brand,model,color}` -> `{vehicle}`; owner.
- `PATCH /api/vehicles/:id` mismos campos -> `{vehicle}`; owner propio.
- `DELETE /api/vehicles/:id` -> `{ok:true}`; solo si sin custodias. UI explica historial.
- `GET /api/custodies` -> `{custodies:Custody[]}`; propietario propias, cuidador asignadas.
- `POST /api/custodies` `{vehicleId,locationLabel,roundIntervalMinutes,latitude?,longitude?,locationSource?}` -> `{custody}`. owner, vehículo propio, una custodia abierta por vehículo.
- `GET /api/custodies/:id` -> `{custody}`; participante autorizado.
- `POST /api/custodies/accept` `{code}` -> `{custody}`. caretaker, admite código o payload QR. Requiere 4 evidencias iniciales. Asignación atómica; no reutilizar código de custodia ya asignada.
- `POST /api/custodies/:id/evidence` `{phase:'initial'|'final',imageData,source:'upload'|'camera',position?,note?}` -> `{custody}`. Inicial: propietario en pending. Final: cuidador asignado en active. Máximo 8 por fase; requiere 4 para continuar. Evidencia es inmutable en esta fase.
- `POST /api/custodies/:id/demo-evidence` `{phase:'initial'|'final'}` -> `{custody}`. Solo `DEMO_MODE=true`. Añade hasta 4 imágenes de prueba de assets. Mismos permisos/estado. Source demo explícito.
- `POST /api/custodies/:id/rounds` `{status:'ok'|'incident',note,latitude?,longitude?,locationSource?,imageData?,source?:'camera'|'upload',useDemoImage?:boolean}` -> `{custody}`. caretaker asignado active; una foto requerida o useDemoImage true solo demo. Incidencia requiere nota. Inserta ronda+evidencia en transacción.
- `POST /api/custodies/:id/request-close` `{}` -> `{custody}`. caretaker active, requiere 4 fotos finales; estado awaiting_confirmation.
- `POST /api/custodies/:id/close` `{outcome:'conforme'|'observacion',note?}` -> `{custody}`. owner awaiting_confirmation. Observación requiere nota. Estado closed; endedAt.
- `POST /api/custodies/:id/cancel` `{}` -> `{custody}`. owner pending.

## Datos iniciales

Seed idempotente, solo modo DEMO_MODE=true. Cuentas `propietario@demo.com`, `cuidador@demo.com`, contraseña `Demo2026!`. Nombres: Ana Torres y Luis Mendoza. Vehículo Toyota Corolla gris placa DEM-001, pertenece a Ana. No crear custodias automáticamente: la exposición inicia una nueva.

## Reglas de implementación

Frontend maneja estados y errores de API, loading/empty, no finge éxito. Backend comprueba roles, pertenencia, transiciones, MIME/tamaño y consultas parametrizadas. POSTs bloquean doble toque en UI. JWT secret privado aleatorio local; sin credenciales reales en ZIP.

UI en español; fase demostración con fotos y coordenadas de prueba claramente marcadas. QR funcional generado y lectura opcional con expo-camera; entrada manual disponible con la misma validación. Ubicación una lectura bajo demanda, sin segundo plano. Sin pagos, chat, push remoto, geocercas ni panel admin completo en fase inicial.
