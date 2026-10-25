// Rating：譜面的 Rating 照分數的關卡點走、玩家的 Rating 是最好 10 個的平均
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartRating, playerRating, formatRating, BEST_COUNT } from '../src/lib/game/rating.js';

test('chart rating follows the score steps', () => {
  assert.equal(chartRating(12, 1_000_000), 14);
  assert.equal(chartRating(12, 990_000), 13.5);
  assert.equal(chartRating(12, 970_000), 13);
  assert.equal(chartRating(12, 940_000), 12);
  assert.equal(chartRating(12, 955_000), 12.5);
  assert.equal(chartRating(12, 880_000), 10);
  assert.equal(chartRating(12, 800_000), 8);
  assert.equal(chartRating(12, 650_000), 4);
  assert.equal(chartRating(12, 500_000), 0);
  assert.equal(chartRating(12, 0), 0);
  assert.equal(chartRating(2, 800_000), 0); // 低等級不會變負的
});

test('player rating averages the best charts', () => {
  const levels = { a: 10, b: 8, c: 4 };
  const lv = (song) => levels[song] ?? null;
  const { rating, top } = playerRating({ 'a:hard': { score: 970_000 }, 'b:hard': { score: 940_000 }, 'c:easy': { score: 1_000_000 }, 'gone:hard': { score: 1_000_000 } }, lv);
  assert.equal(top.length, 3); // 已經沒有的曲子不算
  assert.deepEqual(top.map((x) => x.value), [11, 8, 6]);
  assert.equal(rating, 25 / BEST_COUNT);
  assert.equal(formatRating(12.349), '12.34');
});
