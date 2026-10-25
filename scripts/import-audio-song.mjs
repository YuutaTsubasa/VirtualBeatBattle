// 把音檔曲子（Suno 之類）接進遊戲：npm run import-song <曲子 id>
//
// 放法：songs-src/<曲子 id>/
//   song.json         曲名、BPM、第 1 拍在音檔的哪裡、哪個 MIDI 是旋律／貝斯／鼓（見 songs-src/README.md）
//   <音檔>            Suno 下載的整首（mp3／wav／m4a…）
//   <MIDI>            分軌轉出來的 MIDI（旋律一定要有；貝斯、鼓、伴奏有的話譜面會比較好）
//
// 做的事：
//   1. 音檔 → public/audio/<id>.mp3（192kbps、響度 -14 LUFS，網頁版載入比較快、各首音量一致）
//   2. MIDI → 對齊拍子的譜面來源 → src/lib/game/audio-songs/<id>.json，並更新 audio-songs/index.js
//   3. 重跑 npm run charts（四個難度的譜面寫進 crates/beat-core/charts.json）
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parseMidi } from '../src/lib/game/midi.js';
import { sourceFromMidi } from '../src/lib/game/audio-source.js';

const id = process.argv[2];
if (!id) {
  console.error('用法：npm run import-song <曲子 id>（songs-src/ 底下的資料夾名稱）');
  process.exit(1);
}
const dir = join('songs-src', id);
const conf = JSON.parse(readFileSync(join(dir, 'song.json'), 'utf8'));
for (const k of ['title', 'bpm', 'audio']) if (!conf[k]) throw new Error(`song.json 少了 ${k}`);
if (!conf.parts?.melody) throw new Error('song.json 的 parts.melody（旋律的 MIDI）一定要有');

// 1. 音檔
const audioIn = join(dir, conf.audio);
const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audioIn]).toString().trim());
mkdirSync('public/audio', { recursive: true });
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', audioIn, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '44100', '-ac', '2', '-b:a', '192k', `public/audio/${id}.mp3`]);

// 1b. 琴鍵音（keysound）：song.json 有 keysound 的話，用分軌做兩個檔：
//   <id>-bgm.mp3  旋律那幾軌以外的分軌混在一起（伴奏，一直播）
//   <id>-keys.mp3 旋律那幾軌（打中音符時才切一段出來播）
//   兩個檔用同一個音量（照全部分軌加起來的響度調到 -14 LUFS），所以都打中時跟原曲一樣
const ks = conf.keysound;
if (ks) {
  const stemDir = join(dir, ks.stems ?? 'stems');
  const stems = readdirSync(stemDir).filter((f) => /\.(wav|flac|mp3)$/i.test(f));
  const keys = stems.filter((f) => ks.keys.includes(f));
  const rest = stems.filter((f) => !ks.keys.includes(f));
  if (keys.length !== ks.keys.length) throw new Error(`找不到旋律的分軌：${ks.keys.filter((f) => !keys.includes(f)).join('、')}`);
  const mix = (files) => [...files.flatMap((f) => ['-i', join(stemDir, f)])];
  const amix = (n) => (n > 1 ? `amix=inputs=${n}:normalize=0:duration=longest,` : '');
  // 全部分軌加起來的響度（ebur128 印在 stderr 最後的「I: -14.1 LUFS」）
  const report = spawnSync('ffmpeg', ['-hide_banner', ...mix(stems), '-filter_complex', `${amix(stems.length)}ebur128=framelog=quiet`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const lufs = Number([...report.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1]);
  if (!Number.isFinite(lufs)) throw new Error('量不到分軌的響度');
  const gain = `volume=${(-14 - lufs).toFixed(2)}dB,alimiter=limit=0.89:level=false`;
  const encode = (files, out) =>
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...mix(files), '-filter_complex', `${amix(files.length)}${gain}`, '-ar', '44100', '-ac', '2', '-b:a', '192k', out]);
  encode(rest, `public/audio/${id}-bgm.mp3`);
  encode(keys, `public/audio/${id}-keys.mp3`);
  console.log(`琴鍵音：伴奏 ${rest.length} 軌、旋律 ${keys.join('、')}（分軌合計 ${lufs} LUFS）`);
}
// 2. MIDI → 譜面來源
const offsetMs = conf.offsetMs ?? 0;
const lengthMs = Math.round(duration * 1000 - offsetMs);
// Suno 的分軌 MIDI 共用同一份速度表（會跟著演奏飄）：tempoMap: true 的話照 MIDI 的拍對齊，不用固定 BPM
let beatToSec;
const read = (f) =>
  f
    ? (Array.isArray(f) ? f : [f]).flatMap((x) => {
        const m = parseMidi(readFileSync(join(dir, x)));
        beatToSec ??= m.beatToSec;
        return m.notes;
      })
    : undefined;
const parts = { melody: read(conf.parts.melody), bass: read(conf.parts.bass), drums: read(conf.parts.drums), backing: read(conf.parts.backing) };
const source = sourceFromMidi({ bpm: conf.bpm, offsetMs, lengthMs, parts, ...(conf.tempoMap ? { beatToSec, offsetBeats: conf.offsetBeats ?? 0, shiftMs: conf.midiShiftMs ?? 0 } : {}) });
mkdirSync('src/lib/game/audio-songs', { recursive: true });
const data = {
  id,
  title: conf.title,
  game: conf.game ?? 'original',
  world: conf.world ?? 0,
  bg: conf.bg ?? null,
  cover: conf.cover ?? null,
  boss: conf.boss ?? null,
  rival: conf.rival ?? null,
  bpm: conf.bpm,
  offsetMs,
  lengthMs,
  credit: conf.credit ?? '',
  original: conf.original ?? null,
  keys: !!ks,
  source,
};
writeFileSync(`src/lib/game/audio-songs/${id}.json`, JSON.stringify(data) + '\n');

// audio-songs/index.js：列出全部音檔曲子（tracks.js 讀這個）
const ids = readdirSync('src/lib/game/audio-songs').filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
writeFileSync(
  'src/lib/game/audio-songs/index.js',
  `// 音檔曲子的清單（scripts/import-audio-song.mjs 自動產生，不要手改）\n${ids.map((x, i) => `import s${i} from './${x}.json' with { type: 'json' };`).join('\n')}\n\nexport default [${ids.map((_, i) => `s${i}`).join(', ')}];\n`,
);

console.log(`${conf.title}：${(lengthMs / 1000).toFixed(1)} 秒、旋律 ${source.melody.length} 音、伴奏 ${source.backing.length} 音、鼓 ${source.kicks.length + source.snares.length + source.hats.length} 下${parts.drums ? '' : '（沒有鼓的 MIDI，用四拍）'}`);

// 3. 譜面
execFileSync('node', ['scripts/gen-charts.mjs'], { stdio: 'inherit' });
if (!existsSync(`public/audio/${id}.mp3`)) throw new Error('音檔沒轉成功');
