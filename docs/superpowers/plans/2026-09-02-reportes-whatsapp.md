# Reportes de calificaciones por WhatsApp — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la mini-herramienta completa: página web que lee dos pestañas de un Google Sheets nuevo, genera y envía por WhatsApp (vía Evolution API) el reporte de calificaciones de un alumno usando una plantilla en Google Slides, orquestado por un flujo de n8n.

**Architecture:** Página estática (HTML + módulo JS sin dependencias) hospedada en GitHub Pages, que lee dos Google Sheets publicados como CSV y llama a un webhook de n8n. n8n valida los datos, arma la imagen del reporte duplicando y rellenando una diapositiva de Google Slides, la exporta como PNG, la envía por WhatsApp vía Evolution API, y marca las calificaciones como reportadas en el Sheet.

**Tech Stack:** HTML/CSS/JS vanilla (sin framework, sin build step), Node.js `node:test` para las pruebas del módulo de datos, n8n (Webhook, Google Sheets, HTTP Request, Respond to Webhook), Google Slides API + Google Drive API, Evolution API (WhatsApp).

## Global Constraints

- No se modifica el Google Sheets ni el sitio de `avance-modular-dashboard` existentes (spec §2).
- La plantilla vigente es `web/assets/base-alone.png` — sin campo "no. de control" (spec §2).
- Credenciales (OAuth de Google, URL/API key de Evolution API) van siempre como credenciales de n8n, nunca escritas en el código de la página ni en el JSON del flujo (spec §7).
- La API key de Evolution API se configura al final, después de que el resto del flujo esté armado (spec §7, pedido explícito del usuario).
- Un reporte muestra como máximo 5 calificaciones pendientes por alumno; si hay más de 5, se avisa para revisar a mano en vez de recortar información (spec §6).
- Antes de dar la integración por terminada, correr el checklist de `/security-review` (maneja datos de menores de edad).

---

## File Structure

- `web/lib/reportes.mjs` — módulo puro (sin dependencias) con el parseo de los dos CSV de Google Sheets, el cruce alumno↔calificaciones pendientes, la clasificación de calificación (aprobatoria/no aprobatoria/NP) y el filtrado. Es el único archivo con lógica de negocio no trivial, por eso es el único con pruebas automatizadas.
- `web/lib/reportes.test.mjs` — pruebas de `reportes.mjs` con `node:test`.
- `web/index.html` — ya existe con el diseño aprobado y datos de ejemplo; se modifica para cargar datos reales desde los Sheets y llamar al webhook real de n8n en vez de simular la respuesta.
- `docs/sheets-setup.md` — instrucciones paso a paso para crear el Google Sheets nuevo en `institutoalonecrm@gmail.com`.
- `docs/slides-template-setup.md` — instrucciones paso a paso para recrear `base alone.png` como plantilla de Google Slides.
- `n8n/workflow.json` — el flujo de n8n completo, listo para importar.
- `docs/n8n-import.md` — cómo importar el flujo, conectar credenciales, y qué probar en cada nodo (incluye, al final, Evolution API).
- `docs/publicar-github-pages.md` — cómo subir `web/` a un repo de GitHub y activar GitHub Pages.

---

### Task 1: Módulo de datos (`reportes.mjs`) con pruebas

**Files:**
- Create: `web/lib/reportes.mjs`
- Test: `web/lib/reportes.test.mjs`

**Interfaces:**
- Produces: `parseCSV(text) -> string[][]`, `alumnosFromCSV(text) -> Map<string,{name,wa}>`, `calificacionesFromCSV(text) -> {alumno,m,c}[]` (excluye filas con `REPORTADO` no vacío), `studentsFromCSVs(alumnosText, calificacionesText) -> {name,wa,items:{m,c}[]}[]` (ordenado alfabéticamente), `calClass(c) -> 'aprob'|'noaprob'|'np'`, `filterStudents(students, {term, modulo, calificacion}) -> student[]`.
- Consumes: nada (módulo puro, sin dependencias externas).

- [ ] **Step 1: Crear la carpeta y el archivo de pruebas con el primer caso (parseCSV)**

```javascript
// web/lib/reportes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from './reportes.mjs';

test('parseCSV separa filas y columnas simples', () => {
  const rows = parseCSV('A,B\n1,2\n');
  assert.deepEqual(rows, [['A', 'B'], ['1', '2']]);
});

test('parseCSV respeta comas dentro de comillas', () => {
  const rows = parseCSV('NOMBRE,NOTA\n"Pérez, Ana",8\n');
  assert.deepEqual(rows, [['NOMBRE', 'NOTA'], ['Pérez, Ana', '8']]);
});
```

- [ ] **Step 2: Ejecutar las pruebas y confirmar que fallan (el módulo no existe aún)**

Run: `node --test web/lib/reportes.test.mjs`
Expected: FAIL — `Cannot find module './reportes.mjs'`

- [ ] **Step 3: Implementar `parseCSV`**

```javascript
// web/lib/reportes.mjs
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
```

- [ ] **Step 4: Ejecutar las pruebas y confirmar que pasan**

Run: `node --test web/lib/reportes.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add web/lib/reportes.mjs web/lib/reportes.test.mjs
git commit -m "test: parseCSV para las pestañas del Sheets"
```

- [ ] **Step 6: Agregar pruebas para `alumnosFromCSV` y `calificacionesFromCSV`**

```javascript
// agregar a web/lib/reportes.test.mjs
import { alumnosFromCSV, calificacionesFromCSV } from './reportes.mjs';

const ALUMNOS_CSV = 'NOMBRE,WHATSAPP\nSofía Ramírez Tello,5233112233\nKevin Alexander Ruiz,\n';
const CALIF_CSV =
  'ALUMNO,MODULO,CALIFICACION,REPORTADO\n' +
  'Sofía Ramírez Tello,14,8.5,\n' +
  'Sofía Ramírez Tello,10,9,2026-08-01\n' +
  'Kevin Alexander Ruiz,7,5,\n';

test('alumnosFromCSV arma un mapa por nombre, con WHATSAPP null si viene vacío', () => {
  const alumnos = alumnosFromCSV(ALUMNOS_CSV);
  assert.equal(alumnos.get('Sofía Ramírez Tello').wa, '5233112233');
  assert.equal(alumnos.get('Kevin Alexander Ruiz').wa, null);
});

test('calificacionesFromCSV excluye filas ya REPORTADAS', () => {
  const items = calificacionesFromCSV(CALIF_CSV);
  assert.equal(items.length, 2);
  assert.equal(items.some(i => i.m === '10'), false);
});
```

- [ ] **Step 7: Ejecutar y confirmar que fallan**

Run: `node --test web/lib/reportes.test.mjs`
Expected: FAIL — `alumnosFromCSV is not a function` / `calificacionesFromCSV is not a function`

- [ ] **Step 8: Implementar `alumnosFromCSV` y `calificacionesFromCSV`**

```javascript
// agregar a web/lib/reportes.mjs
function findHeaderIndex(rows, headerName) {
  return rows.findIndex(r => (r[0] || '').trim().toUpperCase() === headerName);
}

export function alumnosFromCSV(text) {
  const rows = parseCSV(text);
  const headerIdx = findHeaderIndex(rows, 'NOMBRE');
  if (headerIdx === -1) throw new Error('No se encontró el encabezado "NOMBRE" en la pestaña Alumnos.');
  const alumnos = new Map();
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const nombre = (rows[i][0] || '').trim();
    const whatsapp = (rows[i][1] || '').trim();
    if (!nombre) continue;
    alumnos.set(nombre, { name: nombre, wa: whatsapp || null });
  }
  return alumnos;
}

export function calificacionesFromCSV(text) {
  const rows = parseCSV(text);
  const headerIdx = findHeaderIndex(rows, 'ALUMNO');
  if (headerIdx === -1) throw new Error('No se encontró el encabezado "ALUMNO" en la pestaña Calificaciones.');
  const items = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const alumno = (rows[i][0] || '').trim();
    const modulo = (rows[i][1] || '').trim();
    const calificacion = (rows[i][2] || '').trim();
    const reportado = (rows[i][3] || '').trim();
    if (!alumno || !modulo) continue;
    if (reportado) continue;
    items.push({ alumno, m: modulo, c: calificacion });
  }
  return items;
}
```

- [ ] **Step 9: Ejecutar y confirmar que pasan (4 tests en total)**

Run: `node --test web/lib/reportes.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 10: Commit**

```bash
git add web/lib/reportes.mjs web/lib/reportes.test.mjs
git commit -m "feat: parseo de Alumnos y Calificaciones desde CSV"
```

- [ ] **Step 11: Agregar pruebas para `studentsFromCSVs`, `calClass` y `filterStudents`**

```javascript
// agregar a web/lib/reportes.test.mjs
import { studentsFromCSVs, calClass, filterStudents } from './reportes.mjs';

test('studentsFromCSVs cruza alumnos con sus calificaciones pendientes, ordenado por nombre', () => {
  const students = studentsFromCSVs(ALUMNOS_CSV, CALIF_CSV);
  assert.deepEqual(students.map(s => s.name), ['Kevin Alexander Ruiz', 'Sofía Ramírez Tello']);
  const sofia = students.find(s => s.name === 'Sofía Ramírez Tello');
  assert.deepEqual(sofia.items, [{ m: '14', c: '8.5' }]);
});

test('studentsFromCSVs incluye alumnos con calificación pendiente aunque falten en Alumnos', () => {
  const soloCalif = 'ALUMNO,MODULO,CALIFICACION,REPORTADO\nNuevo Alumno,3,7,\n';
  const students = studentsFromCSVs('NOMBRE,WHATSAPP\n', soloCalif);
  assert.equal(students.length, 1);
  assert.equal(students[0].wa, null);
});

test('calClass clasifica aprobatoria, no aprobatoria y NP', () => {
  assert.equal(calClass('8'), 'aprob');
  assert.equal(calClass('5.9'), 'noaprob');
  assert.equal(calClass('NP'), 'np');
});

test('filterStudents combina texto, módulo y calificación', () => {
  const students = studentsFromCSVs(ALUMNOS_CSV, CALIF_CSV);
  const soloKevin = filterStudents(students, { calificacion: 'noaprob' });
  assert.deepEqual(soloKevin.map(s => s.name), ['Kevin Alexander Ruiz']);

  const porModulo = filterStudents(students, { modulo: '14' });
  assert.deepEqual(porModulo.map(s => s.name), ['Sofía Ramírez Tello']);

  const porTexto = filterStudents(students, { term: 'kevin' });
  assert.deepEqual(porTexto.map(s => s.name), ['Kevin Alexander Ruiz']);
});
```

- [ ] **Step 12: Ejecutar y confirmar que fallan**

Run: `node --test web/lib/reportes.test.mjs`
Expected: FAIL — `studentsFromCSVs is not a function`

- [ ] **Step 13: Implementar `studentsFromCSVs`, `calClass` y `filterStudents`**

```javascript
// agregar a web/lib/reportes.mjs
export function studentsFromCSVs(alumnosText, calificacionesText) {
  const alumnos = alumnosFromCSV(alumnosText);
  const pendientes = calificacionesFromCSV(calificacionesText);

  for (const item of pendientes) {
    if (!alumnos.has(item.alumno)) {
      alumnos.set(item.alumno, { name: item.alumno, wa: null });
    }
  }

  const students = Array.from(alumnos.values()).map(a => ({
    name: a.name,
    wa: a.wa,
    items: pendientes.filter(p => p.alumno === a.name).map(p => ({ m: p.m, c: p.c })),
  }));

  students.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return students;
}

export function calClass(c) {
  if (c === 'NP') return 'np';
  return Number(c) >= 6 ? 'aprob' : 'noaprob';
}

export function filterStudents(students, { term = '', modulo = 'all', calificacion = 'all' } = {}) {
  const needle = term.trim().toLowerCase();
  return students.filter(s => {
    const nameOk = !needle || s.name.toLowerCase().includes(needle);
    const modOk = modulo === 'all' || s.items.some(i => String(i.m) === String(modulo));
    const calOk = calificacion === 'all' || s.items.some(i => calClass(i.c) === calificacion);
    return nameOk && modOk && calOk;
  });
}
```

- [ ] **Step 14: Ejecutar y confirmar que pasan (8 tests en total)**

Run: `node --test web/lib/reportes.test.mjs`
Expected: PASS (8 tests)

- [ ] **Step 15: Commit**

```bash
git add web/lib/reportes.mjs web/lib/reportes.test.mjs
git commit -m "feat: cruce de alumnos/calificaciones, clasificación y filtrado"
```

---

### Task 2: Conectar la página a los Sheets reales y al webhook de n8n

**Files:**
- Modify: `web/index.html` (reemplaza el arreglo `STUDENTS` de ejemplo y la simulación de envío por datos y llamadas reales)

**Interfaces:**
- Consumes: `studentsFromCSVs`, `filterStudents`, `calClass` de `web/lib/reportes.mjs` (Task 1).
- Produces: dos constantes configurables al inicio del `<script type="module">` — `ALUMNOS_CSV_URL`, `CALIFICACIONES_CSV_URL`, `WEBHOOK_URL` — que Task 6 actualiza con los valores reales.

- [ ] **Step 1: Cambiar el `<script>` a módulo e importar `reportes.mjs`**

En `web/index.html`, reemplazar la etiqueta `<script>` final (la que arma `STUDENTS`, `roster`, filtros y el manejador de clic) por `<script type="module">` y, como primera línea del bloque, importar el módulo:

```html
<script type="module">
  import { studentsFromCSVs, filterStudents, calClass } from './lib/reportes.mjs';
</script>
```

- [ ] **Step 2: Declarar la configuración y reemplazar el arreglo `STUDENTS` fijo por una carga real**

```javascript
  const ALUMNOS_CSV_URL = 'PENDIENTE_URL_ALUMNOS'; // Task 6 la reemplaza con la real
  const CALIFICACIONES_CSV_URL = 'PENDIENTE_URL_CALIFICACIONES'; // Task 6 la reemplaza con la real
  const WEBHOOK_URL = 'PENDIENTE_URL_WEBHOOK'; // Task 6 la reemplaza con la real

  let STUDENTS = [];
  const roster = document.getElementById('roster');
  const fMod = document.getElementById('fMod');
  const fCal = document.getElementById('fCal');
  const q = document.getElementById('q');

  async function cargarAlumnos() {
    roster.innerHTML = '<div class="row"><div class="name">Cargando alumnos…</div></div>';
    try {
      const [alumnosRes, califRes] = await Promise.all([
        fetch(ALUMNOS_CSV_URL + '&_=' + Date.now(), { cache: 'no-store' }),
        fetch(CALIFICACIONES_CSV_URL + '&_=' + Date.now(), { cache: 'no-store' }),
      ]);
      if (!alumnosRes.ok || !califRes.ok) throw new Error('No se pudo leer el Google Sheets.');
      const [alumnosText, califText] = await Promise.all([alumnosRes.text(), califRes.text()]);
      STUDENTS = studentsFromCSVs(alumnosText, califText);
      poblarFiltroModulo();
      render();
    } catch (err) {
      roster.innerHTML = `<div class="row"><div class="name">No se pudo cargar el Sheets: ${err.message}</div></div>`;
    }
  }
```

- [ ] **Step 3: Adaptar `poblarFiltroModulo`, `render` (antes `rowHTML`/`applyFilters`) para usar `STUDENTS` dinámico y `filterStudents`**

```javascript
  function poblarFiltroModulo() {
    const mods = Array.from(new Set(STUDENTS.flatMap(s => s.items.map(i => i.m))))
      .sort((a, b) => Number(a) - Number(b));
    fMod.innerHTML = '<option value="all">Todos los módulos</option>' +
      mods.map(m => `<option value="${m}">Módulo ${m}</option>`).join('');
  }

  function chipHTML(item) {
    const cls = calClass(item.c) !== 'aprob' ? 'low' : '';
    return `<span class="chip ${cls}">Mód. ${item.m} · ${item.c}</span>`;
  }

  function rowHTML(s, idx) {
    const items = s.items.length ? s.items.map(chipHTML).join('') : `<span class="chip none">al día</span>`;
    const waLine = s.wa ? `<span class="wa">${s.wa}</span>` : `<span class="wa">Sin WhatsApp registrado</span>`;
    const disabled = s.items.length === 0 ? 'disabled' : '';
    return `
      <div class="row" data-name="${s.name}">
        <div class="name">${s.name}${waLine}</div>
        <div class="items">${items}</div>
        <div class="status" data-status></div>
        <button class="gen" data-btn ${disabled}>${s.items.length === 0 ? 'Sin pendientes' : 'Generar reporte'}</button>
      </div>`;
  }

  function render() {
    const visibles = filterStudents(STUDENTS, { term: q.value, modulo: fMod.value, calificacion: fCal.value });
    roster.innerHTML = visibles.length
      ? visibles.map(rowHTML).join('')
      : '<div class="row"><div class="name">No hay alumnos que coincidan con el filtro.</div></div>';
    roster.querySelectorAll('.row[data-name]').forEach(row => {
      const s = STUDENTS.find(x => x.name === row.dataset.name);
      const btn = row.querySelector('[data-btn]');
      if (!btn || s.items.length === 0) return;
      btn.addEventListener('click', () => generarReporte(s, row, btn));
    });
  }

  [q, fMod, fCal].forEach(el => el.addEventListener('input', render));
```

- [ ] **Step 4: Reemplazar la simulación de envío por la llamada real al webhook**

```javascript
  function setStatus(row, cls, text) {
    const el = row.querySelector('[data-status]');
    el.className = 'status' + (cls ? ' ' + cls : '');
    el.innerHTML = cls ? `<span class="dot"></span>${text}` : text;
  }

  async function generarReporte(s, row, btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Enviando&hellip;';
    setStatus(row, '', 'Contactando a n8n…');
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: s.name }),
      });
      const data = await res.json();
      if (data.ok) {
        btn.classList.add('sent');
        btn.disabled = false;
        btn.textContent = 'Reenviar';
        setStatus(row, 'ok', data.message || 'Enviado por WhatsApp');
      } else {
        btn.disabled = false;
        btn.textContent = 'Generar reporte';
        setStatus(row, 'err', data.message || 'No se pudo generar el reporte');
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Generar reporte';
      setStatus(row, 'err', 'No se pudo contactar la automatización: ' + err.message);
    }
  }

  cargarAlumnos();
```

- [ ] **Step 5: Probar localmente con un servidor estático y un webhook simulado**

En una terminal, dentro de `web/`:

Run: `python -m http.server 8080`

En otra terminal, crear un webhook falso para probar sin depender de n8n todavía:

```javascript
// scratchpad/fake-webhook.mjs (archivo temporal, no se commitea)
import { createServer } from 'node:http';
createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, message: 'Enviado por WhatsApp · prueba local' }));
}).listen(3000, () => console.log('Fake webhook en http://localhost:3000'));
```

Run: `node scratchpad/fake-webhook.mjs`

Editar temporalmente las tres constantes de `web/index.html` con URLs de prueba (por ejemplo, CSV públicos de un Sheets de prueba y `WEBHOOK_URL = 'http://localhost:3000'`), abrir `http://localhost:8080` en el navegador y confirmar:
- Expected: la lista de alumnos carga desde el Sheets de prueba, los filtros funcionan, y al dar clic en "Generar reporte" el botón cambia a "Reenviar" con el mensaje "Enviado por WhatsApp · prueba local".

Revertir las constantes a `'PENDIENTE_URL_...'` antes de continuar (Task 6 las deja con los valores finales).

- [ ] **Step 6: Commit**

```bash
git add web/index.html
git commit -m "feat: conectar la página a Google Sheets y al webhook de n8n"
```

---

### Task 3: Instrucciones para crear el Google Sheets nuevo

**Files:**
- Create: `docs/sheets-setup.md`

**Interfaces:**
- Produces: la estructura de columnas exacta que Tasks 1, 2 y 5 asumen (`NOMBRE`, `WHATSAPP` en "Alumnos"; `ALUMNO`, `MODULO`, `CALIFICACION`, `REPORTADO` en "Calificaciones"), y el patrón de URL CSV que Task 2 usa en `ALUMNOS_CSV_URL` / `CALIFICACIONES_CSV_URL`.

- [ ] **Step 1: Escribir el documento**

```markdown
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
7. Anota las dos URLs (Alumnos y Calificaciones) y el ID del Sheets — se necesitan en Task 2 (Paso 5, para probar) y en Task 6.
8. Captura 2-3 alumnos de prueba en ambas pestañas para poder probar el resto del flujo.
```

- [ ] **Step 2: Commit**

```bash
git add docs/sheets-setup.md
git commit -m "docs: instrucciones para crear el Google Sheets de Reportes ALONE"
```

---

### Task 4: Instrucciones para recrear la plantilla en Google Slides

**Files:**
- Create: `docs/slides-template-setup.md`

**Interfaces:**
- Produces: la lista exacta de placeholders (`{{NOMBRE}}`, `{{MOD1}}..{{MOD5}}`, `{{CAL1}}..{{CAL5}}`) que Task 5 (nodo de Slides en n8n) reemplaza vía `replaceAllText`.

- [ ] **Step 1: Escribir el documento**

```markdown
# Crear la plantilla de reporte en Google Slides

1. Entra a Google Drive con `institutoalonecrm@gmail.com` y crea una presentación nueva: "Plantilla Reporte ALONE".
2. En la única diapositiva, ve a `Diapositiva > Cambiar fondo > Elegir imagen` y sube `web/assets/base-alone.png`. Confirma que la imagen cubre toda la diapositiva (tamaño de diapositiva recomendado: 13.33 x 10 in / widescreen, igual proporción que la imagen — ajusta el tamaño de la diapositiva en `Archivo > Configurar página` si se ve recortada).
3. Inserta una caja de texto transparente (`Insertar > Cuadro de texto`, sin relleno ni borde) exactamente sobre la línea en blanco después de "ALUMNO" y escribe: `{{NOMBRE}}`.
4. Inserta 5 cajas de texto transparentes sobre la fila "MODULO" de la tabla (una por columna) con: `{{MOD1}}`, `{{MOD2}}`, `{{MOD3}}`, `{{MOD4}}`, `{{MOD5}}`.
5. Inserta 5 cajas de texto transparentes sobre la fila "CALIFICACIÓN" con: `{{CAL1}}`, `{{CAL2}}`, `{{CAL3}}`, `{{CAL4}}`, `{{CAL5}}`.
6. Ajusta la fuente/tamaño de cada caja para que combine visualmente con el resto de la plantilla.
7. Abre la presentación y copia dos IDs de la URL (`https://docs.google.com/presentation/d/PRESENTATION_ID/edit#slide=id.SLIDE_ID`):
   - `PRESENTATION_ID` — el ID de la presentación completa.
   - `SLIDE_ID` — el ID de la diapositiva plantilla (la que tiene los placeholders).
   Anótalos, se necesitan en Task 6 para configurar el flujo de n8n.
8. Prueba manual: en la diapositiva, reemplaza a mano `{{NOMBRE}}` por un nombre de prueba y un par de `{{MODn}}`/`{{CALn}}` por valores, y expórtala (`Archivo > Descargar > Imagen PNG`). Compárala visualmente contra `web/assets/base-alone.png` — debe verse idéntica salvo por los datos. Deshaz los cambios de prueba (Ctrl+Z) antes de continuar.
```

- [ ] **Step 2: Commit**

```bash
git add docs/slides-template-setup.md
git commit -m "docs: instrucciones para la plantilla de Google Slides"
```

---

### Task 5: Flujo de n8n (`n8n/workflow.json`)

**Files:**
- Create: `n8n/workflow.json`
- Create: `docs/n8n-import.md`

**Interfaces:**
- Consumes: URLs/IDs de Tasks 3 y 4 (Sheet ID + gids, Presentation ID + Slide ID).
- Produces: el `WEBHOOK_URL` que Task 6 pega en `web/index.html`; el contrato de respuesta JSON `{ ok: boolean, message: string }` que Task 2 (Step 4) ya consume.

- [ ] **Step 1: Antes de tocar nodos, invocar las skills de n8n para esta sesión**

Este workflow se construye sin una instancia de n8n conectada a esta sesión (no hay herramientas `n8n-mcp` disponibles ahora). Antes de crear o ajustar nodos, invoca `n8n-mcp-skills:using-n8n-mcp-skills`, y en particular `n8n-mcp-skills:n8n-workflow-patterns` (patrón webhook + validación + respuesta) y `n8n-mcp-skills:n8n-node-configuration` (parámetros exactos de Google Sheets y HTTP Request), para no adivinar formatos de parámetros. Si en el momento de ejecutar esta tarea SÍ hay una instancia de n8n conectada, usa `validate_workflow` sobre el JSON del Step 2 antes de darlo por bueno.

- [ ] **Step 2: Escribir el workflow completo**

```json
{
  "name": "Reportes ALONE - WhatsApp",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "generar-reporte",
        "responseMode": "responseNode",
        "options": {}
      },
      "name": "Webhook Generar Reporte",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [-1180, 0],
      "webhookId": "generar-reporte-alone"
    },
    {
      "parameters": {
        "documentId": { "__rl": true, "value": "SHEET_ID_AQUI", "mode": "id" },
        "sheetName": { "__rl": true, "value": "Calificaciones", "mode": "name" },
        "filtersUI": {
          "values": [
            { "lookupColumn": "ALUMNO", "lookupValue": "={{ $json.body.nombre }}" }
          ]
        },
        "options": {}
      },
      "name": "Leer Calificaciones pendientes",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4.5,
      "position": [-960, 0]
    },
    {
      "parameters": {
        "jsCode": "const rows = $input.all().map(i => i.json).filter(r => !r.REPORTADO);\nreturn [{ json: { pendientes: rows, nombre: $('Webhook Generar Reporte').first().json.body.nombre } }];"
      },
      "name": "Filtrar no reportadas",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [-740, 0]
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": { "leftValue": "", "caseSensitive": true, "typeValidation": "strict" },
                "conditions": [
                  { "leftValue": "={{ $json.pendientes.length }}", "rightValue": 0, "operator": { "type": "number", "operation": "equals" } }
                ],
                "combinator": "and"
              },
              "outputKey": "sin_pendientes"
            },
            {
              "conditions": {
                "options": { "leftValue": "", "caseSensitive": true, "typeValidation": "strict" },
                "conditions": [
                  { "leftValue": "={{ $json.pendientes.length }}", "rightValue": 5, "operator": { "type": "number", "operation": "gt" } }
                ],
                "combinator": "and"
              },
              "outputKey": "demasiadas"
            }
          ]
        },
        "options": { "fallbackOutput": "extra", "renameFallbackOutput": "ok" }
      },
      "name": "Validar cantidad",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.2,
      "position": [-520, 0]
    },
    {
      "parameters": {
        "documentId": { "__rl": true, "value": "SHEET_ID_AQUI", "mode": "id" },
        "sheetName": { "__rl": true, "value": "Alumnos", "mode": "name" },
        "filtersUI": {
          "values": [
            { "lookupColumn": "NOMBRE", "lookupValue": "={{ $json.nombre }}" }
          ]
        },
        "options": {}
      },
      "name": "Leer WhatsApp del alumno",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4.5,
      "position": [-300, 40]
    },
    {
      "parameters": {
        "conditions": {
          "options": { "leftValue": "", "caseSensitive": true, "typeValidation": "strict" },
          "conditions": [
            { "leftValue": "={{ $json.WHATSAPP }}", "rightValue": "", "operator": { "type": "string", "operation": "equals" } }
          ],
          "combinator": "and"
        }
      },
      "name": "¿Sin WhatsApp?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2.2,
      "position": [-80, 40]
    },
    {
      "parameters": {
        "url": "=https://slides.googleapis.com/v1/presentations/PRESENTATION_ID_AQUI:batchUpdate",
        "method": "POST",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "googleSlidesOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { requests: [ { duplicateObject: { objectId: 'SLIDE_ID_AQUI' } } ] } }}"
      },
      "name": "Duplicar diapositiva plantilla",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [140, 0]
    },
    {
      "parameters": {
        "jsCode": "const pendientes = $('Filtrar no reportadas').first().json.pendientes;\nconst newSlideId = $json.replies[0].duplicateObject.objectId;\nconst nombre = $('Filtrar no reportadas').first().json.nombre;\nconst reqs = [{ replaceAllText: { containsText: { text: '{{NOMBRE}}' }, replaceText: nombre, pageObjectIds: [newSlideId] } }];\nfor (let i = 0; i < 5; i++) {\n  reqs.push({ replaceAllText: { containsText: { text: `{{MOD${i+1}}}` }, replaceText: pendientes[i] ? String(pendientes[i].MODULO) : '', pageObjectIds: [newSlideId] } });\n  reqs.push({ replaceAllText: { containsText: { text: `{{CAL${i+1}}}` }, replaceText: pendientes[i] ? String(pendientes[i].CALIFICACION) : '', pageObjectIds: [newSlideId] } });\n}\nreturn [{ json: { requests: reqs, newSlideId } }];"
      },
      "name": "Armar reemplazos",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [360, 0]
    },
    {
      "parameters": {
        "url": "=https://slides.googleapis.com/v1/presentations/PRESENTATION_ID_AQUI:batchUpdate",
        "method": "POST",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "googleSlidesOAuth2Api",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { requests: $json.requests } }}"
      },
      "name": "Rellenar datos en la diapositiva",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [580, 0]
    },
    {
      "parameters": {
        "url": "=https://www.googleapis.com/drive/v3/files/{{ $('Armar reemplazos').first().json.newSlideId }}/export?mimeType=image/png",
        "method": "GET",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "googleDriveOAuth2Api",
        "options": { "response": { "response": { "responseFormat": "file" } } }
      },
      "name": "Exportar diapositiva como PNG",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [800, 0]
    },
    {
      "parameters": {
        "url": "={{ $env.EVOLUTION_API_URL }}/message/sendMedia/{{ $env.EVOLUTION_INSTANCE }}",
        "method": "POST",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ { number: $('Leer WhatsApp del alumno').first().json.WHATSAPP, mediatype: 'image', caption: 'Reporte de calificaciones de ' + $('Filtrar no reportadas').first().json.nombre, media: $binary.data.data } }}"
      },
      "name": "Enviar por WhatsApp (Evolution API)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1020, 0]
    },
    {
      "parameters": {
        "documentId": { "__rl": true, "value": "SHEET_ID_AQUI", "mode": "id" },
        "sheetName": { "__rl": true, "value": "Calificaciones", "mode": "name" },
        "columns": {
          "mappingMode": "defineBelow",
          "value": { "REPORTADO": "={{ $now.toISO() }}" },
          "matchingColumns": ["ALUMNO", "MODULO"]
        },
        "options": {}
      },
      "name": "Marcar como REPORTADO",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4.5,
      "position": [1240, 0]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: true, message: 'Enviado por WhatsApp' } }}"
      },
      "name": "Responder éxito",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [1460, 0]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: false, message: 'Sin calificaciones nuevas para reportar' } }}"
      },
      "name": "Responder sin pendientes",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [-520, 220]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: false, message: 'Hay más de 5 calificaciones pendientes — revisa el Sheet' } }}"
      },
      "name": "Responder demasiadas",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [-520, 320]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { ok: false, message: 'Este alumno no tiene WhatsApp registrado en la pestaña Alumnos' } }}"
      },
      "name": "Responder sin WhatsApp",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.4,
      "position": [-80, 220]
    }
  ],
  "connections": {
    "Webhook Generar Reporte": { "main": [[{ "node": "Leer Calificaciones pendientes", "type": "main", "index": 0 }]] },
    "Leer Calificaciones pendientes": { "main": [[{ "node": "Filtrar no reportadas", "type": "main", "index": 0 }]] },
    "Filtrar no reportadas": { "main": [[{ "node": "Validar cantidad", "type": "main", "index": 0 }]] },
    "Validar cantidad": {
      "main": [
        [{ "node": "Responder sin pendientes", "type": "main", "index": 0 }],
        [{ "node": "Responder demasiadas", "type": "main", "index": 0 }],
        [{ "node": "Leer WhatsApp del alumno", "type": "main", "index": 0 }]
      ]
    },
    "Leer WhatsApp del alumno": { "main": [[{ "node": "¿Sin WhatsApp?", "type": "main", "index": 0 }]] },
    "¿Sin WhatsApp?": {
      "main": [
        [{ "node": "Responder sin WhatsApp", "type": "main", "index": 0 }],
        [{ "node": "Duplicar diapositiva plantilla", "type": "main", "index": 0 }]
      ]
    },
    "Duplicar diapositiva plantilla": { "main": [[{ "node": "Armar reemplazos", "type": "main", "index": 0 }]] },
    "Armar reemplazos": { "main": [[{ "node": "Rellenar datos en la diapositiva", "type": "main", "index": 0 }]] },
    "Rellenar datos en la diapositiva": { "main": [[{ "node": "Exportar diapositiva como PNG", "type": "main", "index": 0 }]] },
    "Exportar diapositiva como PNG": { "main": [[{ "node": "Enviar por WhatsApp (Evolution API)", "type": "main", "index": 0 }]] },
    "Enviar por WhatsApp (Evolution API)": { "main": [[{ "node": "Marcar como REPORTADO", "type": "main", "index": 0 }]] },
    "Marcar como REPORTADO": { "main": [[{ "node": "Responder éxito", "type": "main", "index": 0 }]] }
  }
}
```

Nota: en el nodo "¿Sin WhatsApp?" la salida `true` (rama 0) es "sin WhatsApp" y la salida `false` (rama 1) continúa el flujo — revisar en n8n que las ramas del `IF` queden conectadas en ese orden al importar, ya que el orden visual puede variar según la versión de n8n.

- [ ] **Step 3: Escribir `docs/n8n-import.md`**

```markdown
# Importar y configurar el flujo de n8n

1. En n8n, `Workflows > Import from File` y selecciona `n8n/workflow.json`.
2. Reemplaza en los nodos (usar buscar y reemplazar en el editor de n8n si tu versión lo permite, o nodo por nodo):
   - `SHEET_ID_AQUI` → el ID del Google Sheets de Task 3.
   - `PRESENTATION_ID_AQUI` → el ID de la presentación de Task 4.
   - `SLIDE_ID_AQUI` → el ID de la diapositiva plantilla de Task 4.
3. Crea/asigna las credenciales de Google (OAuth) en los nodos "Leer Calificaciones pendientes", "Leer WhatsApp del alumno", "Marcar como REPORTADO" (Google Sheets), y en "Duplicar diapositiva plantilla" / "Rellenar datos en la diapositiva" (Google Slides — tipo de credencial `googleSlidesOAuth2Api`) y "Exportar diapositiva como PNG" (Google Drive — `googleDriveOAuth2Api`). Todas deben autenticar con `institutoalonecrm@gmail.com`.
4. Activa el workflow y copia la URL del nodo "Webhook Generar Reporte" (botón "Listen" o la URL de producción una vez activado) — esa es la `WEBHOOK_URL` para Task 6.
5. Prueba cada tramo con el Sheets de prueba de Task 3 (Paso 8):
   - Ejecuta manualmente con un alumno sin calificaciones pendientes → debe responder `{ ok:false, message:'Sin calificaciones nuevas...' }`.
   - Con un alumno con 6+ pendientes → debe responder el mensaje de "demasiadas".
   - Con un alumno sin WhatsApp → debe responder el mensaje de "sin WhatsApp".
   - Con un alumno válido (1-5 pendientes, con WhatsApp) → sigue hasta "Duplicar diapositiva plantilla"; en este punto, si Evolution API aún no está configurada (se deja para el final), el flujo puede fallar en el nodo "Enviar por WhatsApp" — eso es esperado, confirma que sí llegó hasta ahí y que la imagen exportada en el nodo anterior se ve correcta.
6. Configuración de Evolution API (al final, cuando el resto ya esté probado):
   - Crea las variables de entorno de n8n `EVOLUTION_API_URL` y `EVOLUTION_INSTANCE` con los valores de tu instancia.
   - En el nodo "Enviar por WhatsApp (Evolution API)", crea una credencial de tipo "Header Auth" con el header `apikey` y el valor de tu API key de Evolution API — nunca escribir la key directamente en el nodo.
   - Corre la prueba completa de punta a punta con un número de WhatsApp real de prueba.
```

- [ ] **Step 4: Commit**

```bash
git add n8n/workflow.json docs/n8n-import.md
git commit -m "feat: flujo de n8n para generar y enviar el reporte por WhatsApp"
```

---

### Task 6: Conectar los valores reales en la página

**Files:**
- Modify: `web/index.html`

**Interfaces:**
- Consumes: URLs de Task 3 (Step 6), `WEBHOOK_URL` de Task 5 (`docs/n8n-import.md`, Paso 4).

- [ ] **Step 1: Reemplazar las constantes `PENDIENTE_URL_...`**

En `web/index.html`, dentro del `<script type="module">`, reemplazar:

```javascript
  const ALUMNOS_CSV_URL = 'PENDIENTE_URL_ALUMNOS';
  const CALIFICACIONES_CSV_URL = 'PENDIENTE_URL_CALIFICACIONES';
  const WEBHOOK_URL = 'PENDIENTE_URL_WEBHOOK';
```

por las URLs reales obtenidas en Task 3 y Task 5, por ejemplo:

```javascript
  const ALUMNOS_CSV_URL = 'https://docs.google.com/spreadsheets/d/TU_SHEET_ID/export?format=csv&gid=0';
  const CALIFICACIONES_CSV_URL = 'https://docs.google.com/spreadsheets/d/TU_SHEET_ID/export?format=csv&gid=TU_GID_CALIFICACIONES';
  const WEBHOOK_URL = 'https://TU-INSTANCIA-N8N/webhook/generar-reporte';
```

- [ ] **Step 2: También quitar el banner de "Vista previa con alumnos de ejemplo"**

Eliminar el bloque `<div class="banner">...</div>` de `web/index.html` (ya no aplica una vez conectado a datos reales).

- [ ] **Step 3: Probar en el navegador con datos y flujo reales**

Run: `python -m http.server 8080` (dentro de `web/`)

Abrir `http://localhost:8080`, y con los 2-3 alumnos de prueba de Task 3:
Expected: la lista carga desde el Sheets real, los filtros de módulo/calificación reflejan los módulos capturados, y "Generar reporte" en un alumno válido termina en "Enviado por WhatsApp" (o en el error correspondiente, según el caso de prueba armado en Task 5 Paso 5).

- [ ] **Step 4: Commit**

```bash
git add web/index.html
git commit -m "chore: conectar la página a las URLs reales de Sheets y n8n"
```

---

### Task 7: Publicar la página en GitHub Pages

**Files:**
- Create: `docs/publicar-github-pages.md`

- [ ] **Step 1: Escribir el documento**

```markdown
# Publicar la página en GitHub Pages

1. En GitHub, crea un repositorio nuevo (por ejemplo `alone-reportes-whatsapp`), vacío, sin README.
2. En esta carpeta (`reportes-alone-whatsapp`), conecta el repo remoto y sube todo:
   \`\`\`bash
   git remote add origin https://github.com/TU_USUARIO/alone-reportes-whatsapp.git
   git branch -M main
   git push -u origin main
   \`\`\`
3. En GitHub, ve a `Settings > Pages`.
4. En "Build and deployment", elige `Deploy from a branch`, rama `main`, carpeta `/web`.
5. Guarda y espera 1-2 minutos. GitHub te da la URL pública (algo como `https://TU_USUARIO.github.io/alone-reportes-whatsapp/`).
6. Abre esa URL y confirma que ves la página con la lista de alumnos reales (repite la prueba de Task 6, Paso 3, pero desde la URL pública).
```

- [ ] **Step 2: Commit**

```bash
git add docs/publicar-github-pages.md
git commit -m "docs: cómo publicar la página en GitHub Pages"
```

---

## Self-Review Notes

- **Cobertura de la spec:** §1 (objetivo) → Tasks 1-6. §2 (alcance) → constraint global + Task 3/4 crean recursos nuevos. §3 (Sheets) → Task 3. §4 (página) → Tasks 1, 2, 6, 7. §5 (plantilla) → Task 4. §6 (flujo n8n) → Task 5. §7 (credenciales) → constraint global + Task 5 Paso 3 del `n8n-import.md` (Evolution API al final). §9 (limitación de nombres duplicados) → documentada en la spec, no requiere tarea de código adicional (es una limitación aceptada, no un bug a corregir).
- **Placeholders:** los únicos marcadores de texto literal (`SHEET_ID_AQUI`, `PENDIENTE_URL_...`) son intencionales — valores que dependen de recursos externos que el usuario crea en Tasks 3-5 y que Task 6 sustituye; no son placeholders de lógica sin implementar.
- **Consistencia de tipos:** `studentsFromCSVs` devuelve `items:{m,c}[]`; `chipHTML`/`filterStudents`/`calClass` en Task 2 usan esos mismos nombres de campo (`m`, `c`) consistentemente con Task 1. El contrato `{ ok, message }` de la respuesta del webhook es el mismo en Task 2 (Step 4) y en todos los nodos "Responder..." de Task 5.
