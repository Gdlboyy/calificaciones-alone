# Configurar "Acceder con Google" (inicio de sesión)

Esto crea la identidad que le permite a la página saber quién eres antes de mostrar datos de alumnos. Se hace una sola vez.

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) con `institutoalonecrm@gmail.com`.
2. Crea un proyecto nuevo (o usa uno existente de esa cuenta), por ejemplo "Reportes ALONE".
3. Ve a `APIs y servicios > Pantalla de consentimiento OAuth`:
   - Tipo de usuario: **Externo** (no tienen Google Workspace, así que "Interno" no aplica).
   - Nombre de la app: "Reportes ALONE". Correo de soporte: `institutoalonecrm@gmail.com`.
   - No hace falta agregar scopes adicionales ni mandarla a verificación — con que quede en modo "Prueba" (Testing) es suficiente, ya que solo la usa tu propio staff.
   - En "Usuarios de prueba", agrega los mismos correos que vas a poner en la pestaña "StaffAutorizado" del Sheets (mientras la app esté en modo Prueba, Google solo deja iniciar sesión a los correos que agregues aquí).
4. Ve a `APIs y servicios > Credenciales > Crear credenciales > ID de cliente de OAuth`:
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: "Reportes ALONE — Web".
   - En "Orígenes autorizados de JavaScript" agrega:
     - La URL de tu GitHub Pages, por ejemplo `https://TU_USUARIO.github.io`.
     - `http://localhost:8080` (o el puerto que uses) si vas a probar en tu computadora antes de publicar.
   - No necesitas "URI de redireccionamiento autorizados" (el inicio de sesión de Google en esta página no redirige, usa el flujo de ID token).
   - Guarda y copia el **Client ID** (termina en `.apps.googleusercontent.com`). No necesitas el "Client secret" para esto.
5. Anota ese Client ID — se pega en dos lugares:
   - `index.html`, constante `GOOGLE_CLIENT_ID`.
   - `n8n/workflow.json`, en los nodos "Validar sesión (G)" y "Validar sesión (O)" (reemplaza `GOOGLE_CLIENT_ID_AQUI`).
6. En la pestaña "StaffAutorizado" del Google Sheets (ver `docs/sheets-setup.md`), agrega una fila por cada cuenta de Google que deba poder usar la herramienta.

## Cómo funciona (para que sepas qué esperar)

- Cuando alguien abre la página, ve un botón "Acceder con Google". Al iniciar sesión, Google le da a la página un "ID token" (una credencial firmada por Google, no una contraseña).
- La página manda ese token a n8n en cada petición. n8n lo valida directamente con Google y revisa que el correo esté en "StaffAutorizado" — si no, responde "no autorizado" y no hace nada más.
- Mientras el proyecto de Google Cloud esté en modo "Prueba", solo los correos que agregues como "Usuarios de prueba" en el paso 3 podrán iniciar sesión — esto es una capa extra de control además de la lista en el Sheets.
