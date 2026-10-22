# Demostración de CuidaTuAuto · 8–10 minutos

## Objetivo

Mostrar cómo se registra una custodia, cómo el cuidador documenta una ronda y cómo el propietario revisa y finaliza el servicio. Los nombres, el vehículo y las imágenes de ejemplo representan datos de prueba. Las acciones principales deben ejecutarse contra la API y guardarse.

## Preparación antes de compartir pantalla

1. Ejecuta `npm run setup` con anticipación, no durante la clase.
2. Inicia `npm run dev` para web o `npm run dev:android` con el emulador abierto.
3. Comprueba que `/health` responde y que la URL de conexión corresponde al dispositivo.
4. Ensaya el recorrido completo una vez. Comprueba cámara/QR por separado si deseas mostrarlos.
5. Conserva a mano las dos cuentas demo y el código de la custodia que crearás.

Si usarás un solo emulador, cerrarás sesión y entrarás con la otra cuenta. En la web puedes usar un navegador para cada rol, o una ventana normal y otra privada. Esta versión guarda la sesión en `sessionStorage`, separada por pestaña; utilizar dos navegadores ayuda a distinguir visualmente qué rol estás mostrando.

## Guion del recorrido

| Tiempo aproximado | Acción | Explicación sugerida |
|---|---|---|
| 0:00–1:00 | Presentar el problema y entrar como propietaria. | “Buscamos registrar la entrega y devolución del vehículo, con evidencias y rondas consultables.” |
| 1:00–2:00 | Mostrar el vehículo `DEM-001` o registrar otro. Crear una custodia y elegir ubicación demo. | “Esta custodia relaciona al propietario, su vehículo y el servicio que después aceptará el cuidador.” |
| 2:00–3:00 | Añadir las cuatro evidencias iniciales con la opción de imágenes demo. Mostrar QR y código. | “Las ilustraciones están identificadas como datos de prueba. El código sí identifica este registro.” |
| 3:00–4:00 | Cerrar sesión, entrar como cuidador y aceptar con el código. | “La API comprueba que el código sea válido, la custodia esté pendiente y existan las evidencias iniciales.” |
| 4:00–5:30 | Registrar una ronda con imagen de prueba, nota y ubicación demo. | “Se registra quién realizó la ronda, su estado, la nota y la evidencia.” |
| 5:30–6:30 | Adjuntar cuatro evidencias finales y solicitar cierre. | “El cuidador termina su registro; la custodia queda esperando la confirmación del propietario.” |
| 6:30–8:00 | Entrar otra vez como propietaria, consultar evidencias y confirmar con conformidad u observación. | “La decisión del propietario queda registrada. Si existe una observación, se exige una nota.” |
| 8:00–9:00 | Abrir historial y volver a consultar el registro. | “El historial se obtiene de la API y permanece guardado en el backend.” |
| 9:00–10:00 | Mostrar arquitectura y mejoras pendientes. | “La fase siguiente aborda las funcionalidades que todavía no están desarrolladas.” |

No hace falta simular el paso de veinte minutos para registrar una ronda: el intervalo configurado representa la frecuencia esperada. Esta fase no contiene un sistema automático de alertas por rondas vencidas.

## Si quieres enseñar el escáner QR

Hay dos QR diferentes: el QR de Expo abre el proyecto durante el desarrollo; el QR de CuidaTuAuto vincula una custodia. Durante la exposición debes explicar el segundo.

La lectura se debe probar antes en el emulador o dispositivo elegido. Si muestras el ingreso manual del código, descríbelo como ingreso manual. Ambos caminos deben usar la validación del backend. No presentes un botón que rellena datos como evidencia de que se leyó una cámara.

## Evidencia de persistencia

Una vez cerrada una custodia, puedes detener el proyecto, iniciarlo de nuevo e ingresar a Historial. Es una comprobación útil después del ensayo; no hace falta detener la aplicación durante la explicación principal si el tiempo es limitado.

Conserva el mismo directorio `backend/data` y la misma configuración de base de datos entre ambos inicios. La recarga de una pantalla por sí sola no comprueba que el estado sobreviva al reinicio del servidor.

## Cómo describir el avance con precisión

| Categoría | Qué explicar |
|---|---|
| Funcional | Las operaciones que se hayan implementado y probado: acceso, vehículos, custodia, evidencias, ronda, cierre e historial. Consulta el reporte de validación. |
| Datos simulados | Cuentas y vehículo demo, ilustraciones de evidencia y coordenadas elegidas como demo. |
| Comprobación pendiente en tu equipo | Emulador Android, permisos, cámara, ubicación y conectividad local si no se han ensayado en esa computadora. |
| Desarrollo posterior | Push remoto, geocercas, rastreo en segundo plano, funcionamiento sin conexión y administración completa. |

## Participación del equipo

Para cinco integrantes, pueden repartirse contexto, arquitectura, flujo del propietario, flujo del cuidador y pruebas/mejoras. Todos deben conocer el recorrido completo y explicar su contribución real. Ajusten los tiempos para que la participación sea similar.

Cada conclusión individual debe responder: qué desarrollé o revisé, qué dificultad encontré, qué aprendí al resolverla y qué mejoraría después. Completen las respuestas con su experiencia real; no presenten un ejemplo de conclusión como si fuera una actividad ya realizada.

La demostración acompaña la PPT solicitada por el docente. Este paquete contiene la aplicación y las guías técnicas; la presentación de diapositivas se prepara después con capturas y resultados comprobados.
