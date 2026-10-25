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
import { execFileSync } from 'node:child_process';
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

// 2. MIDI → 譜面來源
const offsetMs = conf.offsetMs ?? 0;
const lengthMs = Math.round(duration * 1000 - offsetMs);
const read = (f) => (f ? (Array.isArray(f) ? f : [f]).flatMap((x) => parseMidi(readFileSync(join(dir, x))).notes) : undefined);
const parts = { melody: read(conf.parts.melody), bass: read(conf.parts.bass), drums: read(conf.parts.drums), backing: read(conf.parts.backing) };
const source = sourceFromMidi({ bpm: conf.bpm, offsetMs, lengthMs, parts });
mkdirSync('src/lib/game/audio-songs', { recursive: true });
const data = {
  id,
  title: conf.title,
  game: conf.game ?? 'original',
  world: conf.world ?? 0,
  bg: conf.bg ?? null,
  boss: conf.boss ?? null,
  bpm: conf.bpm,
  offsetMs,
  lengthMs,
  credit: conf.credit ?? '',
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
