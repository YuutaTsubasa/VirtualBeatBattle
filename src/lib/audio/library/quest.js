// 收錄自虛擬闖天下（YuutaTsubasa/VirtualQuest 的 src/lib/audio/songs.js），原封不動照搬，兩邊改了要一起改。
// 只收會循環的曲子（短曲 clear／win／lose 不收）。格式見 ../music.js 開頭的說明。

const DRIVE = { k: 'x...x...x...x...', s: '....x.......x.x.', h: 'xxxxxxxxxxxxxxxx' };
const ROCK = { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' };
const LIGHT = { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' };
const GALLOP = { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' };
const MARCH = { k: 'x.......x.......', s: '....x.x.....x.xx', h: 'x...x...x...x...' };
const BEAT = { k: 'x.x...x.x.x...x.', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' };
const SWAY = { k: 'x.........x.....', s: '........x.......', h: 'x..x..x..x..x..x' };

export const SONGS = {
  // 標題：出發前的冒險感，E 小調轉亮的銅管
  title: {
    bpm: 152,
    loop: true,
    gain: 0.8,
    tracks: [
      {
        kind: 'fm',
        patch: 'brass',
        pan: 0.12,
        mml: `o5 e4 g8 b8 o6 e4 d8 o5 b8 | o5 c8 e8 g8 o6 c8 o5 b4 g4 | o5 a4 f+8 a8 o6 d4 c8 o5 a8 | o5 b2 d+4 f+4 |
              o5 e4 g8 b8 o6 e4 f+8 g8 | o6 g4 f+8 e8 c4 e4 | o6 d4 c8 o5 a8 f+4 a4 | o5 b2. r4 |
              o6 c4 e8 g8 g4. e8 | o6 f+4 d8 o5 a8 o6 d2 | o6 g4 f+8 e8 d4 o5 b4 | o6 e4 d8 o5 b8 g2 |
              o5 c8 e8 g8 o6 c8 e4 g4 | o6 f+4 a8 f+8 d4 c4 | o5 b4 d+8 f+8 b4 a4 | o6 d+2 o5 b2`,
      },
      { kind: 'bass', patch: 'bass', prog: 'Em C D B Em C D B7 C D G Em C D7 B B7', pattern: 'r.ro5.r5' },
      { kind: 'chords', patch: 'strings', prog: 'Em C D B Em C D B7 C D G Em C D7 B B7', rhythm: 'W.......', vel: 0.5 },
      { kind: 'arp', prog: 'Em C D B Em C D B7 C D G Em C D7 B B7', pattern: '0121', oct: 1, pan: -0.4, vel: 0.35 },
      { kind: 'drums', ...DRIVE },
    ],
  },

  // 選單、選角、大廳：集合中的輕鬆 G 大調
  menu: {
    bpm: 118,
    loop: true,
    gain: 0.85,
    tracks: [
      {
        kind: 'fm',
        patch: 'sax',
        pan: 0.1,
        mml: `o5 b4 a8 g8 d4 g4 | o5 a4. g8 e2 | o5 c8 e8 g8 b8 a4 g4 | o5 f+2 a4 r4 |
              o5 b4 o6 d8 o5 b8 g4 a8 b8 | o6 c4 o5 b8 a8 g2 | o5 e4 g8 b8 o6 c4 e4 | o6 d2. r4`,
      },
      { kind: 'bass', patch: 'bass', prog: 'Gmaj7 Em7 Am7 D7 Gmaj7 Em7 Cmaj7 D7', pattern: 'r..5r.5.' },
      { kind: 'chords', patch: 'epiano', prog: 'Gmaj7 Em7 Am7 D7 Gmaj7 Em7 Cmaj7 D7', rhythm: '..x..x..', pan: -0.3, vel: 0.6 },
      { kind: 'drums', ...LIGHT },
    ],
  },

  // 1 白色都市：街頭搖滾，A 小調
  'stage-city': {
    bpm: 150,
    loop: true,
    gain: 0.75,
    tracks: [
      {
        kind: 'fm',
        patch: 'lead',
        pan: 0.1,
        mml: `o5 a8 a8 o6 c8 o5 a8 o6 d8 c8 o5 a8 g8 | o5 a4 e4 g8 a8 r4 | o5 f8 f8 a8 f8 o6 c8 o5 a8 f8 a8 | o5 g4 b8 o6 d8 g4 f8 d8 |
              o5 a8 a8 o6 c8 o5 a8 o6 e8 d8 c8 o5 a8 | o6 c4 o5 b8 a8 e2 | o5 f4 a8 o6 c8 f4 e8 d8 | o5 g+2 b4 r4 |
              o6 c4. o5 a8 o6 c4 d4 | o6 d4. o5 b8 o6 d4 e4 | o6 e4 g4 f+8 e8 d8 o5 b8 | o6 c4 o5 a4 e4 a4 |
              o6 f4 e8 d8 c4 o5 a4 | o5 b4 o6 c8 d8 g4 f4 | o6 e4 d8 c8 o5 b4 g+4 | o5 e8 g+8 b8 o6 e8 g+2`,
      },
      { kind: 'bass', patch: 'bass', prog: 'Am Am F G Am Am F E F G Em Am F G E E', pattern: 'rrorrro5' },
      { kind: 'chords', patch: 'guitar', prog: 'Am Am F G Am Am F E F G Em Am F G E E', rhythm: 'x.x.x.x.', pan: -0.3, vel: 0.42 },
      { kind: 'drums', ...ROCK },
    ],
  },

  // 2 草原森林：風吹過草原的長笛，D 大調
  'stage-forest': {
    bpm: 144,
    loop: true,
    gain: 0.8,
    tracks: [
      {
        kind: 'fm',
        patch: 'flute',
        pan: 0.12,
        mml: `o5 f+4 a8 f+8 d4 f+4 | o5 g4 b8 o6 d8 e4 d4 | o6 c+4 o5 a8 b8 a4 e4 | o5 f+2 d2 |
              o5 b4 o6 d8 c+8 o5 b4 f+4 | o5 g4 b8 a8 g4 d4 | o5 e4 f+8 g8 a4 c+4 | o5 e2 a2 |
              o6 d4 c+8 d8 f+4 e8 d8 | o6 d4 o5 b8 o6 d8 g4 f+8 e8 | o6 e4 c+8 e8 a4 g8 e8 | o6 f+4 d8 c+8 o5 b2 |
              o5 g8 a8 b8 o6 d8 g4 f+4 | o6 e4 d8 c+8 o5 a4 b8 o6 c+8 | o6 d4 o5 a8 f+8 d4 f+4 | o5 d2. r4`,
      },
      { kind: 'bass', patch: 'bass', prog: 'D G A D Bm G A A D G A Bm G A D D', pattern: 'r.5.r.5.' },
      { kind: 'chords', patch: 'guitar', prog: 'D G A D Bm G A A D G A Bm G A D D', rhythm: 'x.xx.xx.', pan: -0.3, vel: 0.35 },
      { kind: 'arp', prog: 'D G A D Bm G A A D G A Bm G A D D', pattern: '0120', oct: 2, pan: -0.45, vel: 0.25 },
      { kind: 'drums', ...GALLOP },
    ],
  },

  // 3 水下世界：水裡的光，慢一點的 F 大調，鐘琴琶音
  'stage-sea': {
    bpm: 108,
    loop: true,
    gain: 0.9,
    tracks: [
      {
        kind: 'fm',
        patch: 'flute',
        pan: 0.1,
        mml: `o5 a4. g8 f4 c4 | o5 e4. f8 g2 | o5 f4 a8 b-8 o6 d4 c4 | o5 b-2 g2 |
              o5 a4 o6 c8 d8 e4 c4 | o6 d4. c8 o5 a2 | o5 b-4 a8 g8 f4 d4 | o5 e2 g2`,
      },
      { kind: 'bass', patch: 'bass', prog: 'Fmaj7 Am7 Bbmaj7 C7 Fmaj7 Dm7 Gm7 C7', pattern: 'r...5...' },
      { kind: 'chords', patch: 'strings', prog: 'Fmaj7 Am7 Bbmaj7 C7 Fmaj7 Dm7 Gm7 C7', rhythm: 'W.......', vel: 0.45 },
      { kind: 'arp', patch: 'bell', prog: 'Fmaj7 Am7 Bbmaj7 C7 Fmaj7 Dm7 Gm7 C7', pattern: '0123', oct: 1, pan: -0.4, vel: 0.45 },
      { kind: 'drums', ...SWAY },
    ],
  },

  // 4 冰山：冰晶一樣的鐘聲，B 小調
  'stage-ice': {
    bpm: 126,
    loop: true,
    gain: 0.85,
    tracks: [
      {
        kind: 'fm',
        patch: 'bell',
        pan: 0.12,
        mml: `o5 b4 o6 d8 f+8 e4 d4 | o6 d4 o5 b8 g8 b2 | o5 a4 f+8 a8 o6 d4 c+4 | o6 c+2 o5 a2 |
              o5 b4 o6 d8 f+8 b4 a8 f+8 | o6 g4 f+8 e8 d2 | o6 e4 g8 f+8 e4 d4 | o6 c+2 o5 a+2`,
      },
      { kind: 'fm', patch: 'strings', pan: -0.15, vel: 0.8, mml: `o4 f+1 | o4 g1 | o4 f+1 | o4 e1 | o4 f+1 | o4 g1 | o4 g1 | o4 f+1` },
      { kind: 'bass', patch: 'bass', prog: 'Bm G D A Bm G Em F#', pattern: 'r..r5...' },
      { kind: 'arp', prog: 'Bm G D A Bm G Em F#', pattern: '0120', oct: 2, pan: -0.4, vel: 0.3 },
      { kind: 'drums', ...LIGHT },
    ],
  },

  // 5 火炎礦坑：沉重的風琴＋電吉他，E 小調
  'stage-mine': {
    bpm: 160,
    loop: true,
    gain: 0.72,
    tracks: [
      {
        kind: 'fm',
        patch: 'organ',
        pan: 0.1,
        mml: `o5 e8 e8 g8 e8 d8 e8 g4 | o5 b8 a8 g8 a8 b4 e4 | o5 c8 c8 e8 c8 g8 e8 c4 | o5 d8 d8 f+8 a8 o6 d4 c4 |
              o5 e8 e8 g8 e8 b8 a8 g4 | o5 g8 a8 b8 o6 d8 e4 d4 | o6 c4 o5 b8 a8 g4 e4 | o5 d+2 f+4 b4 |
              o6 c4. o5 b8 a4 e4 | o5 g4. a8 o6 c4 e4 | o6 e4 g8 f+8 e4 o5 b4 | o5 a4 f+8 a8 o6 d2 |
              o6 e4. d8 c4 o5 a4 | o5 g4 a8 b8 o6 c4 e4 | o6 d+4 c8 o5 b8 a4 f+4 | o5 b2. r4`,
      },
      { kind: 'bass', patch: 'bass', prog: 'Em Em C D Em Em C B Am C Em D Am C B B', pattern: 'rrrrrrrr' },
      { kind: 'chords', patch: 'guitar', prog: 'Em Em C D Em Em C B Am C Em D Am C B B', rhythm: 'x..x..x.', pan: -0.3, vel: 0.45 },
      { kind: 'drums', ...DRIVE },
    ],
  },

  // 6 邪惡城堡：哥德風的風琴進行曲，C 小調
  'stage-castle': {
    bpm: 132,
    loop: true,
    gain: 0.78,
    tracks: [
      {
        kind: 'fm',
        patch: 'organ',
        pan: 0.1,
        mml: `o5 c4 e-8 g8 o6 c4 o5 b-8 g8 | o5 a-4 g8 f8 e-2 | o5 f4 a-8 o6 c8 f4 e-8 c8 | o5 b2 d4 g4 |
              o5 c4 e-8 g8 o6 c4 d8 e-8 | o6 e-4 d8 c8 o5 a-2 | o5 a-4 g8 f8 g4 a-4 | o5 g2. r4 |
              o5 g4 b-8 o6 e-8 g4 f8 e-8 | o6 f4 d8 o5 b-8 o6 d2 | o6 c4 e-8 c8 o5 a-4 o6 c4 | o5 b4 o6 d8 f8 g2 |
              o6 g4 f8 e-8 d4 c4 | o6 c4 o5 a-8 b-8 o6 c4 f4 | o6 d4 c8 o5 b8 a-4 b4 | o5 g2 b2`,
      },
      { kind: 'bass', patch: 'bass', prog: 'Cm Ab Fm G Cm Ab Fm G Eb Bb Ab G7 Cm Fm G G7', pattern: 'r...r.5.' },
      { kind: 'chords', patch: 'strings', prog: 'Cm Ab Fm G Cm Ab Fm G Eb Bb Ab G7 Cm Fm G G7', rhythm: 'W.......', vel: 0.5 },
      { kind: 'drums', ...MARCH },
    ],
  },

  // 魔王戰：D 小調、快，銅管＋方波琶音
  boss: {
    bpm: 168,
    loop: true,
    gain: 0.75,
    tracks: [
      {
        kind: 'fm',
        patch: 'brass',
        pan: 0.1,
        mml: `o5 d8 d8 f8 d8 a8 d8 o6 d8 o5 d8 | o5 b-4 a8 g8 f4 d4 | o5 c8 c8 e8 c8 g8 c8 o6 c8 o5 c8 | o5 c+4 e4 a4 g4 |
              o6 d4 c8 o5 a8 o6 f4 e8 d8 | o6 d4 c8 o5 b-8 f4 d4 | o5 g4 b-8 o6 d8 g4 f8 e8 | o6 e2 c+2`,
      },
      { kind: 'bass', patch: 'bass', prog: 'Dm Bb C A Dm Bb Gm A', pattern: 'rrorrror' },
      { kind: 'arp', prog: 'Dm Bb C A Dm Bb Gm A', pattern: '0121', oct: 1, pan: -0.35, vel: 0.45 },
      { kind: 'drums', ...BEAT },
    ],
  },

  // 最後的魔王（邪惡城堡 6-3）：G 小調、更快，風琴＋銅管
  final: {
    bpm: 172,
    loop: true,
    gain: 0.75,
    tracks: [
      {
        kind: 'fm',
        patch: 'organ',
        pan: 0.1,
        mml: `o5 g8 g8 b-8 g8 o6 d8 o5 g8 o6 g8 f8 | o6 e-4 d8 c8 o5 b-4 g4 | o5 f8 a8 o6 c8 f8 e-4 c4 | o5 f+2 a2 |
              o6 g4 f8 e-8 d4 o5 b-8 a8 | o5 g4 b-8 o6 e-8 g4 f4 | o6 e-4 d8 c8 o5 g4 o6 c4 | o6 d2 f+2`,
      },
      { kind: 'fm', patch: 'brass', pan: -0.2, vel: 0.7, mml: `o4 g2 b-2 | o4 g2 e-2 | o4 a2 f2 | o4 a2 f+2 | o4 b-2 g2 | o4 g2 b-2 | o4 g2 e-2 | o4 f+2 a2` },
      { kind: 'bass', patch: 'bass', prog: 'Gm Eb F D Gm Eb Cm D', pattern: 'rrrrrrrr' },
      { kind: 'arp', prog: 'Gm Eb F D Gm Eb Cm D', pattern: '0121', oct: 2, pan: -0.4, vel: 0.35 },
      { kind: 'drums', ...DRIVE },
    ],
  },
};
