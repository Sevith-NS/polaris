import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withAlpha } from './theme';

test('a hex token gets an alpha for canvas, anything else passes through', () => {
  assert.equal(withAlpha('#FF7A75', 0.4), 'rgba(255, 122, 117, 0.4)');
  assert.equal(withAlpha(' 3dd68c ', 1), 'rgba(61, 214, 140, 1)');
  assert.equal(withAlpha('red', 0.5), 'red');
});
