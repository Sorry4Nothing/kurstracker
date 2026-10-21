import { test } from 'node:test';
import assert from 'node:assert/strict';

// Wegwerf-Test fuer #64: beweist, dass ein roter Check den Merge nach develop blockiert
test('absichtlich rot', () => {
  assert.fail('Absichtlich roter Test fuer die Pruefung des Branch-Schutzes (#64)');
});
