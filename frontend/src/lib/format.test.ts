import { test } from 'node:test';
import assert from 'node:assert/strict';
import { direction, formatDateTime, formatDuration, formatPct, formatSignedMoney, recencyGroup } from './format';
import { EXCHANGES, sessionState } from './sessions';

test('changes that round to zero are flat, with no sign', () => {
  assert.equal(direction(-0.0001), 'flat');
  assert.equal(formatPct(-0.0001), '0.00%');
  assert.equal(formatSignedMoney(-0.004, 'USD'), '$0.00');
  assert.equal(direction(-0.006), 'down');
  assert.equal(formatPct(0.006), '+0.01%');
});

test('durations read in seconds, then minutes and seconds', () => {
  assert.equal(formatDuration(8_900), '8s');
  assert.equal(formatDuration(65_000), '1m 05s');
  assert.equal(formatDuration(-20), '0s');
});

test('a chat time reads day, month and clock, with the year only when it differs', () => {
  const now = new Date('2026-11-03T10:00:00Z');
  assert.equal(formatDateTime('2026-11-03T08:35:00Z', now, 'UTC'), '3 Nov, 08:35');
  assert.equal(formatDateTime('2025-12-31T23:05:00Z', now, 'UTC'), '31 Dec 2025, 23:05');
  assert.equal(formatDateTime('not a date', now), '');
});

test('chats group by calendar day, not by 24-hour windows', () => {
  const now = new Date(2026, 10, 3, 9, 0);   // local time, so the test holds in any time zone
  const at = (d: number, h: number) => new Date(2026, 10, d, h, 0).toISOString();
  assert.equal(recencyGroup(at(3, 1), now), 'Today');
  assert.equal(recencyGroup(at(2, 23), now), 'Yesterday');   // ten hours ago, but yesterday
  assert.equal(recencyGroup(at(28 - 31, 12), now), 'Previous 7 days');
  assert.equal(recencyGroup(new Date(2026, 9, 1).toISOString(), now), 'Older');
});

test('a closed exchange names its next session', () => {
  const nyse = EXCHANGES[1];
  // Saturday 2026-10-10 noon in New York: next open is Monday.
  assert.deepEqual(sessionState(nyse, new Date('2026-10-10T16:00:00Z')), { open: false, label: 'Opens Mon 09:30 local' });
  // Friday after the close.
  assert.equal(sessionState(nyse, new Date('2026-10-09T21:30:00Z')).label, 'Opens Mon 09:30 local');
  // Tuesday after the close.
  assert.equal(sessionState(nyse, new Date('2026-10-06T21:30:00Z')).label, 'Opens Wed 09:30 local');
});
