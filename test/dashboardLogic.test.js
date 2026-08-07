import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDurationMinutes, parseDurationValue } from '../src/dashboardLogic.js';

test('parses numeric duration values', () => {
  assert.equal(parseDurationValue('1379.48'), 1379.48);
  assert.equal(parseDurationValue('3:30 PM'), 3.5);
});

test('calculates duration from start and end time', () => {
  assert.equal(calculateDurationMinutes('00:00:01', '23:59:59'), 1439.9666666666667);
  assert.equal(calculateDurationMinutes('01:30:00', '03:00:00'), 90);
});
