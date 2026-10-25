// 全部曲子 × 難度的譜面資料（scripts/gen-charts.mjs 寫成 charts.json 與 charts-meta.json；測試拿來比對有沒有過期）
import { TRACKS, LEVELS, songOf, repeatOf } from './tracks.js';
import { generateChart, ratingOf } from './chartgen.js';

export function buildCharts() {
  return {
    songs: TRACKS.map((tr) => {
      const song = songOf(tr);
      const charts = {};
      let lengthMs = 0;
      for (const { id } of LEVELS) {
        const { notes, lengthMs: len } = generateChart(song, id, repeatOf(tr));
        lengthMs = len;
        charts[id] = { rating: ratingOf(notes, len), notes };
      }
      return { id: tr.id, bpm: song.bpm, length_ms: lengthMs, charts };
    }),
  };
}

/** 選曲畫面用的小份資料：長度、各難度的等級與音符數（不用把整份譜面載進網頁） */
export function chartsMeta(charts = buildCharts()) {
  return Object.fromEntries(
    charts.songs.map((s) => [
      s.id,
      {
        length_ms: s.length_ms,
        levels: Object.fromEntries(Object.entries(s.charts).map(([k, c]) => [k, { rating: c.rating, notes: c.notes.filter((n) => n[3] === 0).length }])),
      },
    ]),
  );
}
