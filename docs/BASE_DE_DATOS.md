# Conectar PostgreSQL después de probar la aplicación

## 1. Estado inicial

El backend funciona inicialmente con PGlite, conservando los registros en `backend/data/database`. La aplicación web o Android consume la misma API y no depende de qué adaptador SQL utilice el servidor.

El adaptador para PostgreSQL externo está implementado. Esta entrega no ha ejecutado pruebas contra un servidor PostgreSQL externo ni Docker; la conexión, los certificados y las migraciones deben comprobarse cuando se disponga de la instancia de destino.

Configuración inicial de `backend/.env`:

```dotenv
DATABASE_MODE=pglite
DATA_DIR=./data
DEMO_MODE=true
```

La ruta relativa se resuelve desde el backend cuando usas los comandos del README. No ejecutes dos servidores con el mismo directorio PGlite al mismo tiempo. Los tests deben usar su propio directorio temporal.

El servidor prepara el esquema al iniciar. En modo demo añade las dos cuentas y el vehículo de ejemplo si no existen. Una custodia nueva se crea desde la aplicación.

## 2. Datos necesarios de tu servidor PostgreSQL

Cuando decidas conectar una base externa, necesitas estos valores:

| Valor | Ejemplo local |
|---|---|
| Host | `localhost` |
| Puerto | `5432` |
| Base de datos | `cuidatuauto` |
| Usuario | `cuidatuauto` |
| Contraseña | La que hayas configurado para ese usuario. |
| Requisito TLS/SSL | Según el servidor o proveedor. |

La cuenta SQL debe poder crear el esquema inicial y leer/escribir las tablas de la app. Para un despliegue posterior se pueden separar permisos de migración y de ejecución.

La URL de conexión se guarda en `backend/.env`, nunca en una variable `EXPO_PUBLIC_` ni en código del frontend. Si la contraseña contiene caracteres reservados como `@`, `:` o `/`, debe codificarse correctamente para formar parte de una URL.

## 3. Opción local con Docker

Este paso es opcional: el modo inicial ya funciona sin Docker. Si tienes Docker Desktop iniciado, ejecuta desde la raíz del proyecto:

```powershell
docker compose up -d db
```

El archivo `docker-compose.yml` inicia PostgreSQL 17, publica el puerto 5432 solo en la interfaz local y utiliza un volumen persistente. Sus credenciales son ejemplos de desarrollo.

Detén primero la API y edita `backend/.env`:

```dotenv
DATABASE_MODE=postgres
DATABASE_URL=postgresql://cuidatuauto:cuidatuauto_demo_local@localhost:5432/cuidatuauto
DATABASE_SSL=false
DEMO_MODE=true
```

Después ejecuta:

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

El inicio del servidor también prepara el esquema y los datos demo de forma idempotente. Los comandos separados permiten ver y explicar cada paso. Revisa `http://localhost:4000/health`: debe indicar `databaseMode: "postgres"`.

Cierra la sesión de la app y vuelve a ingresar después de cambiar de base. Un token de la base anterior puede referirse a un usuario que no exista en la nueva.

Para detener PostgreSQL conservando los datos:

```powershell
docker compose stop db
```

No borres el volumen ni uses opciones que eliminen los datos si quieres conservar el historial.

## 4. Servidor de tu equipo o proveedor

Configura la URL entregada por el administrador/proveedor y la opción `DATABASE_SSL` según corresponda. Cuando se exige TLS, utiliza `DATABASE_SSL=true` y una cadena/certificado admitidos por Node. No desactives la verificación de certificados como solución general.

Prueba primero la migración y la conexión desde el backend. La URL pública que utiliza el frontend seguirá apuntando a **Express**, no al puerto de PostgreSQL. Si publicas la API fuera de tu computadora, configura HTTPS y los orígenes web permitidos en `CORS_ORIGINS`.

Antes de exponerla a usuarios reales, desactiva `DEMO_MODE`, configura un `JWT_SECRET` privado adecuado, revisa permisos de la base y elimina o cambia las cuentas demo mediante un procedimiento controlado. Los ejemplos del repositorio son de desarrollo.

## 5. Qué sucede con los datos anteriores

**Cambiar `DATABASE_URL` no copia los registros que ya existen en PGlite.** El adaptador abre una base distinta. Si esa base está vacía y se mantiene `DEMO_MODE=true`, se crean los datos iniciales; esto no transfiere custodias ni fotos anteriores.

Para una migración con historial hay que detener escrituras, respaldar PGlite, exportar e importar las tablas respetando relaciones, trasladar las imágenes y comprobar conteos y referencias. Esta transferencia automatizada no forma parte de la entrega inicial. Se puede preparar cuando exista un destino concreto.

Para volver a la base local, detén el servidor y restablece `DATABASE_MODE=pglite`, conservando `DATA_DIR` y sus archivos. Reinicia y vuelve a iniciar sesión.

## Referencias

- [PGlite: inicio y persistencia](https://pglite.dev/docs/).
- [PGlite: API y almacenamiento](https://pglite.dev/docs/api).
- [node-postgres: conexión](https://node-postgres.com/features/connecting).
- [node-postgres: TLS/SSL](https://node-postgres.com/features/ssl).
- [Imagen oficial de PostgreSQL](https://hub.docker.com/_/postgres).
