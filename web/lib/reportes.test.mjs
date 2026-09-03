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
