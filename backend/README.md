# Backend de CuidaTuAuto

API REST TypeScript/Express para el prototipo académico. El contrato de rutas está en `../docs/API_CONTRACT.md`.

## Arranque

Desde `backend`, con Node.js 22.12 o superior (recomendado Node 24 LTS):

```sh
npm ci
npm run dev
```

La API escucha en `http://localhost:4000`. Verificar `GET /health`. El arranque aplica la migración inicial y, con `DEMO_MODE=true`, crea las cuentas de prueba de forma idempotente. No elimina ni reinicia datos.

La opción inicial usa **PGlite**, PostgreSQL embebido en WebAssembly dentro del backend. Guarda la información en `backend/data/database`; no es una lista en memoria y no requiere instalar un servidor PostgreSQL. El secreto de firma de las sesiones se genera en `backend/data/jwt-secret` si no se configura `JWT_SECRET`. Mantener ambos privados.

Copiar `.env.example` como `.env` para ajustar opciones. Variables y valores por defecto:

| Variable | Uso |
|---|---|
| `PORT=4000` | Puerto de la API. |
| `HOST=0.0.0.0` | Permite acceso desde emulador y LAN; restringir en despliegues. |
| `DATABASE_MODE=pglite` | Persistencia local inicial. `postgres` activa el servidor externo. |
| `DATA_DIR=./data` | Carpeta relativa a `backend`; contiene PGlite y secreto local. |
| `DEMO_MODE=true` | Cuentas y evidencias de demostración. Desactivar para otro uso. |
| `DATABASE_URL` | Conexión PostgreSQL externa. Si no se fija `DATABASE_MODE`, una URL activa `postgres`. |
| `DATABASE_SSL=false` | `true` exige TLS con certificado verificable. No desactiva la validación del certificado. |
| `JWT_SECRET` | Secreto de al menos 32 caracteres. Obligatorio con `NODE_ENV=production`. |
| `CORS_ORIGINS` | Orígenes web separados por coma; deben coincidir con el navegador. |

Las variables del proceso prevalecen sobre `.env`. Con `NODE_ENV=production` se rechaza `DEMO_MODE=true`; usar otra base vacía y credenciales propias. Desactivar demo no borra cuentas existentes ni constituye una preparación completa para producción.

## Usuarios de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Propietario (Ana Torres) | `propietario@demo.com` | `Demo2026!` |
| Cuidador (Luis Mendoza) | `cuidador@demo.com` | `Demo2026!` |

Vehículo inicial: Toyota Corolla gris, placa de prueba `DEM-001`. No se crea ninguna custodia automáticamente.

## Conectar PostgreSQL después

1. Crear una base y un usuario con permisos sobre ella.
2. En `.env`, configurar `DATABASE_MODE=postgres` y `DATABASE_URL=postgresql://usuario:clave@host:5432/cuidatuauto`.
3. Configurar `DATABASE_SSL=true` si el proveedor requiere TLS con un certificado de confianza.
4. Ejecutar `npm run migrate`, luego `npm run seed` solo si se desean datos de prueba.
5. Iniciar con `npm run dev` o compilar e iniciar con `npm run build` y `npm start`.

El frontend no cambia: consume la misma API. Cambiar de motor no copia los registros de PGlite a PostgreSQL; son bases separadas. La migración de datos existentes debe realizarse explícitamente. La conexión PostgreSQL remota requiere un servidor proporcionado por el usuario; las pruebas incluidas utilizan PGlite persistente.

## Fotografías y demostración

Las imágenes se envían como data URL PNG/JPEG/WebP. El backend valida tipo declarado, firma de archivo y límite de **2 MiB binarios por imagen**. Se guardan en la tabla `evidence`, vinculadas a la custodia y, cuando corresponde, a la ronda. Para una versión de producción se propone almacenamiento de objetos (por ejemplo, Firebase Storage), manteniendo metadatos en PostgreSQL.

Se requieren cuatro evidencias iniciales para aceptar la custodia y cuatro finales para solicitar cierre. Máximo ocho por fase. Una ronda requiere una fotografía. Las ilustraciones de `assets` están marcadas como datos de prueba y se guardan con `source=demo`. No son fotografías reales.

El QR contiene `cuidatuauto:v1:<código>`. El código manual y el payload de QR pasan por la misma validación. La vinculación es atómica y solamente admite custodias pendientes con evidencias completas. Un vehículo solo puede tener una custodia abierta.

Cada custodia conserva una copia de los datos del vehículo al momento de su creación. Editar después el vehículo no altera su historial. Las fechas de las evidencias corresponden al registro en el servidor; no certifican la fecha original de captura de una imagen seleccionada desde archivos.

## Scripts y comprobaciones

```sh
npm run typecheck
npm run build
npm test
npm run migrate
npm run seed
```

Las pruebas abren un servidor local temporal y una base PGlite temporal; comprueban flujo completo, roles, aislamiento de datos, concurrencia al aceptar, imágenes, cierre, seed idempotente y persistencia al reiniciar. No modifican `backend/data`.

## Límites de esta fase

No se incluyen notificaciones remotas, geocercas, rastreo en segundo plano, panel administrador, pagos ni verificación de identidad. Las rondas se consultan al actualizar. El intervalo es una configuración informativa; no genera alarmas automáticas. El listado entrega hasta las 100 custodias más recientes, sin imágenes; el detalle carga las evidencias. Sesiones JWT de 12 horas, sin revocación central al cerrar sesión. La aplicación es un prototipo académico y requiere revisión adicional antes de manejar usuarios reales.
