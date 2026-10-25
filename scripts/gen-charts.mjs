// 產生譜面：node scripts/gen-charts.mjs（npm run charts）
// 從 src/lib/audio/songs.js 的曲子自動排譜，寫進 crates/beat-core/charts.json（Rust 引擎用 include_str! 讀進去：
// 單機判定、連線房間的電腦對手、區網伺服器都用同一份）。改了曲子或產生器就要重跑；tests/charts.test.js 會檢查有沒有忘記。
import { writeFileSync } from 'node:fs';
import { buildCharts } from '../src/lib/game/charts-data.js';

const out = new URL('../crates/beat-core/charts.json', import.meta.url);
writeFileSync(out, JSON.stringify(buildCharts()) + '\n');
console.log('寫好了', out.pathname);
