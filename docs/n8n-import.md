# Importar y configurar el flujo de n8n

Este flujo se construyó sin una instancia de n8n conectada para probarlo en vivo. Antes de activarlo, valídalo dentro de tu propio n8n (con las herramientas `n8n-mcp` si las tienes disponibles, o revisando cada nodo a mano) — en particular los nodos de Google Sheets (`Leer Calificaciones pendientes`, `Leer WhatsApp del alumno`, `Marcar como REPORTADO`), ya que sus nombres de parámetro pueden variar ligeramente entre versiones de n8n.

1. En n8n, `Workflows > Import from File` y selecciona `n8n/workflow.json`.
2. Reemplaza en los nodos (buscar y reemplazar en el editor de n8n si tu versión lo permite, o nodo por nodo):
   - `SHEET_ID_AQUI` → el ID del Google Sheets de `docs/sheets-setup.md`.
   - `PRESENTATION_ID_AQUI` → el ID de la presentación de `docs/slides-template-setup.md`.
   - `SLIDE_ID_AQUI` → el ID de la diapositiva plantilla de `docs/slides-template-setup.md`.
3. Crea/asigna las credenciales de Google (OAuth) en los nodos "Leer Calificaciones pendientes", "Leer WhatsApp del alumno", "Marcar como REPORTADO" (Google Sheets), y en "Duplicar diapositiva plantilla" / "Rellenar datos en la diapositiva" (Google Slides — tipo de credencial `googleSlidesOAuth2Api`) y "Exportar diapositiva como PNG" (Google Drive — `googleDriveOAuth2Api`). Todas deben autenticar con `institutoalonecrm@gmail.com`.
4. Activa el workflow y copia la URL del nodo "Webhook Generar Reporte" (botón "Listen" o la URL de producción una vez activado) — esa es la `WEBHOOK_URL` que se pega en `web/index.html`.
5. Prueba cada tramo con el Sheets de prueba (con los 2-3 alumnos de `docs/sheets-setup.md`, Paso 8):
   - Ejecuta manualmente con un alumno sin calificaciones pendientes → debe responder `{ ok:false, message:'Sin calificaciones nuevas...' }`.
   - Con un alumno con 6+ pendientes → debe responder el mensaje de "demasiadas".
   - Con un alumno sin WhatsApp → debe responder el mensaje de "sin WhatsApp".
   - Con un alumno válido (1-5 pendientes, con WhatsApp) → sigue hasta "Duplicar diapositiva plantilla"; en este punto, si Evolution API aún no está configurada (se deja para el final), el flujo puede fallar en el nodo "Enviar por WhatsApp" — eso es esperado, confirma que sí llegó hasta ahí y que la imagen exportada en el nodo anterior se ve correcta.
6. Configuración de Evolution API (al final, cuando el resto ya esté probado):
   - Crea las variables de entorno de n8n `EVOLUTION_API_URL` y `EVOLUTION_INSTANCE` con los valores de tu instancia.
   - En el nodo "Enviar por WhatsApp (Evolution API)", crea una credencial de tipo "Header Auth" con el header `apikey` y el valor de tu API key de Evolution API — nunca escribir la key directamente en el nodo.
   - Corre la prueba completa de punta a punta con un número de WhatsApp real de prueba.

## Nota sobre el nodo "¿Sin WhatsApp?"

La salida `true` (rama 0) del `IF` es "sin WhatsApp" (columna vacía) y la salida `false` (rama 1) continúa el flujo hacia la generación del reporte. Revisa en n8n que las ramas queden conectadas en ese orden al importar, ya que el orden visual puede variar según la versión de n8n.
