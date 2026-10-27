// 把 PC-98 音源的曲子離線算成音檔（給 Suno 之類的工具當參考、或拿來分享）。
//   node scripts/render-song.mjs <曲目 id，例如 mj-title> [輪數，預設 2] [輸出檔，預設 songs-src/exports/<id>.mp3]
// 用 node-web-audio-api 的 OfflineAudioContext 跑跟遊戲一模一樣的合成器（VirtualCore 的 src/audio/synth.js），
// 把整首的音符一次排好（遊戲裡是邊播邊排），算完存成 WAV 再交給 ffmpeg 轉 MP3。
import { OfflineAudioContext, AudioParam } from 'node-web-audio-api';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';

const [id = 'mj-title', loopsArg = '2', outArg] = process.argv.slice(2);
const loops = Math.max(1, Number(loopsArg) || 2);
const out = outArg ?? `songs-src/exports/${id}.mp3`;
const SAMPLE_RATE = 44100;
const LEAD = 0.1; // 開頭留一點空白
const TAIL = 2; // 結尾讓最後的音自然消失

const { compile } = await import('../src/lib/audio/music.js');
const { trackOf, songOf } = await import('../src/lib/game/tracks.js');
const track = trackOf(id);
if (track.id !== id) throw new Error(`沒有這首：${id}`);
const song = songOf(track);
const { events, length } = compile(song);
const spb = 60 / song.bpm;
const seconds = LEAD + length * spb * loops + TAIL;

// synth.js 用 window.AudioContext 建立音源：換成固定長度的離線版本
// node-web-audio-api 的 setTargetAtTime 有 bug：後面再排別的變化（或逼近到跟目標一樣）時會爆音（風琴、長的方波音）。
// 這裡把它換成「從上一個值直線走到目標（3 個時間常數，走完 95%）」，聽起來差不多，遊戲裡（瀏覽器）照原本的
{
  const last = new WeakMap(); // AudioParam → 最後排的值
  const wrap = (name, fn) => {
    const orig = AudioParam.prototype[name];
    AudioParam.prototype[name] = function (...args) {
      fn?.call(this, ...args);
      return orig.apply(this, args);
    };
  };
  wrap('setValueAtTime', function (v) {
    last.set(this, v);
  });
  wrap('linearRampToValueAtTime', function (v) {
    last.set(this, v);
  });
  wrap('exponentialRampToValueAtTime', function (v) {
    last.set(this, v);
  });
  AudioParam.prototype.setTargetAtTime = function (target, start, tau) {
    this.setValueAtTime(last.get(this) ?? this.value, start);
    this.linearRampToValueAtTime(target, start + tau * 3);
    return this;
  };
}

globalThis.window = {
  AudioContext: class extends OfflineAudioContext {
    constructor() {
      super({ numberOfChannels: 2, length: Math.ceil(SAMPLE_RATE * seconds), sampleRate: SAMPLE_RATE });
    }
  },
};
const { audioContext, buses, fmNote, ssgNote, drum } = await import('virtual-core/audio/synth.js');
const ctx = audioContext();
const outGain = ctx.createGain();
outGain.gain.value = song.gain ?? 1;
outGain.connect(buses.bgm);

// 跟 music.js 的 Player 一樣的排法，只是一次排完
for (let k = 0; k < loops; k++) {
  const start = LEAD + k * length * spb;
  for (const ev of events) {
    const t = start + ev.beat * spb;
    const pan = ev.tr.pan ?? 0;
    if (ev.drum) drum(outGain, ev.drum, t);
    else if (ev.tr.kind === 'ssg' || (ev.tr.kind === 'arp' && !ev.tr.patch)) ssgNote(outGain, ev.midi, t, ev.dur * spb * 0.9, ev.vel, pan);
    else if (ev.tr.kind === 'bass') fmNote(outGain, ev.tr.patch ?? 'bass', ev.midi, t, ev.dur * spb * 0.92, ev.vel, pan);
    else fmNote(outGain, ev.tr.patch, ev.midi, t, ev.dur * spb * 0.92, ev.vel, pan);
  }
}

const buffer = await ctx.startRendering();

// 16-bit WAV
const ch = [buffer.getChannelData(0), buffer.getChannelData(1)];
const n = buffer.length;
const wav = Buffer.alloc(44 + n * 4);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + n * 4, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SAMPLE_RATE, 24);
wav.writeUInt32LE(SAMPLE_RATE * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(n * 4, 40);
for (let i = 0; i < n; i++) {
  for (let c = 0; c < 2; c++) {
    const v = Math.max(-1, Math.min(1, ch[c][i]));
    wav.writeInt16LE(Math.round(v * 32767), 44 + i * 4 + c * 2);
  }
}
mkdirSync(dirname(out), { recursive: true });
const wavPath = out.replace(/\.\w+$/, '.wav');
writeFileSync(wavPath, wav);
if (out.endsWith('.mp3')) {
  // 響度拉到串流常見的 -14 LUFS（合成器直接輸出偏小聲）
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-b:a', '192k', out]);
}
console.log(`寫好了 ${out}（${track.title}，${song.bpm} BPM，${loops} 輪，${seconds.toFixed(1)} 秒）`);
process.exit(0);
