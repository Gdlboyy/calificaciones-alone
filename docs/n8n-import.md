# Importar y configurar el flujo de n8n

Este flujo se construyó sin una instancia de n8n conectada para probarlo en vivo. Antes de activarlo, valídalo dentro de tu propio n8n (con las herramientas `n8n-mcp` si las tienes disponibles, o revisando cada nodo a mano) — en particular los nodos de Google Sheets, ya que sus nombres de parámetro pueden variar ligeramente entre versiones de n8n.

El flujo tiene dos entradas (dos webhooks) que comparten el mismo Sheets:
- **`Webhook Generar Reporte`** (POST `/generar-reporte`) — genera y envía el reporte de un alumno.
- **`Webhook Obtener Alumnos`** (GET `/obtener-alumnos`) — entrega la lista de alumnos y calificaciones pendientes a la página.

Ambas exigen una sesión de Google válida y autorizada antes de hacer cualquier otra cosa (ver `docs/google-signin-setup.md`).

## Pasos

1. En n8n, `Workflows > Import from File` y selecciona `n8n/workflow.json`.
2. Reemplaza en los nodos (buscar y reemplazar en el editor de n8n si tu versión lo permite, o nodo por nodo):
   - `SHEET_ID_AQUI` → el ID del Google Sheets de `docs/sheets-setup.md`.
   - `PRESENTATION_ID_AQUI` → el ID de la presentación de `docs/slides-template-setup.md`.
   - `SLIDE_ID_AQUI` → el ID de la diapositiva plantilla de `docs/slides-template-setup.md`.
   - `GOOGLE_CLIENT_ID_AQUI` (aparece en los nodos "Validar sesión (G)" y "Validar sesión (O)") → el Client ID de `docs/google-signin-setup.md`.
3. Crea/asigna las credenciales de Google (OAuth) en los nodos de Google Sheets ("Leer Staff Autorizado (G)/(O)", "Leer Calificaciones pendientes", "Leer WhatsApp del alumno", "Marcar como REPORTADO", "Leer todos los Alumnos", "Leer todas las Calificaciones"), y en "Duplicar diapositiva plantilla" / "Rellenar datos en la diapositiva" (Google Slides — tipo de credencial `googleSlidesOAuth2Api`) y "Exportar diapositiva como PNG" (Google Drive — `googleDriveOAuth2Api`). Todas deben autenticar con `institutoalonecrm@gmail.com`.
4. Activa el workflow y copia las URLs de producción de ambos nodos webhook:
   - La de "Webhook Generar Reporte" → `WEBHOOK_URL` en `web/index.html`.
   - La de "Webhook Obtener Alumnos" → `OBTENER_ALUMNOS_URL` en `web/index.html`.
5. Si al probar desde la página ves errores de CORS en la consola del navegador, entra a las opciones de cada nodo Webhook y revisa/activa "Allowed Origins (CORS)" con la URL de tu GitHub Pages (o `*` mientras pruebas en local).
6. Prueba de autenticación primero: con un correo que SÍ esté en "StaffAutorizado" debes poder leer la lista; con uno que no esté (o sin header `Authorization`), ambos webhooks deben responder `401` con `{ ok:false, message:'...' }`.
7. Prueba cada tramo del reporte con el Sheets de prueba (con los 2-3 alumnos de `docs/sheets-setup.md`, Paso 8), siempre con un `Authorization: Bearer <token>` de una cuenta autorizada:
   - Ejecuta manualmente con un alumno sin calificaciones pendientes → debe responder `{ ok:false, message:'Sin calificaciones nuevas...' }`.
   - Con un alumno con 6+ pendientes → debe responder el mensaje de "demasiadas".
   - Con un alumno sin WhatsApp → debe responder el mensaje de "sin WhatsApp".
   - Con un alumno válido (1-5 pendientes, con WhatsApp) → sigue hasta "Duplicar diapositiva plantilla"; en este punto, si Evolution API aún no está configurada (se deja para el final), el flujo puede fallar en el nodo "Enviar por WhatsApp" — eso es esperado, confirma que sí llegó hasta ahí y que la imagen exportada en el nodo anterior se ve correcta.
8. Configuración de Evolution API (al final, cuando el resto ya esté probado):
   - Crea las variables de entorno de n8n `EVOLUTION_API_URL` y `EVOLUTION_INSTANCE` con los valores de tu instancia.
   - En el nodo "Enviar por WhatsApp (Evolution API)", crea una credencial de tipo "Header Auth" con el header `apikey` y el valor de tu API key de Evolution API — nunca escribir la key directamente en el nodo.
   - Corre la prueba completa de punta a punta con un número de WhatsApp real de prueba.

## Notas

- **"¿Sin WhatsApp?"**: la salida `true` (rama 0) es "sin WhatsApp" (columna vacía) y la salida `false` (rama 1) continúa hacia la generación del reporte.
- **"¿Autorizado? (G)" / "¿Autorizado? (O)"**: la salida `true` (rama 0) continúa el flujo normal; la salida `false` (rama 1) va al nodo de respuesta 401.
- Revisa en n8n que las ramas de ambos `IF` queden conectadas en ese orden al importar, ya que el orden visual puede variar según la versión de n8n.
- Los nodos "Validar sesión (G)" y "Validar sesión (O)" llaman a `https://oauth2.googleapis.com/tokeninfo` para verificar el token que manda la página — no requieren credencial propia, es una llamada pública de Google.
