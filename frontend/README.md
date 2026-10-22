# CuidaTuAuto · aplicación Expo

Aplicación en español para propietarios y cuidadores. Comparte código entre web y Android; la API es la fuente de verdad de vehículos, custodias, rondas y evidencias.

## Ejecución

Desde la raíz del ZIP, sigue primero `README.md` y ejecuta `npm run setup`.

Para trabajar solamente en esta carpeta:

```bash
npm ci
npm run web
```

El backend debe estar iniciado por separado en el puerto 4000. La web se abre en `http://localhost:8081`.

```bash
npm run android
```

El segundo comando requiere un emulador Android configurado y encendido, o un dispositivo Android conectado. Expo SDK 57 se eligió para compatibilidad con Expo Go indicada por la documentación oficial durante la transición de SDK 58 (22/10/2026). Las versiones concretas están fijadas en `package-lock.json`.

## Conexión

- Sin `EXPO_PUBLIC_API_URL`: web utiliza `http://localhost:4000`; Android utiliza `http://10.0.2.2:4000` (emulador estándar de Android Studio).
- Para Android físico, utiliza `http://IP_DE_LA_COMPUTADORA:4000`, con ambos equipos en la misma red y el firewall permitiendo el puerto.
- El botón de ajustes de la pantalla de ingreso y **Mi cuenta → Configurar conexión** permiten probar y guardar otra URL.
- Cambiar de backend cierra la sesión para evitar enviar una sesión anterior al nuevo servidor.
- `.env.example` conserva la URL vacía para permitir detección por plataforma. Si cambias una variable de Expo, reinicia el servidor de desarrollo.

## Acceso de demostración

| Rol         | Correo               | Contraseña |
| ----------- | -------------------- | ---------- |
| Propietario | propietario@demo.com | Demo2026!  |
| Cuidador    | cuidador@demo.com    | Demo2026!  |

Los botones demo rellenan el formulario; el acceso se valida mediante el backend. Las cuentas dependen de que el backend tenga `DEMO_MODE=true`.

En web, las sesiones se guardan en `sessionStorage` y se separan por pestaña. Usa dos navegadores o perfiles si necesitas máxima claridad al representar los roles. En Android, la sesión se almacena mediante Expo SecureStore. No se incluyen secretos del backend en el frontend.

## Funciones de la primera fase

1. Ingreso, registro y roles.
2. Vehículos: alta, edición y eliminación cuando no hay historial asociado.
3. Creación de custodia, ubicación descriptiva y frecuencia de rondas.
4. Cuatro imágenes iniciales y vinculación por QR o código con validación en la API.
5. Rondas con fotografía, estado e incidencia opcional.
6. Cuatro imágenes finales, solicitud de cierre y confirmación del propietario, conforme o con observación.
7. Historial y consulta de evidencias.

Las fotografías seleccionadas se convierten a JPEG y se reducen a un máximo de 1400 píxeles por lado; el backend admite hasta 2 MiB por imagen. Una ubicación se solicita solo cuando el usuario pulsa el botón correspondiente. Tras 12 segundos sin respuesta de ubicación, la interfaz informa y permite continuar sin coordenadas o con coordenadas de prueba.

El QR identifica una custodia real del prototipo. El escáner utiliza `expo-camera`; en web necesita cámara y un contexto seguro (localhost o HTTPS). La cámara y la ubicación en Android físico o emulador requieren una prueba en ese dispositivo. No se afirma que hayan sido probadas físicamente.

Las imágenes y coordenadas de demostración se etiquetan como datos de prueba. La fecha de evidencia representa el registro en el sistema, no garantiza la fecha original de captura. Las actualizaciones se consultan con **Actualizar**; no hay push remoto ni ubicación en segundo plano.

## Verificación técnica

```bash
npm run typecheck
npm run build:web
npx expo export --platform android --output-dir android-export
```

La exportación Android comprueba la compilación del JavaScript y sus recursos. No genera una APK ni sustituye una prueba en emulador o celular.

## Estructura

- `App.tsx`: sesión, navegación y sincronización con API.
- `src/screens/`: pantallas, formularios y detalle de custodia.
- `src/components/ui.tsx`: componentes y estilos compartidos.
- `src/lib/api.ts`: cliente HTTP, timeouts y errores.
- `src/lib/media.ts`: selección de fotos y ubicación bajo demanda.
- `src/lib/storage.ts`: almacenamiento de sesión y dirección de backend.
- `src/types.ts`: contrato de datos del frontend.

Este proyecto completo se abre en VS Code. Snack puede servir para ejemplos reducidos, pero el ZIP no se carga íntegro en Snack ni el panel de Expo crea el backend automáticamente. El enlace con EAS puede realizarse después con el proyecto ya instalado y una cuenta de Expo.
