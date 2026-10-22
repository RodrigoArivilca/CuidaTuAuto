# Contexto para continuar CuidaTuAuto con Codex

Abre en VS Code la carpeta raíz de este proyecto y utiliza el siguiente encargo como contexto de trabajo. No es necesario volver a generar el proyecto desde cero.

## Encargo

Estamos desarrollando CuidaTuAuto, un proyecto académico de Lenguajes de Programación. La primera entrega tiene una app de Expo/React Native/TypeScript con roles de propietario y cuidador y una API Express/TypeScript. El backend puede funcionar con PGlite persistente local o PostgreSQL externo mediante `pg`.

Primero lee README.md, docs/API_CONTRACT.md, docs/ARQUITECTURA.md, docs/BASE_DE_DATOS.md y docs/VALIDACION.md. Inspecciona el estado actual, los package.json y los archivos de bloqueo antes de cambiar dependencias. Conserva trabajo previo, configuración privada y datos. No borres backend/data ni sobrescribas archivos .env existentes.

La meta de la exposición es mostrar la aplicación al compartir pantalla, principalmente en un emulador de Android Studio. También existe una versión web. Mantén Expo y las adaptaciones por plataforma. No reemplaces este proyecto con un sitio web independiente ni con una nueva app en Kotlin.

Comprueba Node y dependencias y utiliza los scripts de la raíz. El flujo principal es: propietario registra un vehículo e inicia custodia; añade cuatro evidencias iniciales; cuidador acepta QR o código; registra una ronda con evidencia; añade cuatro evidencias finales y solicita cierre; propietario confirma o deja observación; ambos consultan historial autorizado.

La app debe usar la API real: no reemplaces llamadas por arreglos en memoria para ocultar errores. El código manual y el escáner deben resolver la misma custodia. Los botones de imágenes y ubicación demo deben conservar sus etiquetas de prueba y sus indicadores de origen. No afirmes que la cámara, ubicación, push o Android están probados si solo ejecutaste la web.

Revisa errores de integración y permisos con pruebas significativas: identidad y rol, acceso a registros propios, estados de custodia, doble aceptación, requisitos de fotos y persistencia. Ejecuta npm run check, npm test y npm run build cuando correspondan a los cambios. No amplíes pruebas sin un riesgo concreto; informa los comandos y resultados reales.

Para Android, verifica el SDK de Expo fijado (57 en esta entrega) y su compatibilidad con Expo Go o con el build elegido. Usa la URL http://10.0.2.2:4000 para el emulador oficial si la API corre en la PC. Para un teléfono físico, usa la IP LAN o una API publicada con autorización. EXPO_PUBLIC_API_URL es la raíz de la API, sin /api; el cliente añade ese prefijo. La URL guardada por el usuario en Configurar conexión tiene prioridad sobre esa variable y la detección automática. El túnel de Expo no publica Express automáticamente.

Si el siguiente encargo es conectar PostgreSQL, configura DATABASE_MODE=postgres y DATABASE_URL en backend/.env a partir de datos autorizados. Aplica migraciones, comprueba /health y el flujo de datos. No coloques credenciales SQL en el frontend ni muestres contraseñas en la salida. Cambiar de adaptador no importa automáticamente los datos de PGlite: si hay historial que conservar, prepara y valida una migración antes de modificarlo.

Mantén fuera del alcance inicial las notificaciones remotas, geocercas, seguimiento en segundo plano, sincronización sin conexión, pagos, chat y panel de administración completo hasta que se soliciten. Cualquier cambio de alcance debe quedar documentado como implementado, simulado o pendiente.

Antes de terminar, actualiza las instrucciones que realmente hayan cambiado y el reporte de validación. Entrega los cambios concretos y las limitaciones observadas. No publiques un servicio ni uses cuentas externas sin autorización del usuario.
