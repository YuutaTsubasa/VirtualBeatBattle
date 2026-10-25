// 全部曲子 × 難度的譜面資料（scripts/gen-charts.mjs 寫成 charts.json；測試拿來比對有沒有過期）
import { SONGS } from '../audio/songs.js';
import { TRACKS, LEVELS } from './tracks.js';
import { generateChart, ratingOf } from './chartgen.js';

export function buildCharts() {
  return {
    songs: TRACKS.map((tr) => {
      const song = SONGS[tr.song];
      const charts = {};
      let lengthMs = 0;
      for (const { id } of LEVELS) {
        const { notes, lengthMs: len } = generateChart(song, id, tr.repeat);
        lengthMs = len;
        charts[id] = { rating: ratingOf(notes, len), notes };
      }
      return { id: tr.id, bpm: song.bpm, length_ms: lengthMs, charts };
    }),
  };
}
