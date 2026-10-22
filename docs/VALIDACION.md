# Validación de CuidaTuAuto · entrega 0.1.0

Fecha de comprobación: **22 de octubre de 2026**. Esta entrega corresponde a la fase inicial del prototipo académico. Los resultados describen el código incluido en el ZIP, antes de futuras modificaciones.

## Entorno de las pruebas

- Linux, Node.js **24.19.0** y npm **11.9.0**.
- Frontend Expo SDK **57**, React Native y TypeScript.
- Backend Express, con **PGlite persistente** como base local.
- Chromium automatizado, con dos sesiones independientes: propietario a 1440 × 1000 y cuidador a 390 × 844 píxeles. También se revisó visualmente la interfaz y se cambió el detalle del propietario a tamaño móvil.
- Las pruebas utilizaron directorios de datos temporales. El ZIP no contiene cuentas personales, custodias de QA ni una base precargada con esas pruebas.

## 1. Instalación y arranque

Se creó una copia limpia de las fuentes, sin dependencias instaladas, archivos `.env`, bases de datos ni compilaciones previas.

| Comprobación | Resultado |
|---|---|
| `npm run setup` desde la copia limpia | Correcto: instalación mediante los dos lockfiles. |
| Instalación del backend | 122 paquetes instalados. |
| Instalación del frontend | 542 paquetes instalados. |
| Creación de los dos `.env` | Coinciden con sus respectivos `.env.example`. |
| `npm run check` | TypeScript del backend y frontend sin errores. |
| `npm run dev` | Inicia la API, espera su disponibilidad e inicia Expo web. |
| Salud de la API | Respuesta correcta en el puerto 4000, modo PGlite y demo activos. |
| Servidor web | Respuesta correcta de la aplicación en el puerto 8081. |
| Datos del primer arranque | Cuentas demo disponibles; ninguna custodia de pruebas anteriores. |
| Detención conjunta | SIGINT, equivalente a Ctrl+C, detiene los servicios y libera ambos puertos. |

La instalación y los comandos anteriores se ejecutaron en Linux. Los scripts contemplan Windows y el README explica PowerShell, pero **no se ejecutaron en una computadora Windows** durante esta validación.

## 2. Backend y persistencia

La compilación TypeScript terminó correctamente. Las pruebas de integración se ejecutaron con HTTP real contra un servidor temporal y una base PGlite temporal.

Resultado de Node: **12 resultados aprobados, 0 fallos**. El total incluye **11 subpruebas y su prueba contenedora**; no representa 12 escenarios independientes.

Las subpruebas verificaron:

1. Salud, creación idempotente de datos demo y validación de contraseñas.
2. Autorización y unicidad de vehículos.
3. Creación de custodias y protección de los datos de otros usuarios.
4. Validación de imágenes, requisito de cuatro evidencias y repetición segura de la carga demo.
5. Aceptación atómica: un cuidador por custodia; misma validación para QR y código.
6. Rondas con fotografía, observación obligatoria en incidencias y permisos por rol.
7. Cuatro evidencias finales, solicitud de devolución y confirmación del propietario.
8. Historial autorizado y cancelación de una nueva custodia pendiente.
9. Conservación de los datos históricos del vehículo aunque se edite después.
10. Persistencia al cerrar y reabrir tanto la base como el servidor.
11. CORS y rechazo de orígenes web no autorizados.

El resumen de esa ejecución se conserva en `backend/test-result.txt`. Las pruebas reproducibles están en `backend/test/integration.test.ts` y se ejecutan desde la raíz con `npm test`.

## 3. Recorrido real desde las pantallas

Se completaron **13 verificaciones del flujo web**, con el frontend conectado a la API:

1. Inicio de sesión del propietario mediante la interfaz.
2. Registro de un vehículo y comprobación de su persistencia en la API.
3. Creación de custodia, código visible y QR renderizado.
4. Selección de un archivo de imagen mediante el selector real del navegador, procesamiento a JPEG y almacenamiento como evidencia subida.
5. Completar cuatro evidencias iniciales, distinguiendo imágenes seleccionadas de las muestras demo.
6. Inicio de sesión independiente del cuidador y aceptación del contenido del QR mediante el campo de código.
7. Registro de una ronda con incidencia, imagen y coordenadas de prueba identificadas.
8. Actualización del detalle del propietario para consultar la nueva ronda.
9. Bloqueo de la solicitud de cierre sin cuatro fotos finales; solicitud correcta después de agregarlas.
10. Confirmación del propietario con una observación de cierre.
11. Consulta del historial después de recargar la página, conservando la sesión de esa pestaña.
12. Detalle adaptable a 390 píxeles sin desbordamiento horizontal de la página.
13. Cierre de sesión mediante la interfaz.

Al terminar, la custodia de prueba conservaba **nueve evidencias**: cuatro iniciales, una de ronda y cuatro finales. No se detectaron excepciones JavaScript no controladas durante ese recorrido.

La prueba de vinculación introdujo el contenido del QR en el campo de código. **No constituye una prueba de lectura óptica con una cámara**. Las imágenes y coordenadas de muestra eran datos de demostración; las peticiones, los permisos, los cambios de estado y la persistencia se ejecutaron realmente.

## 4. Compilaciones

| Componente | Resultado |
|---|---|
| Backend TypeScript | Compilación correcta. |
| Frontend TypeScript | Revisión correcta. |
| Exportación web de Expo | Correcta. |
| Exportación Android de Expo, JavaScript/Hermes | Correcta. |

La exportación Android comprueba que se genera el paquete de código JavaScript para esa plataforma. **No es una APK, una compilación nativa ni una ejecución en un emulador o celular**.

## 5. Qué falta comprobar en el entorno de uso

- Ejecución en Android Studio Emulator o un teléfono con Expo Go compatible.
- Permisos y funcionamiento de cámara, lectura óptica de QR y ubicación real en Android.
- Comportamiento de cámara y geolocalización con los permisos y dispositivo del navegador usado en la exposición.
- Instalación y detención de los procesos en Windows.
- Conexión del adaptador a una instancia externa de PostgreSQL y ejecución de la configuración opcional de Docker.

Estas funciones pueden requerir ajustes de red, permisos o entorno. El código incluye alternativas de entrada manual de código, selección de imágenes y datos demo para el recorrido académico.

No se realizaron pruebas de carga, disponibilidad pública ni una auditoría de producción. El alcance de esta entrega es el prototipo inicial descrito en el README.

## 6. Repetir las comprobaciones de código

Desde la carpeta que contiene el `package.json` principal:

```powershell
npm run setup
npm run check
npm test
npm run build
```

Para recorrer la app, ejecuta `npm run dev` y sigue `docs/GUIA_EXPOSICION.md`. Las pruebas del backend crean sus propios datos temporales y no necesitan borrar el historial de la aplicación.
