// 虛擬音鬥樂自己的介面音樂（全部原創，PC-98 FM 音色）：標題、選單／大廳、打完的短曲。格式見 music.js 開頭的說明。
// 旋律由 scripts/compose-mml.py 從「每小節一個和弦＋16 格節奏型」展開（UI_SONGS），每個音都寫八度；細修可以直接改這裡。
// （songs.js 是虛擬跑跑樂收錄進來的曲子，可以打；這裡的只在介面播。）

const FOUR = { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.' };
const LIGHT = { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' };

const TITLE = 'E B C#m A E B A B C#m A E B C#m A B B';
const MENU = 'Gmaj7 F#m7 Em7 A7 Gmaj7 F#m7 Em7 A7';

export const UI_SONGS = {
  // 標題：Blue Frequency，E 大調的明亮合成器流行（128）。四拍大鼓、反拍貝斯、十六分音符的琶音
  'ui-title': {
    bpm: 128,
    loop: true,
    gain: 0.75,
    tracks: [
      {
        kind: 'fm',
        patch: 'lead',
        pan: 0.1,
        mml: `o6 e4 o5 b8 o5 a-8 o5 b4 o5 e4 | o6 f+4 o6 e-8 o5 b8 o6 e-4 o7 e-4 | o5 e8 o5 a-8 o6 c+8 o5 a-8 o5 e8 o5 c+8 o5 e4 | o5 a8 o6 c+8 o6 e8 o6 a8 o7 c+2 |
              o6 e4 o5 b8 o5 a-8 o5 b4 o5 e4 | o6 f+4 o6 e-8 o5 b8 o6 e-4 o7 e-4 | o6 e8 o6 a8 o7 c+8 o6 a8 o6 e8 o6 c+8 o5 a8 o6 c+8 | o6 f+2 o6 e-4 o5 b4 |
              o6 c+8 o6 e8 o6 a-8 o6 e8 o6 c+4 o5 a-4 | o6 e8 o6 a8 o7 c+8 o6 a8 o6 e4 o6 c+4 | o6 e8 o6 a-8 o6 b8 o6 a-8 o6 e8 o5 b8 o5 a-8 o5 b8 | o6 b2 o7 e-4 o7 f+4 |
              o6 c+8 o6 e8 o6 a-8 o6 e8 o6 c+4 o5 a-4 | o6 e8 o6 a8 o7 c+8 o6 a8 o6 e4 o6 c+4 | o6 e-8 o6 f+8 o6 b8 o7 e-8 o7 f+8 o7 e-8 o6 b8 o6 f+8 | o6 b2 o6 f+4 o6 e-4`,
      },
      { kind: 'bass', patch: 'bass', prog: TITLE, pattern: '.r.r.r.o' },
      { kind: 'chords', patch: 'strings', prog: TITLE, rhythm: 'W.......', vel: 0.45 },
      { kind: 'arp', patch: 'bell', prog: TITLE, pattern: '0121', oct: 1, pan: -0.4, vel: 0.3 },
      { kind: 'drums', ...FOUR },
    ],
  },

  // 選單、選角、選曲、大廳：輕鬆的 D 大調（100），鐘聲的旋律、電鋼琴、留白多
  'ui-menu': {
    bpm: 100,
    loop: true,
    gain: 0.85,
    tracks: [
      {
        kind: 'fm',
        patch: 'bell',
        pan: 0.1,
        mml: `o6 d4 r8 o5 b8 o5 g4 r4 | o5 a8 o6 c+8 o6 f+4 o6 c+2 | o5 b4 r8 o5 g8 o5 e4 o5 g8 o5 b8 | o6 c+2 o5 a4 r4 |
              o6 g4 r8 o6 d8 o5 b4 r4 | o6 c+8 o6 f+8 o6 a4 o6 f+2 | o5 b4 o5 g8 o5 b8 o6 e4 o5 b8 o5 g8 | o5 a2 r2`,
      },
      { kind: 'bass', patch: 'bass', prog: MENU, pattern: 'r..5..r.' },
      { kind: 'chords', patch: 'epiano', prog: MENU, rhythm: 'x..x..x.', pan: -0.3, vel: 0.55 },
      { kind: 'chords', patch: 'strings', prog: MENU, rhythm: 'W.......', vel: 0.3 },
      { kind: 'drums', ...LIGHT },
    ],
  },

  // 擊破：E 大調的銅管號角（往上衝的十六分音符＋長音）
  'ui-clear': {
    bpm: 150,
    loop: false,
    tracks: [
      { kind: 'fm', patch: 'brass', pan: 0.15, mml: 'o5 l16 e g+ b o6 e g+ b o7 e4 o6 b8 o7 e2' },
      { kind: 'ssg', pan: -0.2, vel: 0.5, mml: 'o6 l16 e g+ b o7 e g+ b o8 e4 o7 b8 o8 e2' },
      { kind: 'fm', patch: 'bass', mml: 'o2 l8 e e e e4 b4 e2' },
      { kind: 'drums', k: 'x...x...x...', s: '....x..x..xx', h: 'x.x.x.x.x.x.', hits: [['c', 3.5], ['k', 3.5]] },
    ],
  },

  // 魔王逃走了：E 小調往下掉的電子音，最後停在低音
  'ui-fail': {
    bpm: 120,
    loop: false,
    tracks: [
      { kind: 'fm', patch: 'lead', mml: 'o6 l8 b g e o5 b o6 c4. o5 b8 r8 e2' },
      { kind: 'ssg', vel: 0.4, mml: 'o5 l8 e d+ d c+ c4. o4 b8 r8 e2' },
      { kind: 'fm', patch: 'bass', mml: 'o2 l8 e e e e c4. o1 b8 r8 e2' },
      { kind: 'drums', hits: [['k', 0], ['s', 1], ['k', 2], ['s', 3], ['k', 4]] },
    ],
  },
};
