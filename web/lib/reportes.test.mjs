import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, alumnosFromCSV, calificacionesFromCSV } from './reportes.mjs';

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
