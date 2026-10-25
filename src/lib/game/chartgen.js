// 譜面產生器：從曲子（songs.js）的旋律與鼓點排出 6 鍵譜面。純函式，Node 也能跑（scripts/gen-charts.mjs）。
//
// 六條軌道：0～2 是左手、3～5 是右手。
//   旋律的每個音 → 一顆音符，音往上走就往右移、往下走就往左移（音程越大跳越遠），手指跟著旋律爬
//   長音 → 長押
//   普通以上：小鼓的重拍在另一隻手那一側補一顆（同時押：角色分身出現的地方）
//   困難：旋律空下來的地方用小鼓、大鼓補，偶爾放地雷（魔王的攻擊，不要按）
//   極限（EXPERT）：每拍都可以同時押、鼓點補到十六分音符、Hi-hat 補八分音符，慢歌再加上琶音，地雷更多
// 曲子重複時，第二、四次左右鏡像，免得一直是同一套。
//
// 輸出的音符：[時間 ms, 軌道 0～5, 長押長度 ms（0 = 單點）, 種類（0 = 一般、1 = 地雷）]

import { compile } from '../audio/music.js';

const LANES = 6;

// 各難度的規則：最短間隔（拍）、長押最短長度（拍）、同時押多久一次（拍，0 = 不要）、補鼓點、地雷（每幾拍一顆）
//   fillGrid：鼓點補到多細（拍）；hats：Hi-hat 也拿來補；arp：把琶音也排進去（八分音符；slow 這個 BPM 以下的慢歌排到十六分音符）
const RULES = {
  easy: { grid: 1, gap: 1, hold: 2, chordEvery: 0, fill: false, mines: 0 },
  normal: { grid: 0.5, gap: 0.5, hold: 1.5, chordEvery: 4, fill: false, mines: 0 },
  hard: { grid: 0.25, gap: 0.25, hold: 1.5, chordEvery: 2, fill: true, fillGrid: 0.5, mines: 8 },
  expert: { grid: 0.25, gap: 0.25, hold: 1.5, chordEvery: 1, fill: true, fillGrid: 0.25, hats: true, arp: { slow: 120 }, mines: 5 },
};

/** 旋律音軌：第一條有 MML 的 FM／方波音軌 */
function melodyOf(song, events) {
  const lead = song.tracks.find((tr) => tr.mml && (tr.kind === 'fm' || tr.kind === 'ssg'));
  return events.filter((e) => e.tr === lead && e.midi != null);
}

const onGrid = (beat, grid) => Math.abs(beat / grid - Math.round(beat / grid)) < 1e-6;

/** 手指跟著旋律走：上行往右、下行往左；碰到邊就反彈 */
function walk(prevLane, prevMidi, midi) {
  if (prevLane == null) return 2;
  const d = midi - prevMidi;
  if (d === 0) return prevLane;
  const step = Math.abs(d) <= 2 ? 1 : Math.abs(d) <= 5 ? 2 : 3;
  let lane = prevLane + Math.sign(d) * step;
  if (lane < 0) lane = Math.min(LANES - 1, prevLane + step);
  if (lane >= LANES) lane = Math.max(0, prevLane - step);
  return lane;
}

/** 另一隻手那一側、跟這一軌對稱的位置 */
const mirror = (lane) => LANES - 1 - lane;
const sideOf = (lane) => (lane < 3 ? 0 : 1);

/**
 * 產生一首曲子某個難度的譜面（一輪的音符，以拍為單位），再展開成重複 repeat 次、換成毫秒。
 * 回傳 { notes, lengthMs }
 */
export function generateChart(song, level, repeat = 1) {
  const rule = RULES[level];
  const { events, length } = compile(song);
  const spb = 60 / song.bpm;
  const melody = melodyOf(song, events);
  const snares = events.filter((e) => e.drum === 's').map((e) => e.beat);
  const kicks = events.filter((e) => e.drum === 'k').map((e) => e.beat);
  const hats = events.filter((e) => e.drum === 'h').map((e) => e.beat);

  // 一輪的音符：{ beat, lane, len（拍）, kind }
  const round = [];
  // 每一軌什麼時候空出來（長押中不能再放）
  const free = new Array(LANES).fill(-Infinity);
  const put = (beat, lane, len = 0, kind = 0) => {
    if (free[lane] > beat - 1e-6) return false;
    // 同一時間同一軌只能有一顆
    if (round.some((n) => n.lane === lane && Math.abs(n.beat - beat) < 1e-6)) return false;
    round.push({ beat, lane, len, kind });
    free[lane] = beat + len + (kind === 1 ? 0.25 : rule.gap / 2);
    return true;
  };

  let lastBeat = -Infinity;
  let prevLane = null;
  let prevMidi = null;
  let lastChord = -Infinity;
  for (const n of melody) {
    if (!onGrid(n.beat, rule.grid) || n.beat - lastBeat < rule.gap - 1e-6) continue;
    const lane = walk(prevLane, prevMidi, n.midi);
    const len = n.dur >= rule.hold ? n.dur - 0.5 : 0;
    if (!put(n.beat, lane, len)) continue;
    lastBeat = n.beat;
    prevLane = lane;
    prevMidi = n.midi;
    // 同時押：小鼓的位置、而且離上一次夠遠，在另一隻手那一側補一顆
    const strong = onGrid(n.beat, 4) || snares.some((s) => Math.abs(s - n.beat) < 1e-6);
    if (rule.chordEvery && strong && n.beat - lastChord >= rule.chordEvery - 1e-6) {
      if (put(n.beat, mirror(lane))) lastChord = n.beat;
    }
  }

  // 極限譜面：伴奏（琶音、貝斯…）排在旋律的另一隻手那一側（八分音符，慢歌十六分音符），兩手輪流
  if (rule.arp) {
    const arpGrid = song.bpm <= rule.arp.slow ? 0.25 : 0.5;
    // 伴奏：琶音、貝斯（台麻館的貝斯是 FM 音軌）、第二旋律（方波）；同一拍只取一個音
    const lead = song.tracks.find((tr) => tr.mml && (tr.kind === 'fm' || tr.kind === 'ssg'));
    const backing = (tr) => tr !== lead && (tr.kind === 'arp' || tr.kind === 'bass' || tr.patch === 'bass' || tr.kind === 'ssg');
    const seen = new Set();
    const arp = events.filter((e) => e.midi != null && backing(e.tr) && onGrid(e.beat, arpGrid) && !seen.has(e.beat) && seen.add(e.beat));
    let aLane = null;
    let aMidi = null;
    for (const n of arp) {
      if (round.some((m) => Math.abs(m.beat - n.beat) < arpGrid - 1e-6)) continue;
      const near = round.filter((m) => m.beat < n.beat).at(-1);
      const side = near ? 1 - sideOf(near.lane) : 1;
      aLane = walk(aLane, aMidi, n.midi);
      aMidi = n.midi;
      put(n.beat, side * 3 + (aLane % 3));
    }
  }

  // 困難以上：旋律空下來的地方用小鼓、大鼓（極限再加 Hi-hat）補，放在上一顆的另一側
  if (rule.fill) {
    const fillGrid = rule.fillGrid ?? 0.5;
    const taken = (beat, gap) => round.some((n) => Math.abs(n.beat - beat) < gap - 1e-6 || (n.len && beat > n.beat && beat < n.beat + n.len));
    const drums = [...snares.map((b) => [b, 's']), ...kicks.map((b) => [b, 'k']), ...(rule.hats ? hats.map((b) => [b, 'h']) : [])].sort((a, b) => a[0] - b[0]);
    let flip = 0;
    let hatN = 0;
    for (const [beat, kind] of drums) {
      if (beat >= length || !onGrid(beat, fillGrid) || taken(beat, fillGrid - 0.01)) continue;
      const near = round.filter((n) => n.beat < beat).at(-1);
      const base = near ? mirror(near.lane) : 2;
      // 小鼓放靠外側、大鼓放靠內側，左右輪流
      // Hi-hat 在那一側的三條之間輪流（不要同一軌連打）
      const lane = kind === 's' ? (sideOf(base) ? 5 - flip : flip) : kind === 'h' ? sideOf(base) * 3 + [1, 0, 2][hatN++ % 3] : sideOf(base) ? 3 + flip : 2 - flip;
      flip = (flip + 1) % 2;
      put(beat, Math.max(0, Math.min(LANES - 1, lane)));
    }
  }

  // 地雷：每 rule.mines 拍找一個前後半拍都沒有音符的半拍放一顆（放在上一顆音符旁邊，看得到、要忍住不按）
  if (rule.mines) {
    const busy = (beat) => round.some((n) => Math.abs(n.beat - beat) < 0.5 - 1e-6 || (n.len && beat >= n.beat - 0.25 && beat <= n.beat + n.len + 0.25));
    for (let from = 4; from < length; from += rule.mines) {
      for (let beat = from + 0.5; beat < Math.min(length, from + rule.mines); beat += 0.5) {
        if (busy(beat)) continue;
        const near = round.filter((n) => n.beat < beat).at(-1);
        if (put(beat, near ? (near.lane + 1) % LANES : 1, 0, 1)) break;
      }
    }
  }

  round.sort((a, b) => a.beat - b.beat || a.lane - b.lane);

  // 展開成 repeat 輪：第二、四輪左右鏡像（簡單不鏡像，讓新手熟悉）
  const notes = [];
  for (let k = 0; k < repeat; k++) {
    const flipped = level !== 'easy' && k % 2 === 1;
    for (const n of round) {
      const ms = Math.round((n.beat + k * length) * spb * 1000);
      const lane = flipped ? mirror(n.lane) : n.lane;
      notes.push([ms, lane, Math.round(n.len * spb * 1000), n.kind]);
    }
  }
  return { notes, lengthMs: Math.round(length * repeat * spb * 1000) };
}

/** 譜面等級（給玩家看的數字，大約 1～22）：用每秒音符數與同時押的比例粗估（原創曲的十六分音符譜面會到 17～22） */
export function ratingOf(notes, lengthMs) {
  const real = notes.filter((n) => n[3] === 0);
  const nps = real.length / (lengthMs / 1000);
  const chords = real.filter((n, i) => i > 0 && real[i - 1][0] === n[0]).length / Math.max(1, real.length);
  return Math.max(1, Math.min(25, Math.round(nps * 1.3 + chords * 5 + 0.5)));
}
