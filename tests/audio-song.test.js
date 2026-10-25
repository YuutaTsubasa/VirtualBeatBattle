// 音檔曲子（Suno）的匯入：MIDI 讀寫、對齊拍子、濾掉雜音、鼓的分類
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMidi, writeMidi } from '../src/lib/game/midi.js';
import { sourceFromMidi } from '../src/lib/game/audio-source.js';
import { chartFrom } from '../src/lib/game/chartgen.js';

test('MIDI round trip keeps time, length and pitch', () => {
  const notes = [
    { time: 0.5, dur: 0.25, midi: 72 },
    { time: 1.0, dur: 0.5, midi: 76 },
    { time: 1.0, dur: 0.1, midi: 36, channel: 9 },
  ];
  const back = parseMidi(writeMidi(notes, 150)).notes;
  assert.equal(back.length, 3);
  for (const n of notes) {
    const m = back.find((x) => x.midi === n.midi);
    assert.ok(Math.abs(m.time - n.time) < 0.002 && Math.abs(m.dur - n.dur) < 0.002, `${n.midi}`);
  }
});

test('notes are snapped to the 16th grid from bpm and offset; noise is dropped', () => {
  const bpm = 120; // 一拍 0.5 秒
  const offsetMs = 200;
  const at = (beat) => offsetMs / 1000 + beat * 0.5;
  const melody = [
    { time: at(0) + 0.012, dur: 0.24, midi: 72, vel: 90 }, // 稍微晚一點 → 第 0 拍
    { time: at(1) - 0.01, dur: 0.24, midi: 74, vel: 90 }, // 稍微早一點 → 第 1 拍
    { time: at(1) + 0.005, dur: 0.24, midi: 62, vel: 90 }, // 同一格比較低的音（和弦）→ 不要
    { time: at(1.5), dur: 0.01, midi: 90, vel: 90 }, // 太短的雜音 → 不要
    { time: at(2), dur: 1.0, midi: 79, vel: 8 }, // 太小聲的雜音 → 不要
    { time: at(2.25), dur: 1.0, midi: 77, vel: 90 }, // 十六分音符的位置、兩拍長
  ];
  const drums = [36, 38, 42].map((m, i) => ({ time: at(i), dur: 0.05, midi: m, vel: 100 }));
  const src = sourceFromMidi({ bpm, offsetMs, lengthMs: 8000, parts: { melody, drums } });
  assert.deepEqual(src.melody.map((n) => [n.beat, n.midi]), [[0, 72], [1, 74], [2.25, 77]]);
  assert.equal(src.melody[2].dur, 2);
  assert.deepEqual([src.kicks, src.snares, src.hats], [[0], [1], [2]]);
  assert.equal(src.length, 16);
});

test('without a drum MIDI a basic four-on-the-floor beat is used, and a chart comes out', () => {
  const melody = Array.from({ length: 32 }, (_, i) => ({ time: i * 0.25, dur: 0.2, midi: 60 + (i % 8), vel: 90 }));
  const src = sourceFromMidi({ bpm: 120, offsetMs: 0, lengthMs: 8000, parts: { melody } });
  assert.equal(src.kicks.length, 16);
  assert.deepEqual(src.snares.slice(0, 2), [1, 3]);
  for (const level of ['easy', 'normal', 'hard', 'expert']) {
    const { notes, lengthMs } = chartFrom(src, level, 1);
    assert.ok(notes.length > 0, level);
    assert.equal(lengthMs, 8000);
  }
});
