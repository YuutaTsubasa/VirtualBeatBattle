// 可以玩的曲子：每一首都是一隻魔王。曲子本身在 src/lib/audio/songs.js（PC-98 FM 音源），
// 譜面由 chartgen.js 從曲子的旋律與鼓點自動產生，存在 crates/beat-core/charts.json（npm run charts）。
// 魔王的圖與名字沿用虛擬闖天下的六大關（stages.js 的 WORLDS）。

export const TRACKS = [
  { id: 'city', song: 'stage-city', title: '白色大道', world: 0, repeat: 4 },
  { id: 'forest', song: 'stage-forest', title: '風之草原', world: 1, repeat: 4 },
  { id: 'sea', song: 'stage-sea', title: '深海神殿', world: 2, repeat: 3 },
  { id: 'ice', song: 'stage-ice', title: '極光山道', world: 3, repeat: 4 },
  { id: 'mine', song: 'stage-mine', title: '火炎礦坑', world: 4, repeat: 4 },
  { id: 'castle', song: 'stage-castle', title: '邪惡城堡', world: 5, repeat: 4 },
];

/** 難度：id、名稱、譜面等級（給玩家看的數字） */
export const LEVELS = [
  { id: 'easy', name: 'EASY' },
  { id: 'normal', name: 'NORMAL' },
  { id: 'hard', name: 'HARD' },
];

export const trackOf = (id) => TRACKS.find((t) => t.id === id) ?? TRACKS[0];
