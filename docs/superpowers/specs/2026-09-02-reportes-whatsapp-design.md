# Diseño — Automatización de reportes de calificaciones por WhatsApp

Fecha: 2026-09-02
Proyecto: Instituto ALONE — herramienta independiente (no toca el dashboard `avance-modular-dashboard` ni su Google Sheets)

## 1. Objetivo

Dar de alta, desde una página web sencilla, un botón "Generar reporte" por alumno que:
1. Toma sus calificaciones nuevas (no reportadas aún) de un Google Sheets.
2. Rellena una imagen idéntica a la plantilla `base alone.png` con nombre del alumno, módulo(s) y calificación(es).
3. Envía esa imagen por WhatsApp (Evolution API) al número guardado del alumno/padre de familia.
4. Marca esas calificaciones como reportadas para no reenviarlas.

## 2. Alcance y separación

- Todo vive en un proyecto nuevo, independiente: Sheet nuevo, página nueva, flujo de n8n nuevo.
- No se modifica el Google Sheets ni el sitio de `avance-modular-dashboard`.
- Campo "no. de control" queda fuera — la plantilla vigente (`base alone.png`) solo tiene: nombre del alumno, tabla de módulo(s) y tabla de calificación(es) (hasta 5 columnas).

## 3. Google Sheets nuevo

- Cuenta: `institutoalonecrm@gmail.com`.
- Un archivo nuevo (no el mismo de avance modular), con dos pestañas:

**Pestaña "Alumnos"**
| NOMBRE | WHATSAPP |
|---|---|
| texto | número en formato internacional, ej. 52155XXXXXXXX |

**Pestaña "Calificaciones"**
| ALUMNO | MODULO | CALIFICACION | REPORTADO |
|---|---|---|---|
| debe coincidir con NOMBRE en "Alumnos" | número o nombre del módulo | número (o NP) | vacío hasta que se envía; luego fecha/hora |

## 4. Página web (mini-herramienta)

- HTML simple, sin backend propio, hospedada en GitHub Pages (repo nuevo que el usuario crea y sube).
- Lee la pestaña "Alumnos" (vía el mismo mecanismo CSV público que ya usa el dashboard existente) y muestra la lista de alumnos con un botón "Generar reporte" cada uno.
- Al hacer clic: llama al webhook de n8n pasando el nombre del alumno, deshabilita el botón, y muestra el resultado ("Enviado ✅" o el mensaje de error) que regresa n8n.

## 5. Plantilla del reporte

- Se recrea `base alone.png` como diapositiva de Google Slides: la imagen como fondo a pantalla completa, y cajas de texto transparentes exactamente sobre cada espacio en blanco (nombre del alumno, y cada columna de módulo/calificación).
- Placeholders de texto: `{{NOMBRE}}`, `{{MOD1}}`..`{{MOD5}}`, `{{CAL1}}`..`{{CAL5}}`.
- Al exportar como imagen, se ve idéntica a la plantilla original, solo con los datos ya escritos.
- Si un alumno tiene menos de 5 calificaciones nuevas, las columnas sobrantes quedan en blanco.

## 6. Flujo de n8n

1. **Webhook** recibe `{ nombre }`.
2. **Google Sheets — leer "Calificaciones"**: filtra filas de ese alumno con `REPORTADO` vacío.
   - Si no hay ninguna → responde error "Sin calificaciones nuevas para reportar" y termina.
   - Si hay más de 5 → responde error "Hay más de 5 calificaciones pendientes, revisa manualmente" y termina (no se recorta información).
3. **Google Sheets — leer "Alumnos"**: obtiene el `WHATSAPP` de ese alumno.
   - Si no hay número guardado → responde error claro y termina.
4. **Google Slides API**: duplica la diapositiva plantilla, reemplaza los placeholders con los datos reales.
5. **Google Drive API**: exporta la diapositiva duplicada como imagen (PNG).
6. **HTTP Request a Evolution API**: envía la imagen por WhatsApp al número obtenido, con un texto corto de acompañamiento.
7. **Google Sheets — actualizar "Calificaciones"**: marca las filas usadas con fecha/hora en `REPORTADO`.
8. **Respond to Webhook**: confirma éxito a la página.
9. Manejo de errores: cualquier falla en los pasos 4-6 detiene el flujo **antes** de marcar `REPORTADO`, y regresa un mensaje de error entendible a la página (nunca se pierde ni se duplica un envío).

## 7. Credenciales y seguridad

- Todas las credenciales (OAuth de Google, URL y API key de Evolution API) se configuran como credenciales dentro de n8n — nunca escritas directamente en el código de la página ni en el flujo exportado.
- La API key de Evolution API se deja para el final, cuando el resto del flujo ya esté armado y probado.
- Antes de dar por terminada la integración, se debe correr el checklist de `/security-review` dado que se maneja información de menores de edad (nombre, calificaciones, número de WhatsApp).

## 8. Qué entrega esta fase de diseño

Archivos que se preparan en este proyecto para que el usuario los suba:
- `web/index.html` — la página con la lista de alumnos y el botón "Generar".
- `web/assets/base-alone.png` — copia de la plantilla.
- Instrucciones paso a paso para crear las dos pestañas del Google Sheets nuevo.
- Instrucciones paso a paso para recrear la plantilla en Google Slides.
- `n8n/workflow.json` — el flujo de n8n listo para importar.

## 9. Limitación conocida

El alumno se identifica por su nombre (texto exacto) entre las pestañas "Alumnos" y "Calificaciones". Si dos alumnos llegaran a tener el mismo nombre, el sistema los confundiría. Mientras la lista de alumnos sea manejable, se soluciona escribiendo el nombre completo y evitando duplicados exactos; si esto crece mucho, se puede agregar un identificador único más adelante.

## 10. Fuera de alcance (por ahora)

- No se integra con el Google Sheets ni el dashboard existentes.
- No se envían correos electrónicos (se descartó a favor de WhatsApp).
- No se automatiza la configuración de Evolution API — se asume que ya está corriendo y conectada.
