import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, alumnosFromCSV, calificacionesFromCSV, studentsFromCSVs, calClass, filterStudents } from './reportes.mjs';

const ALUMNOS_CSV = 'NOMBRE,WHATSAPP\nSofía Ramírez Tello,5233112233\nKevin Alexander Ruiz,\n';
const CALIF_CSV =
  'ALUMNO,MODULO,CALIFICACION,REPORTADO\n' +
  'Sofía Ramírez Tello,14,8.5,\n' +
  'Sofía Ramírez Tello,10,9,2026-08-01\n' +
  'Kevin Alexander Ruiz,7,5,\n';

test('parseCSV separa filas y columnas simples', () => {
  const rows = parseCSV('A,B\n1,2\n');
  assert.deepEqual(rows, [['A', 'B'], ['1', '2']]);
});

test('parseCSV respeta comas dentro de comillas', () => {
  const rows = parseCSV('NOMBRE,NOTA\n"Pérez, Ana",8\n');
  assert.deepEqual(rows, [['NOMBRE', 'NOTA'], ['Pérez, Ana', '8']]);
});

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
