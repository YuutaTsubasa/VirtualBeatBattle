// 音檔曲子（Suno 之類）的譜面來源：把 MIDI 的音（秒）換成以拍為單位、對齊到十六分音符格子的音符，給 chartgen.js 的 chartFrom 用。
// 純函式，Node 也能跑。
//
// 對齊：拍 = (秒 × 1000 − offsetMs) ÷ 一拍的毫秒，再四捨五入到 1/4 拍。offsetMs 是音檔裡「第 1 拍」的時間。
// Suno 的 MIDI 速度會飄：給 beatToSec 的話改用 MIDI 裡的拍位置對齊，並把每一拍的毫秒記在 beatMs，譜面照它換算時間。
// 旋律：同一格有好幾個音（和弦、轉錄出來的雜音）只留最高的那個；太短、太小聲的雜音丟掉。
// 鼓：照 GM 鼓組的音高分大鼓（35、36）、小鼓（37～40）、Hi-hat（42、44、46，還有 Ride 51）；沒有鼓的 MIDI 就用最基本的四拍。

const KICK = new Set([35, 36]);
const SNARE = new Set([37, 38, 39, 40]);
const HAT = new Set([42, 44, 46, 51, 59]);

/**
 * parts：{ melody, bass, drums, backing }，每個都是 parseMidi 的 notes（秒）或 undefined。
 * 回傳 chartFrom 用的來源：{ bpm, length, melody, backing, kicks, snares, hats }
 */
export function sourceFromMidi({ bpm, offsetMs = 0, lengthMs, parts, minVel = 20, beatToSec, offsetBeats = 0 }) {
  const msPerBeat = 60000 / bpm;
  // 有 beatToSec（MIDI 的速度表）就用音符的 tick 位置算拍、再照速度表換回毫秒；沒有就當速度固定
  const tempoMap = typeof beatToSec === 'function';
  const toBeat = tempoMap ? (n) => n.beat - offsetBeats : (n) => (n.time * 1000 - offsetMs) / msPerBeat;
  const snap = (beat) => Math.round(beat * 4) / 4;
  let length = Math.floor(lengthMs / msPerBeat);
  let beatMs;
  if (tempoMap) {
    beatMs = [];
    for (let b = 0; ; b++) {
      const ms = Math.round((beatToSec(b + offsetBeats) * 1000 - offsetMs) * 10) / 10;
      beatMs.push(ms);
      if (ms > lengthMs) break;
    }
    length = beatMs.length - 2;
  }
  const inSong = (beat) => beat >= 0 && beat < length;
  const beatsOf = (n) => (tempoMap ? n.beats : (n.dur * 1000) / msPerBeat);

  // 旋律：每一格留最高的音
  const byBeat = new Map();
  for (const n of parts.melody ?? []) {
    if (n.vel < minVel || n.dur < 0.03) continue;
    const beat = snap(toBeat(n));
    if (!inSong(beat)) continue;
    const dur = Math.max(0.25, snap(beatsOf(n)));
    const old = byBeat.get(beat);
    if (!old || n.midi > old.midi) byBeat.set(beat, { beat, dur, midi: n.midi });
  }
  const melody = [...byBeat.values()].sort((a, b) => a.beat - b.beat);
  // 長音不能蓋到下一個音
  for (let i = 0; i + 1 < melody.length; i++) melody[i].dur = Math.min(melody[i].dur, melody[i + 1].beat - melody[i].beat);

  // 伴奏：貝斯＋其他指定的伴奏音軌，每一格留最低的音
  const back = new Map();
  for (const n of [...(parts.bass ?? []), ...(parts.backing ?? [])]) {
    if (n.vel < minVel || n.dur < 0.03) continue;
    const beat = snap(toBeat(n));
    if (!inSong(beat)) continue;
    const old = back.get(beat);
    if (!old || n.midi < old.midi) back.set(beat, { beat, midi: n.midi });
  }
  const backing = [...back.values()].sort((a, b) => a.beat - b.beat);

  // 鼓
  const kicks = new Set();
  const snares = new Set();
  const hats = new Set();
  if (parts.drums?.length) {
    for (const n of parts.drums) {
      if (n.vel < minVel) continue;
      const beat = snap(toBeat(n));
      if (!inSong(beat)) continue;
      if (KICK.has(n.midi)) kicks.add(beat);
      else if (SNARE.has(n.midi)) snares.add(beat);
      else if (HAT.has(n.midi)) hats.add(beat);
    }
  } else {
    // 沒有鼓的 MIDI：四拍大鼓、二四拍小鼓、八分音符 Hi-hat
    for (let beat = 0; beat < length; beat += 0.5) {
      if (beat % 1 === 0) kicks.add(beat);
      if (beat % 2 === 1) snares.add(beat);
      hats.add(beat);
    }
  }
  const sorted = (set) => [...set].sort((a, b) => a - b);
  return { bpm, length, ...(beatMs ? { beatMs } : {}), melody, backing, kicks: sorted(kicks), snares: sorted(snares), hats: sorted(hats) };
}
