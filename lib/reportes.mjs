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

function studentsFromEntries(alumnosList, pendientesList) {
  const alumnos = new Map(alumnosList.map(a => [a.name, a]));

  for (const item of pendientesList) {
    if (!alumnos.has(item.alumno)) {
      alumnos.set(item.alumno, { name: item.alumno, wa: null });
    }
  }

  const students = Array.from(alumnos.values()).map(a => ({
    name: a.name,
    wa: a.wa,
    items: pendientesList.filter(p => p.alumno === a.name).map(p => ({ m: p.m, c: p.c })),
  }));

  students.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return students;
}

export function studentsFromCSVs(alumnosText, calificacionesText) {
  const alumnos = Array.from(alumnosFromCSV(alumnosText).values());
  const pendientes = calificacionesFromCSV(calificacionesText);
  return studentsFromEntries(alumnos, pendientes);
}

function str(value) {
  return String(value ?? '').trim();
}

export function studentsFromApiRows(alumnosRows, calificacionesRows) {
  const alumnos = alumnosRows
    .map(r => ({ name: str(r.NOMBRE), wa: str(r.WHATSAPP) || null }))
    .filter(a => a.name);
  const pendientes = calificacionesRows
    .map(r => ({
      alumno: str(r.ALUMNO),
      m: str(r.MODULO),
      c: str(r.CALIFICACION),
      reportado: str(r.REPORTADO),
    }))
    .filter(r => r.alumno && r.m && !r.reportado);
  return studentsFromEntries(alumnos, pendientes);
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
