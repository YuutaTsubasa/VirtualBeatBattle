// 琴鍵音（keysound）：音檔曲子的旋律（例如 Suno 分軌的吉他）不放在伴奏裡，打中音符時才從旋律那一軌切一段出來播。
//   漏掉的音符那一段就不會響；早按就早響（跟 DJMAX 一樣）。
//   一段 = 這顆旋律音符的時間 → 下一顆旋律音符的時間（照這個難度的譜面算，簡單譜面一段比較長，打中照樣聽得到完整的旋律）。
//   兩頭各提早 PRE 秒：MIDI 的時間跟分軌的實際聲音有幾十毫秒的誤差，提早一點才不會切掉撥弦的起音。
import { beatToMs } from '../game/chartgen.js';
import { audioContext, buses } from './synth.js';

const PRE = 0.03;
const FADE_IN = 0.004;
const FADE_OUT = 0.03;

/**
 * 每顆音符要播的那一段（秒，音檔裡的時間）：回傳 Map(音符編號 → [開始, 結束])；不是旋律的音符（鼓點補的、地雷）沒有。
 * notes：譜面的 [ms, lane, len, kind]；audioSong：audio-songs/<id>.json
 */
export function keySlices(notes, audioSong) {
  const { source, offsetMs = 0, lengthMs } = audioSong;
  const melody = new Set(source.melody.map((m) => Math.round(beatToMs(source, m.beat))));
  const times = [...new Set(notes.filter((n) => n[3] !== 1 && melody.has(n[0])).map((n) => n[0]))].sort((a, b) => a - b);
  const next = new Map(times.map((t, k) => [t, times[k + 1] ?? lengthMs]));
  const slices = new Map();
  notes.forEach((n, i) => {
    if (!next.has(n[0]) || n[3] === 1) return;
    slices.set(i, [Math.max(0, (offsetMs + n[0]) / 1000 - PRE), (offsetMs + next.get(n[0])) / 1000 - PRE]);
  });
  return slices;
}

/** 播旋律的人：hit(音符編號) 播那一段（同時押的兩顆只播一次）；stop() 全部停掉 */
export function createKeys(buffer, slices) {
  const ctx = audioContext();
  const out = ctx.createGain();
  out.connect(buses.bgm);
  const playing = new Set();
  const played = new Set(); // 已經播過的段落（開始的秒數）
  return {
    hit(i) {
      const s = slices.get(i);
      if (!s || played.has(s[0])) return;
      played.add(s[0]);
      const [from, to] = s;
      const dur = Math.max(0.05, to - from);
      const t = ctx.currentTime;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + FADE_IN);
      g.gain.setValueAtTime(1, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + FADE_OUT);
      g.connect(out);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(g);
      src.start(t, from, dur + FADE_OUT);
      playing.add(src);
      src.onended = () => {
        playing.delete(src);
        g.disconnect();
      };
    },
    stop(fade = 0.3) {
      const t = ctx.currentTime;
      out.gain.setTargetAtTime(0, t, Math.max(fade, 0.01) / 3);
      for (const src of playing) src.stop(t + fade + 0.1);
      playing.clear();
    },
  };
}
