// Rating（玩家的實力值，像 CHUNITHM 那樣）：純函式，Node 也能跑（tests/rating.test.js）
//
// 一個譜面的 Rating ＝ 那個譜面的等級 ± 看分數：
//   1,000,000（全 Perfect 的滿分）等級 +2；SSS（990,000）+1.5；SS（970,000）+1；S（940,000）＝ 等級；
//   A（880,000）−2；B（800,000）−4；再低就照比例降到 500,000 分的 0。中間用直線連起來。
// 玩家的 Rating ＝ 最好的 BEST_COUNT 個譜面的平均（不到那麼多個就當 0 算，打越多首越高）。
// 所以「Rating 12.50」大約是「等級 11.5 的譜面能打到 SS」的實力。

export const BEST_COUNT = 10;

// [分數, 等級加減]：由高到低
const STEPS = [
  [1_000_000, 2],
  [990_000, 1.5],
  [970_000, 1],
  [940_000, 0],
  [880_000, -2],
  [800_000, -4],
];

/** 一個譜面的 Rating（level 是譜面等級，score 0～1,000,000） */
export function chartRating(level, score) {
  if (!score) return 0;
  if (score >= STEPS[0][0]) return level + STEPS[0][1];
  for (let i = 1; i < STEPS.length; i++) {
    const [hiScore, hiBonus] = STEPS[i - 1];
    const [loScore, loBonus] = STEPS[i];
    if (score >= loScore) return Math.max(0, level + loBonus + ((score - loScore) / (hiScore - loScore)) * (hiBonus - loBonus));
  }
  // B 以下：B 那一點的值，照比例降到 500,000 分的 0
  const atB = Math.max(0, level + STEPS.at(-1)[1]);
  return Math.max(0, (atB * (score - 500_000)) / (STEPS.at(-1)[0] - 500_000));
}

/**
 * 玩家的 Rating：bests 是 { 'song:level': { score } }（progress.js 存的最佳成績），levelOf(song, level) 回傳譜面等級（不存在回傳 null）。
 * 回傳 { rating, top: [{ song, level, value }] }
 */
export function playerRating(bests, levelOf) {
  const all = Object.entries(bests)
    .map(([key, best]) => {
      const [song, level] = key.split(':');
      const lv = levelOf(song, level);
      return lv == null ? null : { song, level, value: chartRating(lv, best.score) };
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value);
  const top = all.slice(0, BEST_COUNT);
  return { rating: top.reduce((s, x) => s + x.value, 0) / BEST_COUNT, top };
}

/** 顯示用：兩位小數（無條件捨去，跟一般音樂遊戲一樣） */
export const formatRating = (r) => (Math.floor(r * 100) / 100).toFixed(2);

/** Rating 的顏色等級（選曲、結算畫面的徽章）：0 白 → 4 綠 → 7 橘 → 10 紅 → 13 紫 → 16 彩虹 */
export function ratingTier(r) {
  if (r >= 16) return 'rainbow';
  if (r >= 13) return 'purple';
  if (r >= 10) return 'red';
  if (r >= 7) return 'orange';
  if (r >= 4) return 'green';
  return 'white';
}
