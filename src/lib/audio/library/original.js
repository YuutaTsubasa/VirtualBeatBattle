// 虛擬音鬥樂的原創曲（為了排出難一點的譜面而寫：十六分音符的旋律、快的 BPM、密的鼓）。PC-98 FM 音色，格式見 ../music.js 開頭的說明。
// 旋律由 scripts/compose-mml.py 從「每小節一個和弦＋16 格節奏型」展開成 MML，每個音都寫八度；
// 方波那一軌是主旋律高一個八度。細修可以直接改這裡的 MML（tests/music.test.js 會檢查每小節剛好 4 拍）。
//
// 每首 16 小節循環：前 8 小節是主題、後 8 小節是 Drop／高潮。

// 鼓的節奏型（一小節 16 格）
const FOUR = { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', o: '..x...x...x...x.' };
const GABBER = { k: 'x...x...x...x.x.', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' };
const BLAST = { k: 'x.x.x.x.x.x.x.x.', s: '....x..x....x.xx', h: 'xxxxxxxxxxxxxxxx' };

const EDM_PROG = 'Fm Db Ab Eb Fm Db Ab Eb Fm Db Ab Eb Bbm Gb Eb Eb';
const HARDCORE_PROG = 'Am F C G Am F G E Am F C G Dm F E E';
const SPEEDCORE_PROG = 'Dm Bb C A Dm Bb Gm A Dm Eb Dm Eb C Bb A A';

export const SONGS = {
  // 霓虹頻率（EDM，150）：F 小調。前半八分音符的主題，後半是十六分音符的 supersaw 琶音 Drop；四拍大鼓、反拍貝斯
  edm: {
    bpm: 150,
    loop: true,
    gain: 0.72,
    tracks: [
      {
        kind: 'fm',
        patch: 'lead',
        pan: 0.1,
        mml: `o5 f8 o6 c8 o6 f8 o6 c8 o6 a-8 o6 f8 o6 c8 o5 a-8 | o5 f8 o5 a-8 o6 c+8 o6 f8 o6 c+8 o5 a-8 o5 f8 o5 c+8 | o5 a-8 o6 e-8 o6 a-8 o7 c8 o7 e-8 o7 c8 o6 a-8 o6 e-8 | o5 g8 o6 e-8 o6 g8 o6 e-8 o5 b-8 o5 g8 o5 e-4 |
              o5 f16 o6 c16 o6 f16 o6 a-16 o6 f16 o6 c16 o5 f16 o6 c16 o6 f16 o6 a-16 o7 c16 o7 f16 o7 c16 o6 a-16 o6 f16 o6 c16 | o5 f16 o6 c+16 o6 f16 o6 c+16 o5 f16 o5 c+16 o5 f16 o6 c+16 o6 f16 o6 c+16 o6 a-16 o7 c+16 o6 a-16 o6 f16 o6 c+16 o5 f16 | o5 a-16 o6 e-16 o6 a-16 o7 c16 o6 a-16 o6 e-16 o5 a-16 o6 e-16 o6 a-16 o7 c16 o7 e-16 o7 a-16 o7 e-16 o7 c16 o6 a-16 o6 e-16 | o6 g8 o6 e-8 o5 b-8 o5 g8 o5 e-8 o4 g8 o5 e-4 |
              o5 f16 r16 o6 f16 o5 f16 r16 o6 f16 o6 c16 o5 f16 r16 o6 f16 o6 a-16 r16 o6 f16 o6 c16 o5 f16 o5 a-16 | o5 f16 r16 o6 c+16 o5 f16 r16 o6 f16 o6 c+16 o5 f16 r16 o6 f16 o6 c+16 r16 o6 f16 o6 c+16 o5 f16 o5 c+16 | o5 a-16 r16 o6 a-16 o5 a-16 r16 o6 a-16 o6 e-16 o5 a-16 r16 o6 a-16 o7 c16 r16 o6 a-16 o6 e-16 o5 a-16 o6 c16 | o6 e-16 r16 o6 g16 o6 e-16 r16 o6 b-16 o6 g16 o6 e-16 r16 o6 b-16 o6 g16 r16 o6 b-16 o6 g16 o6 e-16 o5 b-16 |
              o5 b-16 o6 f16 o6 b-16 o7 c+16 o7 f16 o7 c+16 o6 b-16 o6 f16 o5 b-16 o6 f16 o6 b-16 o7 c+16 o7 f16 o7 b-16 o7 f16 o7 c+16 | o5 b-16 o6 f+16 o6 b-16 o7 c+16 o6 b-16 o6 f+16 o5 b-16 o5 f+16 o5 b-16 o6 f+16 o6 b-16 o7 c+16 o6 b-16 o6 f+16 o6 c+16 o5 b-16 | o5 e-16 o5 b-16 o6 e-16 o6 g16 o6 b-16 o7 e-16 o6 b-16 o6 g16 o6 e-16 o5 b-16 o6 e-16 o6 g16 o6 b-16 o7 e-16 o6 b-16 o6 g16 | o6 e-2 o5 b-4 o5 g4`,
      },
      {
        kind: 'ssg',
        pan: -0.15,
        vel: 0.28,
        mml: `o6 f8 o7 c8 o7 f8 o7 c8 o7 a-8 o7 f8 o7 c8 o6 a-8 | o6 f8 o6 a-8 o7 c+8 o7 f8 o7 c+8 o6 a-8 o6 f8 o6 c+8 | o6 a-8 o7 e-8 o7 a-8 o8 c8 o8 e-8 o8 c8 o7 a-8 o7 e-8 | o6 g8 o7 e-8 o7 g8 o7 e-8 o6 b-8 o6 g8 o6 e-4 |
              o6 f16 o7 c16 o7 f16 o7 a-16 o7 f16 o7 c16 o6 f16 o7 c16 o7 f16 o7 a-16 o8 c16 o8 f16 o8 c16 o7 a-16 o7 f16 o7 c16 | o6 f16 o7 c+16 o7 f16 o7 c+16 o6 f16 o6 c+16 o6 f16 o7 c+16 o7 f16 o7 c+16 o7 a-16 o8 c+16 o7 a-16 o7 f16 o7 c+16 o6 f16 | o6 a-16 o7 e-16 o7 a-16 o8 c16 o7 a-16 o7 e-16 o6 a-16 o7 e-16 o7 a-16 o8 c16 o8 e-16 o8 a-16 o8 e-16 o8 c16 o7 a-16 o7 e-16 | o7 g8 o7 e-8 o6 b-8 o6 g8 o6 e-8 o5 g8 o6 e-4 |
              o6 f16 r16 o7 f16 o6 f16 r16 o7 f16 o7 c16 o6 f16 r16 o7 f16 o7 a-16 r16 o7 f16 o7 c16 o6 f16 o6 a-16 | o6 f16 r16 o7 c+16 o6 f16 r16 o7 f16 o7 c+16 o6 f16 r16 o7 f16 o7 c+16 r16 o7 f16 o7 c+16 o6 f16 o6 c+16 | o6 a-16 r16 o7 a-16 o6 a-16 r16 o7 a-16 o7 e-16 o6 a-16 r16 o7 a-16 o8 c16 r16 o7 a-16 o7 e-16 o6 a-16 o7 c16 | o7 e-16 r16 o7 g16 o7 e-16 r16 o7 b-16 o7 g16 o7 e-16 r16 o7 b-16 o7 g16 r16 o7 b-16 o7 g16 o7 e-16 o6 b-16 |
              o6 b-16 o7 f16 o7 b-16 o8 c+16 o8 f16 o8 c+16 o7 b-16 o7 f16 o6 b-16 o7 f16 o7 b-16 o8 c+16 o8 f16 o8 b-16 o8 f16 o8 c+16 | o6 b-16 o7 f+16 o7 b-16 o8 c+16 o7 b-16 o7 f+16 o6 b-16 o6 f+16 o6 b-16 o7 f+16 o7 b-16 o8 c+16 o7 b-16 o7 f+16 o7 c+16 o6 b-16 | o6 e-16 o6 b-16 o7 e-16 o7 g16 o7 b-16 o8 e-16 o7 b-16 o7 g16 o7 e-16 o6 b-16 o7 e-16 o7 g16 o7 b-16 o8 e-16 o7 b-16 o7 g16 | o7 e-2 o6 b-4 o6 g4`,
      },
      { kind: 'bass', patch: 'bass', prog: EDM_PROG, pattern: '.r.r.r.o' },
      { kind: 'chords', patch: 'strings', prog: EDM_PROG, rhythm: 'W.......', vel: 0.45 },
      { kind: 'arp', prog: EDM_PROG, pattern: '0120', oct: 2, pan: -0.4, vel: 0.22 },
      { kind: 'drums', ...FOUR },
    ],
  },

  // 超速心跳（Hardcore，180）：A 小調。兩手交錯的十六分音符跳音、Gabber 大鼓
  hardcore: {
    bpm: 180,
    loop: true,
    gain: 0.7,
    tracks: [
      {
        kind: 'fm',
        patch: 'lead',
        pan: 0.1,
        mml: `o5 a16 o6 a16 o5 a16 o6 a16 o6 e16 o7 c16 o6 e16 o6 a16 o5 a16 o6 a16 o6 e16 o7 c16 o6 e16 o6 a16 o6 c16 o6 a16 | o5 f16 o6 f16 o5 f16 o6 f16 o6 c16 o6 a16 o6 c16 o6 f16 o5 f16 o6 f16 o6 c16 o6 a16 o6 c16 o6 f16 o5 a16 o6 f16 | o5 c16 o6 c16 o5 c16 o6 c16 o5 g16 o6 e16 o5 g16 o6 c16 o5 c16 o6 c16 o6 e16 o6 g16 o6 e16 o6 c16 o5 g16 o6 c16 | o5 b16 o6 b16 o6 d16 o6 b16 o6 g16 o5 b16 o6 g16 o6 d16 o5 b16 o6 b16 o6 d16 o6 b16 o6 g16 o5 b16 o6 g16 o5 b16 |
              o5 a16 o6 a16 o5 a16 o6 a16 o6 e16 o7 c16 o6 e16 o6 a16 o5 a16 o6 a16 o6 e16 o7 c16 o6 e16 o6 a16 o6 c16 o6 a16 | o5 f16 o6 f16 o5 f16 o6 f16 o6 c16 o6 a16 o6 c16 o6 f16 o5 f16 o6 f16 o6 c16 o6 a16 o6 c16 o6 f16 o5 a16 o6 f16 | o5 b16 o6 b16 o6 d16 o6 b16 o6 g16 o7 d16 o6 g16 o6 d16 o5 b16 o6 b16 o6 d16 o6 b16 o6 g16 o7 d16 o6 g16 o7 d16 | o5 b8 o5 a-8 o5 e8 o4 a-8 o5 e8 o5 a-8 o5 b4 |
              o5 a16 o6 a16 o5 a16 o6 a16 o7 c16 o7 e16 o7 c16 o6 a16 o7 c16 o7 e16 o7 c16 o7 e16 o7 a16 o7 e16 o7 c16 o7 e16 | o5 f16 o6 f16 o5 f16 o6 f16 o6 a16 o7 c16 o6 a16 o6 f16 o6 a16 o7 c16 o6 a16 o7 c16 o7 f16 o7 c16 o6 a16 o7 c16 | o5 c16 o6 c16 o5 c16 o6 c16 o6 e16 o6 g16 o6 e16 o6 c16 o6 e16 o6 g16 o6 e16 o6 g16 o7 c16 o6 g16 o6 e16 o6 g16 | o5 b16 o6 b16 o5 b16 o6 b16 o7 d16 o6 g16 o7 d16 o6 b16 o5 b16 o6 b16 o7 d16 o6 b16 o7 d16 o7 g16 o7 d16 o6 b16 |
              o5 d16 o6 d16 o5 d16 o6 d16 o6 f16 o6 a16 o6 f16 o6 d16 o6 f16 o6 a16 o6 f16 o6 a16 o7 d16 o6 a16 o6 f16 o6 a16 | o5 f16 o6 f16 o5 f16 o6 f16 o6 a16 o7 c16 o6 a16 o6 f16 o6 a16 o7 c16 o6 a16 o7 c16 o7 f16 o7 c16 o6 a16 o7 c16 | o5 b16 o6 b16 o5 b16 o6 b16 o6 a-16 o5 b16 o6 a-16 o6 e16 o5 b16 o5 a-16 o4 a-16 o5 e16 o4 a-16 o5 e16 o5 a-16 o5 b16 | o5 e2 o6 e4 o5 b8 o5 a-8`,
      },
      {
        kind: 'ssg',
        pan: -0.2,
        vel: 0.25,
        mml: `o6 a16 o7 a16 o6 a16 o7 a16 o7 e16 o8 c16 o7 e16 o7 a16 o6 a16 o7 a16 o7 e16 o8 c16 o7 e16 o7 a16 o7 c16 o7 a16 | o6 f16 o7 f16 o6 f16 o7 f16 o7 c16 o7 a16 o7 c16 o7 f16 o6 f16 o7 f16 o7 c16 o7 a16 o7 c16 o7 f16 o6 a16 o7 f16 | o6 c16 o7 c16 o6 c16 o7 c16 o6 g16 o7 e16 o6 g16 o7 c16 o6 c16 o7 c16 o7 e16 o7 g16 o7 e16 o7 c16 o6 g16 o7 c16 | o6 b16 o7 b16 o7 d16 o7 b16 o7 g16 o6 b16 o7 g16 o7 d16 o6 b16 o7 b16 o7 d16 o7 b16 o7 g16 o6 b16 o7 g16 o6 b16 |
              o6 a16 o7 a16 o6 a16 o7 a16 o7 e16 o8 c16 o7 e16 o7 a16 o6 a16 o7 a16 o7 e16 o8 c16 o7 e16 o7 a16 o7 c16 o7 a16 | o6 f16 o7 f16 o6 f16 o7 f16 o7 c16 o7 a16 o7 c16 o7 f16 o6 f16 o7 f16 o7 c16 o7 a16 o7 c16 o7 f16 o6 a16 o7 f16 | o6 b16 o7 b16 o7 d16 o7 b16 o7 g16 o8 d16 o7 g16 o7 d16 o6 b16 o7 b16 o7 d16 o7 b16 o7 g16 o8 d16 o7 g16 o8 d16 | o6 b8 o6 a-8 o6 e8 o5 a-8 o6 e8 o6 a-8 o6 b4 |
              o6 a16 o7 a16 o6 a16 o7 a16 o8 c16 o8 e16 o8 c16 o7 a16 o8 c16 o8 e16 o8 c16 o8 e16 o8 a16 o8 e16 o8 c16 o8 e16 | o6 f16 o7 f16 o6 f16 o7 f16 o7 a16 o8 c16 o7 a16 o7 f16 o7 a16 o8 c16 o7 a16 o8 c16 o8 f16 o8 c16 o7 a16 o8 c16 | o6 c16 o7 c16 o6 c16 o7 c16 o7 e16 o7 g16 o7 e16 o7 c16 o7 e16 o7 g16 o7 e16 o7 g16 o8 c16 o7 g16 o7 e16 o7 g16 | o6 b16 o7 b16 o6 b16 o7 b16 o8 d16 o7 g16 o8 d16 o7 b16 o6 b16 o7 b16 o8 d16 o7 b16 o8 d16 o8 g16 o8 d16 o7 b16 |
              o6 d16 o7 d16 o6 d16 o7 d16 o7 f16 o7 a16 o7 f16 o7 d16 o7 f16 o7 a16 o7 f16 o7 a16 o8 d16 o7 a16 o7 f16 o7 a16 | o6 f16 o7 f16 o6 f16 o7 f16 o7 a16 o8 c16 o7 a16 o7 f16 o7 a16 o8 c16 o7 a16 o8 c16 o8 f16 o8 c16 o7 a16 o8 c16 | o6 b16 o7 b16 o6 b16 o7 b16 o7 a-16 o6 b16 o7 a-16 o7 e16 o6 b16 o6 a-16 o5 a-16 o6 e16 o5 a-16 o6 e16 o6 a-16 o6 b16 | o6 e2 o7 e4 o6 b8 o6 a-8`,
      },
      { kind: 'bass', patch: 'bass', prog: HARDCORE_PROG, pattern: 'rrrrrrrr' },
      { kind: 'chords', patch: 'guitar', prog: HARDCORE_PROG, rhythm: 'x.x.x.x.', pan: -0.3, vel: 0.38 },
      { kind: 'drums', ...GABBER },
    ],
  },

  // 終焉頻率（Speedcore 魔王曲，200）：D 小調混弗里吉安（Eb）。顫音、快速上下行，十六分音符的 Hi-hat 與八分音符的大鼓
  speedcore: {
    bpm: 200,
    loop: true,
    gain: 0.68,
    tracks: [
      {
        kind: 'fm',
        patch: 'brass',
        pan: 0.1,
        mml: `o5 d16 o6 d16 o5 d16 o6 d16 o5 d16 o6 d16 o5 d16 o6 d16 o6 f16 o6 a16 o6 f16 o6 a16 o6 f16 o6 a16 o6 f16 o6 a16 | o5 b-16 o6 b-16 o5 b-16 o6 b-16 o5 b-16 o6 b-16 o5 b-16 o6 b-16 o7 d16 o7 f16 o7 d16 o7 f16 o7 d16 o7 f16 o7 d16 o7 f16 | o5 c16 o6 c16 o5 c16 o6 c16 o5 c16 o6 c16 o5 c16 o6 c16 o6 e16 o6 g16 o6 e16 o6 g16 o6 e16 o6 g16 o6 e16 o6 g16 | o6 c+16 o6 a16 o6 c+16 o6 a16 o6 c+16 o6 a16 o6 c+16 o6 a16 o6 e16 o7 c+16 o6 e16 o7 c+16 o6 e16 o7 c+16 o6 e16 o7 c+16 |
              o5 d16 o5 f16 o5 a16 o6 d16 o6 f16 o6 d16 o5 a16 o5 f16 o5 d16 o5 f16 o5 a16 o6 d16 o6 f16 o6 d16 o5 a16 o5 f16 | o5 b-16 o6 d16 o6 f16 o6 b-16 o7 d16 o6 b-16 o6 f16 o6 d16 o5 b-16 o6 d16 o6 f16 o6 b-16 o7 d16 o6 b-16 o6 f16 o6 d16 | o5 g16 o5 b-16 o6 d16 o6 g16 o6 b-16 o6 g16 o6 d16 o5 b-16 o5 g16 o5 b-16 o6 d16 o6 g16 o6 b-16 o6 g16 o6 d16 o5 b-16 | o7 e16 o7 c+16 o6 a16 o6 e16 o6 c+16 o5 a16 o7 c+16 o6 a16 o6 e16 o6 c+16 o5 a4. |
              o5 d16 o6 d16 o5 d16 o6 d16 o6 f16 o6 a16 o6 f16 o6 d16 o5 d16 o6 d16 o6 f16 o6 a16 o6 f16 o6 d16 o5 d16 o6 d16 | o5 e-16 o6 e-16 o5 e-16 o6 e-16 o6 g16 o6 b-16 o6 g16 o6 e-16 o5 e-16 o6 e-16 o6 g16 o6 b-16 o6 g16 o6 e-16 o5 e-16 o6 e-16 | o5 d16 o6 d16 o5 d16 o6 d16 o6 f16 o6 a16 o6 f16 o6 d16 o5 d16 o6 d16 o6 f16 o6 a16 o6 f16 o6 d16 o5 d16 o6 d16 | o5 e-16 o6 e-16 o5 e-16 o6 e-16 o6 g16 o6 b-16 o6 g16 o6 e-16 o5 e-16 o6 e-16 o6 g16 o6 b-16 o6 g16 o6 e-16 o5 e-16 o6 e-16 |
              o5 c16 o5 e16 o5 g16 o6 c16 o6 e16 o6 g16 o6 e16 o6 c16 o5 g16 o5 e16 o5 c16 o5 e16 o5 g16 o6 c16 o6 e16 o6 g16 | o7 f16 o7 d16 o6 b-16 o6 f16 o6 d16 o5 b-16 o6 d16 o6 f16 o6 b-16 o7 d16 o7 f16 o7 d16 o6 b-16 o6 f16 o6 d16 o5 b-16 | o5 a16 o6 c+16 o6 e16 o6 a16 o7 c+16 o7 e16 o7 c+16 o6 a16 o6 e16 o6 c+16 o5 a16 o6 c+16 o6 e16 o6 a16 o7 c+16 o7 e16 | o7 e8 o7 c+8 o6 a8 o6 e8 o6 c+2`,
      },
      {
        kind: 'ssg',
        pan: -0.2,
        vel: 0.25,
        mml: `o6 d16 o7 d16 o6 d16 o7 d16 o6 d16 o7 d16 o6 d16 o7 d16 o7 f16 o7 a16 o7 f16 o7 a16 o7 f16 o7 a16 o7 f16 o7 a16 | o6 b-16 o7 b-16 o6 b-16 o7 b-16 o6 b-16 o7 b-16 o6 b-16 o7 b-16 o8 d16 o8 f16 o8 d16 o8 f16 o8 d16 o8 f16 o8 d16 o8 f16 | o6 c16 o7 c16 o6 c16 o7 c16 o6 c16 o7 c16 o6 c16 o7 c16 o7 e16 o7 g16 o7 e16 o7 g16 o7 e16 o7 g16 o7 e16 o7 g16 | o7 c+16 o7 a16 o7 c+16 o7 a16 o7 c+16 o7 a16 o7 c+16 o7 a16 o7 e16 o8 c+16 o7 e16 o8 c+16 o7 e16 o8 c+16 o7 e16 o8 c+16 |
              o6 d16 o6 f16 o6 a16 o7 d16 o7 f16 o7 d16 o6 a16 o6 f16 o6 d16 o6 f16 o6 a16 o7 d16 o7 f16 o7 d16 o6 a16 o6 f16 | o6 b-16 o7 d16 o7 f16 o7 b-16 o8 d16 o7 b-16 o7 f16 o7 d16 o6 b-16 o7 d16 o7 f16 o7 b-16 o8 d16 o7 b-16 o7 f16 o7 d16 | o6 g16 o6 b-16 o7 d16 o7 g16 o7 b-16 o7 g16 o7 d16 o6 b-16 o6 g16 o6 b-16 o7 d16 o7 g16 o7 b-16 o7 g16 o7 d16 o6 b-16 | o8 e16 o8 c+16 o7 a16 o7 e16 o7 c+16 o6 a16 o8 c+16 o7 a16 o7 e16 o7 c+16 o6 a4. |
              o6 d16 o7 d16 o6 d16 o7 d16 o7 f16 o7 a16 o7 f16 o7 d16 o6 d16 o7 d16 o7 f16 o7 a16 o7 f16 o7 d16 o6 d16 o7 d16 | o6 e-16 o7 e-16 o6 e-16 o7 e-16 o7 g16 o7 b-16 o7 g16 o7 e-16 o6 e-16 o7 e-16 o7 g16 o7 b-16 o7 g16 o7 e-16 o6 e-16 o7 e-16 | o6 d16 o7 d16 o6 d16 o7 d16 o7 f16 o7 a16 o7 f16 o7 d16 o6 d16 o7 d16 o7 f16 o7 a16 o7 f16 o7 d16 o6 d16 o7 d16 | o6 e-16 o7 e-16 o6 e-16 o7 e-16 o7 g16 o7 b-16 o7 g16 o7 e-16 o6 e-16 o7 e-16 o7 g16 o7 b-16 o7 g16 o7 e-16 o6 e-16 o7 e-16 |
              o6 c16 o6 e16 o6 g16 o7 c16 o7 e16 o7 g16 o7 e16 o7 c16 o6 g16 o6 e16 o6 c16 o6 e16 o6 g16 o7 c16 o7 e16 o7 g16 | o8 f16 o8 d16 o7 b-16 o7 f16 o7 d16 o6 b-16 o7 d16 o7 f16 o7 b-16 o8 d16 o8 f16 o8 d16 o7 b-16 o7 f16 o7 d16 o6 b-16 | o6 a16 o7 c+16 o7 e16 o7 a16 o8 c+16 o8 e16 o8 c+16 o7 a16 o7 e16 o7 c+16 o6 a16 o7 c+16 o7 e16 o7 a16 o8 c+16 o8 e16 | o8 e8 o8 c+8 o7 a8 o7 e8 o7 c+2`,
      },
      { kind: 'bass', patch: 'bass', prog: SPEEDCORE_PROG, pattern: 'rorrorro' },
      { kind: 'chords', patch: 'organ', prog: SPEEDCORE_PROG, rhythm: 'W.......', vel: 0.4 },
      { kind: 'arp', prog: SPEEDCORE_PROG, pattern: '0121', oct: 1, pan: -0.4, vel: 0.25 },
      { kind: 'drums', ...BLAST },
    ],
  },
};
