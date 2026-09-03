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
5. Crea una tercera pestaña llamada `StaffAutorizado` y en la fila 1 escribe: `EMAIL` en A1.
   - Debajo, una fila por cada cuenta de Google que deba poder entrar a la herramienta (por ejemplo, la tuya y la de quien más capture calificaciones).
6. **No publiques este Sheets en la Web.** A diferencia de la primera versión de este diseño, ahora la página nunca lee el Sheets directamente — se lo pide a n8n, y n8n solo lo entrega a sesiones de Google ya autorizadas (ver `docs/google-signin-setup.md`). Mantener el Sheets privado (compartido solo con la cuenta de n8n) es justo lo que evita que cualquiera con un link pueda ver los datos de los alumnos.
7. Anota el ID del Sheets (lo que está entre `/d/` y `/edit` en la barra de direcciones) — se necesita para el flujo de n8n (`docs/n8n-import.md`).
8. Captura 2-3 alumnos de prueba en las pestañas `Alumnos` y `Calificaciones`, y tu propio correo en `StaffAutorizado`, para poder probar el resto del flujo.
