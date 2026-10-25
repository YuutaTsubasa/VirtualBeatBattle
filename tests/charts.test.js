// 譜面：crates/beat-core/charts.json 要跟曲子＋產生器算出來的一樣（改了曲子或 chartgen.js 忘了 npm run charts 會在這裡抓到）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCharts } from '../src/lib/game/charts-data.js';

test('charts.json is up to date', () => {
  const saved = JSON.parse(readFileSync(new URL('../crates/beat-core/charts.json', import.meta.url), 'utf8'));
  assert.deepEqual(saved, buildCharts(), '曲子或產生器改過了，請跑 npm run charts');
});

test('every chart has holds, chords and (on hard) mines', () => {
  for (const s of buildCharts().songs) {
    for (const [level, c] of Object.entries(s.charts)) {
      const holds = c.notes.filter((n) => n[2] > 0).length;
      const chords = c.notes.filter((n, i, a) => i > 0 && a[i - 1][0] === n[0]).length;
      assert.ok(holds > 0, `${s.id} ${level} 沒有長押`);
      if (level !== 'easy') assert.ok(chords > 0, `${s.id} ${level} 沒有同時押`);
      assert.ok(c.notes.every((n) => n[1] >= 0 && n[1] < 6), `${s.id} ${level} 軌道超出範圍`);
    }
  }
});
