# Crear el Google Sheets de Reportes ALONE

1. Entra a Google Drive con la cuenta `institutoalonecrm@gmail.com`.
2. Crea una hoja de cálculo nueva y nómbrala "Reportes ALONE — Calificaciones".
3. Renombra la primera pestaña a `Alumnos` y en la fila 1 escribe estos encabezados exactos:
   `NOMBRE` en A1, `WHATSAPP` en B1.
   - En `WHATSAPP` usa formato internacional sin signos ni espacios, ejemplo: `5213311223344`.
4. Crea una segunda pestaña llamada `Calificaciones` y en la fila 1 escribe:
   `ALUMNO` en A1, `MODULO` en B1, `CALIFICACION` en C1, `REPORTADO` en D1.
   - `ALUMNO` debe escribirse EXACTAMENTE igual que en la pestaña `Alumnos` (mismo nombre, misma capitalización).
   - `REPORTADO` se deja vacío al capturar; n8n lo llena solo con la fecha cuando ya se envió.
5. Menú `Archivo > Compartir > Publicar en la Web`:
   - Elige la pestaña `Alumnos`, formato `Valores separados por comas (.csv)`, clic en Publicar.
   - Repite lo mismo para la pestaña `Calificaciones`.
6. Para cada pestaña, obtén su URL de exportación CSV:
   - Menú `Archivo > Compartir > Publicar en la Web`, o directamente construye la URL con el ID del Sheets (lo que está entre `/d/` y `/edit` en la barra de direcciones) y el `gid` de cada pestaña (se ve en la URL al tener esa pestaña abierta, después de `#gid=`):
     `https://docs.google.com/spreadsheets/d/TU_SHEET_ID/export?format=csv&gid=TU_GID`
   - Pega esa URL en el navegador y confirma que descarga/muestra un CSV con los encabezados correctos antes de seguir.
7. Anota las dos URLs (Alumnos y Calificaciones) y el ID del Sheets — se necesitan para conectar `web/index.html` (constantes `ALUMNOS_CSV_URL` y `CALIFICACIONES_CSV_URL`) y para el flujo de n8n.
8. Captura 2-3 alumnos de prueba en ambas pestañas para poder probar el resto del flujo.
