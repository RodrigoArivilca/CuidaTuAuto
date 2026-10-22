# CuidaTuAuto · fase inicial

Aplicación académica para registrar la custodia de un vehículo, sus evidencias, las rondas del cuidador y la conformidad del propietario al finalizar. El proyecto contiene **frontend y backend conectados**, con datos de demostración y una base SQL local persistente para comenzar sin instalar PostgreSQL.

La misma app utiliza **Expo SDK 57** y se prepara para **web y Android**. El detalle de lo que se comprobó en esta entrega está en [docs/VALIDACION.md](docs/VALIDACION.md); la compilación web no demuestra por sí sola que se haya probado un celular o emulador Android.

## 1. Abrir el proyecto en Windows

### Descargar desde GitHub y trabajar en equipo

Clona el repositorio y prepara el proyecto desde PowerShell:

```powershell
git clone https://github.com/RodrigoArivilca/CuidaTuAuto.git
cd CuidaTuAuto
npm.cmd run setup
npm.cmd run dev
```

También puedes usar **Code → Download ZIP** en GitHub, extraerlo y seguir los pasos de abajo. Para Android, abre primero el emulador y usa `npm.cmd run dev:android` en lugar de `npm.cmd run dev`.

El repositorio incluye frontend, backend, migraciones SQL, imágenes de demostración, pruebas, archivos de versiones de dependencias y documentación. Cada compañero genera su propia configuración `.env` y base local con las cuentas demo. Las dependencias instaladas, claves internas, fotografías personales e historial local no se comparten por GitHub.

Para recibir cambios después de clonar, guarda primero tu trabajo y ejecuta `git pull`; si cambiaron las dependencias, vuelve a ejecutar `npm.cmd run setup`.

Necesitas **Node.js 24 LTS, versión 24.3 o posterior** y una conexión a Internet durante la instalación de dependencias. También se admite **Node.js 22 LTS desde 22.13**. Evita versiones intermedias no admitidas por React Native, como Node.js 23. VS Code facilita trabajar con el código. Para comenzar en web no necesitas Android Studio, Docker ni una cuenta de Expo.

1. Extrae el ZIP completo a una carpeta, por ejemplo `C:\Proyectos\CuidaTuAuto`.
2. Abre esa carpeta en VS Code. Debes ver `frontend`, `backend`, `docs` y este README.
3. En una terminal de PowerShell, situada en la carpeta que contiene el `package.json` principal, ejecuta:

```powershell
npm run setup
npm run dev
```

`setup` instala las dependencias de ambos componentes y crea sus archivos `.env` a partir de los ejemplos cuando todavía no existen. Conserva la configuración y los datos locales que ya tengas. El ZIP no incluye `node_modules`; se reconstruye con los archivos de bloqueo de versiones.

`dev` inicia la API, espera a que esté disponible y abre Expo para web. Mantén esa terminal abierta. Si el navegador no se abre solo, entra a **http://localhost:8081**. La comprobación del backend está en **http://localhost:4000/health**. Para detener ambos procesos pulsa **Ctrl+C**.

Si PowerShell impide ejecutar `npm.ps1`, usa `npm.cmd run setup` y `npm.cmd run dev`, o una terminal de Símbolo del sistema. No es necesario cambiar la política de ejecución de toda la computadora.

## 2. Cuentas de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Propietaria: Ana Torres | `propietario@demo.com` | `Demo2026!` |
| Cuidador: Luis Mendoza | `cuidador@demo.com` | `Demo2026!` |

El modo de demostración crea estas cuentas y el vehículo Toyota Corolla gris `DEM-001`. No crea custodias: podrás iniciar una durante la exposición. Las cuentas se insertan de forma idempotente, sin duplicarse cada vez que inicias el servidor.

Las imágenes incluidas son **ilustraciones de prueba**, identificadas como tales. Las coordenadas que selecciones como demo también se identifican como simuladas. El registro de custodias, cambios de estado, rondas e historial utiliza la API y la persistencia del backend.

## 3. Exponer en un celular virtual Android

Instala Android Studio con Android SDK y Android Emulator. En **Device Manager**, crea un dispositivo virtual, descarga una imagen compatible y abre el emulador. Después, desde la raíz del proyecto:

```powershell
npm run dev:android
```

Este comando inicia el backend y Expo para Android. También puedes trabajar con dos terminales:

```powershell
# Terminal 1
npm run backend
```

```powershell
# Terminal 2
npm run android
```

Expo abre el proyecto en el emulador mediante Expo Go. Si inicias Expo con su comando interactivo `npx expo start` desde `frontend`, la tecla **A** abre Android. Usa una versión de Expo Go compatible con el SDK fijado en `frontend/package.json`; no actualices Expo o React Native por separado.

La URL de API debe ser la raíz, **sin `/api` al final**:

| Dónde ejecutas la app | URL habitual del backend |
|---|---|
| Navegador en la misma PC | `http://localhost:4000` |
| Emulador oficial de Android Studio | `http://10.0.2.2:4000` |
| Celular Android físico en la misma Wi-Fi | `http://IP_LOCAL_DE_TU_PC:4000` |

La app tiene una pantalla de conexión para revisar/cambiar la URL: botón de ajustes al ingresar o **Mi cuenta → Configurar conexión**. La URL guardada allí tiene prioridad. Si no existe una URL guardada, se utiliza `EXPO_PUBLIC_API_URL` de `frontend/.env` o, si está vacío, la selección automática por plataforma. Al cambiar `.env`, reinicia Expo; si ya guardaste otra URL en la app, actualízala también desde esa pantalla. En el celular, `localhost` identifica al propio celular, no a tu PC.

Para el dispositivo físico, revisa que el backend escuche en la red local y que el firewall permita el puerto elegido. Un túnel de Expo transporta el proyecto de desarrollo; **no publica automáticamente nuestra API**. No necesitas un teléfono físico para exponer con el emulador.

## 4. Qué incluye esta primera fase

- Registro e inicio de sesión con roles de propietario y cuidador.
- Gestión de vehículos del propietario.
- Creación de custodia, QR/código de vinculación y aceptación por cuidador.
- Cuatro evidencias iniciales y cuatro finales como requisito de cada etapa.
- Rondas con evidencia, estado, nota y ubicación opcional.
- Solicitud de cierre por cuidador y conformidad u observación del propietario.
- Historial y persistencia después de reiniciar el backend.
- Modo demo local y adaptador para una instancia externa de PostgreSQL.

El backend valida permisos y estado de la custodia. Por ejemplo, otro usuario no debe consultar evidencias ajenas, aceptar una custodia ya asignada ni registrar rondas cuando está cerrada. El código manual y el QR identifican la misma custodia; la entrada manual permite demostrar la vinculación usando un solo emulador.

**Queda fuera de esta fase:** notificaciones push remotas, rastreo en segundo plano, geocercas, sincronización sin conexión, pagos, chat, administración completa, publicación en tiendas y análisis automático de daños. El sistema registra evidencias y observaciones; no certifica que un vehículo esté libre de daños.

## 5. Base de datos: comenzar ahora y conectar otra después

El modo inicial utiliza **PGlite**, un motor PostgreSQL embebido en el backend, con persistencia en `backend/data/database`. No es un servidor PostgreSQL externo ni un servicio de nube. La aplicación accede a los datos únicamente por la API.

Las fotos pequeñas de esta fase se almacenan en SQL como data URL, con un máximo de 2 MiB binarios por imagen. Para un despliegue con más usuarios conviene moverlas a un almacenamiento de objetos y conservar en SQL las referencias y permisos.

Cuando tengas PostgreSQL, cambiarás `DATABASE_MODE` y `DATABASE_URL` en `backend/.env`. Ya se incluye el adaptador y el esquema SQL; la conexión a un servidor PostgreSQL externo **todavía debe validarse con tu instancia concreta**. Las pruebas de persistencia de esta entrega usan PGlite. Consulta [docs/BASE_DE_DATOS.md](docs/BASE_DE_DATOS.md).

**Cambiar la conexión no transfiere automáticamente los datos de PGlite.** Una base externa nueva comienza vacía y puede recibir los datos demo si `DEMO_MODE=true`. Para conservar registros existentes se necesita una exportación/importación planificada. No borres `backend/data` para cambiar de conexión.

## 6. Comandos

Ejecuta estos comandos desde la raíz:

| Comando | Función |
|---|---|
| `npm run setup` | Instalar dependencias y preparar `.env` sin sobrescribirlos. |
| `npm run dev` | Iniciar backend + web. |
| `npm run dev:android` | Iniciar backend + Android en el emulador abierto. |
| `npm run backend` | Iniciar solo backend. |
| `npm run web` | Iniciar solo frontend web. |
| `npm run android` | Iniciar solo frontend Android. |
| `npm run check` | Revisar tipos TypeScript del backend y frontend. |
| `npm test` | Ejecutar las pruebas de integración del backend. |
| `npm run build` | Compilar backend y exportar frontend web. |
| `npm run db:migrate` | Aplicar el esquema de base de datos. |
| `npm run db:seed` | Crear los datos demo según la configuración del backend. |

Antes de ejecutar `db:migrate` o `db:seed` sobre PGlite, detén el backend: no abras dos procesos sobre el mismo directorio de datos. Para el arranque habitual no necesitas esos comandos separados, porque el servidor prepara el esquema y los datos demo automáticamente.

La exportación web crea archivos estáticos; no aloja ni inicia el backend. El ZIP es código fuente para abrir como proyecto. No se sube directamente al botón “New project” del panel de Expo ni se importa íntegro a Snack. El panel de Expo puede vincularse después al proyecto mediante EAS; Snack requiere adaptar la parte del cliente a su entorno.

## 7. Archivos para estudiar y continuar

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): responsabilidades, datos y estados.
- [docs/GUIA_EXPOSICION.md](docs/GUIA_EXPOSICION.md): recorrido de 8–10 minutos.
- [docs/BASE_DE_DATOS.md](docs/BASE_DE_DATOS.md): conexión posterior a PostgreSQL.
- [docs/API_CONTRACT.md](docs/API_CONTRACT.md): rutas y modelos de integración.
- [docs/VALIDACION.md](docs/VALIDACION.md): pruebas ejecutadas y límites de validación.
- [docs/CONTINUAR_CON_CODEX.md](docs/CONTINUAR_CON_CODEX.md): contexto para continuar el trabajo.

## 8. Problemas frecuentes

**“No se pudo conectar” o la pantalla queda sin datos.** Abre `/health` desde la PC, comprueba que el backend esté iniciado y revisa la URL según web/emulador/celular. No agregues `/api` a la URL base de configuración.

**No se acepta la custodia.** Debe estar pendiente y tener cuatro evidencias iniciales. La cuenta debe ser de cuidador. Si fue aceptada anteriormente, utiliza la custodia ya asignada o crea otra con un vehículo disponible.

**No se puede cerrar.** El cuidador agrega cuatro evidencias finales y solicita cierre. Después el propietario confirma o registra una observación. Una observación requiere texto.

**Cámara o ubicación no disponibles en web.** Revisa los permisos del navegador. Estas funciones requieren `localhost` o HTTPS; una URL HTTP de la red local puede no habilitarlas. La entrada manual del código y las imágenes demo permiten seguir el recorrido académico.

**Puerto ocupado.** Detén la instancia anterior. Si cambias el puerto del backend en `.env`, actualiza la URL en la app. Si cambias el puerto de Expo, revisa también la configuración CORS del backend.

**No quiero perder el historial.** Conserva la carpeta `backend/data` y el volumen de PostgreSQL si usas Docker. Reinstalar dependencias con `npm run setup` no elimina esos datos.

## Fuentes técnicas

- [Crear un proyecto con Expo](https://docs.expo.dev/get-started/create-a-project/).
- [Ejecutar Expo en dispositivos y emuladores](https://docs.expo.dev/get-started/start-developing/).
- [Configurar el emulador Android](https://docs.expo.dev/workflow/android-studio-emulator/).
- [Permisos en Expo y web](https://docs.expo.dev/guides/permissions/).
- [PGlite y persistencia en Node.js](https://pglite.dev/docs/).
- [Consultas parametrizadas con node-postgres](https://node-postgres.com/features/queries).
