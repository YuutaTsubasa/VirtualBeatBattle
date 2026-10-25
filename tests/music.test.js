import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS } from '../src/lib/audio/songs.js';
import { parseMML, chordNotes } from '../src/lib/audio/synth.js';

const bars = (mml) => mml.split('|').map((b) => b.trim()).filter(Boolean);
const beatsOfProg = (prog) => prog.split(/\s+/).filter(Boolean).reduce((sum, tok) => sum + Number(tok.split(':')[1] ?? 4), 0);

test('every bar of the looping songs is exactly 4 beats', () => {
  for (const [name, song] of Object.entries(SONGS)) {
    if (!song.loop) continue;
    for (const tr of song.tracks) {
      if (!tr.mml) continue;
      bars(tr.mml).forEach((bar, i) => {
        // 每小節開頭都有寫八度，單獨解析也正確
        assert.equal(parseMML(bar).length, 4, `${name} ${tr.kind} 第 ${i + 1} 小節`);
      });
    }
  }
});

test('melody, chords, bass and arpeggio of each looping song have the same length', () => {
  for (const [name, song] of Object.entries(SONGS)) {
    if (!song.loop) continue;
    const lengths = new Set();
    for (const tr of song.tracks) {
      if (tr.mml) lengths.add(parseMML(tr.mml).length);
      if (tr.prog) lengths.add(beatsOfProg(tr.prog));
    }
    assert.equal(lengths.size, 1, `${name}: ${[...lengths].join(' / ')}`);
  }
});

test('every chord name in the progressions is understood', () => {
  for (const [name, song] of Object.entries(SONGS)) {
    for (const tr of song.tracks) {
      for (const tok of (tr.prog ?? '').split(/\s+/).filter(Boolean)) {
        assert.ok(chordNotes(tok.split(':')[0]).length >= 3, `${name}: ${tok}`);
      }
    }
  }
});

// 收錄的曲子（其他遊戲照搬來的，寫法跟各自的遊戲一樣，所以只檢查能不能用）
test('every playable track points at a looping song with a melody and known chords', async () => {
  const { TRACKS, songOf, repeatOf } = await import('../src/lib/game/tracks.js');
  const ids = new Set();
  for (const tr of TRACKS) {
    assert.ok(!ids.has(tr.id), `重複的 id：${tr.id}`);
    ids.add(tr.id);
    const song = songOf(tr);
    assert.ok(song?.loop, `${tr.id}：找不到會循環的曲子 ${tr.game}/${tr.song}`);
    assert.ok(song.tracks.some((t) => t.mml && (t.kind === 'fm' || t.kind === 'ssg')), `${tr.id}：沒有旋律`);
    for (const t of song.tracks) {
      for (const tok of (t.prog ?? '').split(/\s+/).filter(Boolean)) assert.ok(chordNotes(tok.split(':')[0]).length >= 3, `${tr.id}: ${tok}`);
    }
    assert.ok(repeatOf(tr) >= 1);
  }
});

test('scenes and jingles the app asks for exist', () => {
  const worlds = ['city', 'forest', 'sea', 'ice', 'mine', 'castle'].map((w) => `stage-${w}`);
  for (const name of ['title', 'menu', 'tension', 'win', 'lose', ...worlds]) assert.ok(SONGS[name], name);
});
