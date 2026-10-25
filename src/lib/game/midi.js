// 讀標準 MIDI 檔（.mid，格式 0／1）：把每個音換成「第幾秒開始、多長、音高、力度、聲道」。純函式，Node 也能跑。
// 給 scripts/import-audio-song.mjs 用（Suno 分軌轉出來的 MIDI、或 Basic Pitch 之類的工具轉的 MIDI）。
// 處理：速度變化（tempo map）、running status、velocity 0 的 note-on 當成 note-off。SMPTE 的時間格式不處理。

/** 解析 MIDI：回傳 { notes: [{ time, dur, midi, vel, channel, track }]（秒）, tempos: [{ tick, mpq }], ppq } */
export function parseMidi(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let p = 0;
  const str = (n) => String.fromCharCode(...b.subarray(p, p + n));
  const u32 = () => ((b[p++] << 24) | (b[p++] << 16) | (b[p++] << 8) | b[p++]) >>> 0;
  const u16 = () => (b[p++] << 8) | b[p++];
  const vlq = () => {
    let v = 0;
    for (;;) {
      const c = b[p++];
      v = (v << 7) | (c & 0x7f);
      if (!(c & 0x80)) return v;
    }
  };

  if (str(4) !== 'MThd') throw new Error('不是 MIDI 檔（沒有 MThd）');
  p += 4;
  const headerLen = u32();
  const start = p;
  u16(); // 格式
  const tracks = u16();
  const ppq = u16();
  if (ppq & 0x8000) throw new Error('不支援 SMPTE 時間格式的 MIDI');
  p = start + headerLen;

  const tempos = [];
  const raw = []; // { tick, endTick, midi, vel, channel, track }
  for (let t = 0; t < tracks && p < b.length; t++) {
    if (str(4) !== 'MTrk') throw new Error(`第 ${t + 1} 個音軌壞掉了`);
    p += 4;
    const len = u32();
    const end = p + len;
    let tick = 0;
    let status = 0;
    const open = new Map(); // `${channel}:${note}` → [開始的音]
    while (p < end) {
      tick += vlq();
      let s = b[p];
      if (s & 0x80) p++;
      else s = status; // running status
      if (s === 0xff) {
        const type = b[p++];
        const n = vlq();
        if (type === 0x51 && n === 3) tempos.push({ tick, mpq: (b[p] << 16) | (b[p + 1] << 8) | b[p + 2] });
        p += n;
        continue;
      }
      if (s === 0xf0 || s === 0xf7) {
        p += vlq();
        continue;
      }
      status = s;
      const kind = s & 0xf0;
      const channel = s & 0x0f;
      if (kind === 0xc0 || kind === 0xd0) {
        p += 1;
        continue;
      }
      const d1 = b[p++];
      const d2 = b[p++];
      const key = `${channel}:${d1}`;
      if (kind === 0x90 && d2 > 0) {
        const n = { tick, endTick: tick, midi: d1, vel: d2, channel, track: t };
        raw.push(n);
        if (!open.has(key)) open.set(key, []);
        open.get(key).push(n);
      } else if (kind === 0x80 || kind === 0x90) {
        const n = open.get(key)?.shift();
        if (n) n.endTick = tick;
      }
    }
    p = end;
  }

  // tick → 秒（照速度變化一段一段算；沒有速度就是 120 BPM）
  tempos.sort((a, c) => a.tick - c.tick);
  if (!tempos.length || tempos[0].tick > 0) tempos.unshift({ tick: 0, mpq: 500000 });
  const marks = [];
  let sec = 0;
  for (let i = 0; i < tempos.length; i++) {
    if (i > 0) sec += ((tempos[i].tick - tempos[i - 1].tick) * tempos[i - 1].mpq) / ppq / 1e6;
    marks.push({ tick: tempos[i].tick, sec, mpq: tempos[i].mpq });
  }
  const toSec = (tick) => {
    let m = marks[0];
    for (const x of marks) if (x.tick <= tick) m = x;
    return m.sec + ((tick - m.tick) * m.mpq) / ppq / 1e6;
  };
  const notes = raw
    .map((n) => {
      const time = toSec(n.tick);
      return { time, dur: Math.max(0, toSec(n.endTick) - time), midi: n.midi, vel: n.vel, channel: n.channel, track: n.track };
    })
    .sort((a, c) => a.time - c.time || c.midi - a.midi);
  return { notes, tempos, ppq };
}

/** 寫一個最簡單的 MIDI 檔（格式 0、一個速度）：notes = [{ time, dur, midi, vel?, channel? }]（秒）。測試用。 */
export function writeMidi(notes, bpm = 120, ppq = 480) {
  const ev = [];
  const tickOf = (sec) => Math.round((sec * bpm * ppq) / 60);
  for (const n of notes) {
    const ch = n.channel ?? 0;
    ev.push({ tick: tickOf(n.time), data: [0x90 | ch, n.midi, n.vel ?? 100] });
    ev.push({ tick: tickOf(n.time + n.dur), data: [0x80 | ch, n.midi, 0] });
  }
  ev.sort((a, c) => a.tick - c.tick || (a.data[0] & 0xf0) - (c.data[0] & 0xf0));
  const out = [];
  const vlq = (v) => {
    const bytes = [v & 0x7f];
    while ((v >>= 7)) bytes.unshift((v & 0x7f) | 0x80);
    return bytes;
  };
  const mpq = Math.round(60e6 / bpm);
  out.push(0, 0xff, 0x51, 3, (mpq >> 16) & 0xff, (mpq >> 8) & 0xff, mpq & 0xff);
  let last = 0;
  for (const e of ev) {
    out.push(...vlq(e.tick - last), ...e.data);
    last = e.tick;
  }
  out.push(0, 0xff, 0x2f, 0);
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, ppq >> 8, ppq & 0xff];
  const len = out.length;
  return new Uint8Array([...head, 0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff, ...out]);
}
