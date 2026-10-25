// 可以玩的曲子：本作的原創曲（EDM、Hardcore、Speedcore，譜面比較難），加上收錄系列四款遊戲的曲子
// （虛擬台麻館＋每個角色的主題曲、虛擬排球王、虛擬闖天下、虛擬跑跑樂），每一首都是一隻魔王。
// 曲子本身在 src/lib/audio/library/（照搬各遊戲的 songs.js）與 src/lib/audio/songs.js（跑跑樂，也是本作選單的曲子），
// 譜面由 chartgen.js 從曲子的旋律與鼓點自動產生，存在 crates/beat-core/charts.json（npm run charts）。
// 魔王的圖與名字沿用虛擬闖天下的六大關（stages.js 的 WORLDS），world 決定這首是哪一隻魔王、用哪一張背景。
// 曲子會整首重複到大約一分半（repeat 由 chartgen.js 依長度算）。

import { SONGS as RUNNERS } from '../audio/songs.js';
import { compile } from '../audio/music.js';
import AUDIO_SONGS from './audio-songs/index.js';
import { SONGS as ORIGINAL } from '../audio/library/original.js';
import { SONGS as MAHJONG } from '../audio/library/mahjong.js';
import { CHARACTER_THEMES } from '../audio/library/mahjong-themes.js';
import { SONGS as VOLLEYBALL } from '../audio/library/volleyball.js';
import { SONGS as QUEST } from '../audio/library/quest.js';

/** 來源的遊戲：名稱、Logo（public/games/；本作沒有圖，用字排的 Logo）、曲庫 */
export const GAMES = [
  { id: 'original', name: '虛擬音鬥樂', short: '原創', logo: null, songs: ORIGINAL },
  // 台麻館的角色主題曲用 char-<角色 id> 當 key
  { id: 'mahjong', name: '虛擬台麻館', short: '台麻館', logo: 'games/mahjong.webp', songs: { ...MAHJONG, ...Object.fromEntries(Object.entries(CHARACTER_THEMES).map(([id, song]) => [`char-${id}`, song])) } },
  { id: 'volleyball', name: '虛擬排球王', short: '排球王', logo: 'games/volleyball.webp', songs: VOLLEYBALL },
  { id: 'quest', name: '虛擬闖天下', short: '闖天下', logo: 'games/quest.webp', songs: QUEST },
  { id: 'runners', name: '虛擬跑跑樂', short: '跑跑樂', logo: 'games/runners.webp', songs: RUNNERS },
];
export const gameOf = (id) => GAMES.find((g) => g.id === id) ?? GAMES[0];

// id、來源遊戲、那款遊戲裡的曲子 key、曲名、魔王（WORLDS 的編號 0 都市 1 森林 2 海 3 冰 4 礦坑 5 城堡）
const LIST = [
  // 原創曲
  { id: 'og-edm', game: 'original', song: 'edm', title: '霓虹頻率', world: 0, bg: 'games/og-edm.webp', cover: 'covers/og-edm.webp', boss: { key: 'neon-dj', name: '霓虹 DJ' } },
  { id: 'og-hardcore', game: 'original', song: 'hardcore', title: '超速心跳', world: 4, bg: 'games/og-hardcore.webp', cover: 'covers/og-hardcore.webp', boss: { key: 'overdrive', name: '超載機兵' } },
  { id: 'og-speedcore', game: 'original', song: 'speedcore', title: '終焉頻率', world: 5, bg: 'games/og-speedcore.webp', cover: 'covers/og-speedcore.webp', boss: { key: 'conductor', name: '終焉指揮者' } },
  { id: 'mj-title', game: 'mahjong', song: 'title', title: '夜晚的雀館', world: 0, boss: { key: 'jankui', name: '雀鬼' } },
  { id: 'mj-lobby', game: 'mahjong', song: 'lobby', title: '午後的麻將館', world: 1, boss: { key: 'jankui', name: '雀鬼' } },
  { id: 'mj-game', game: 'mahjong', song: 'game', title: '沉穩對局', world: 2, boss: { key: 'jankui', name: '雀鬼' } },
  { id: 'mj-tension', game: 'mahjong', song: 'tension', title: '海底撈月', world: 4, boss: { key: 'jankui', name: '雀鬼' } },
  // 台麻館的角色主題曲：魔王就是那位角色本人（對手，用角色的動作圖）。阿翼是隱藏角色，曲名不寫名字、魔王也不用他
  { id: 'mj-xiaocui', game: 'mahjong', song: 'char-xiaocui', title: '小翠的主題曲', world: 0, rival: { id: 'xiaocui', name: '小翠' } },
  { id: 'mj-yuehua', game: 'mahjong', song: 'char-yuehua', title: '月華的主題曲', world: 3, rival: { id: 'yuehua', name: '月華' } },
  { id: 'mj-aming', game: 'mahjong', song: 'char-aming', title: '阿明的主題曲', world: 4, rival: { id: 'aming', name: '阿明' } },
  { id: 'mj-tangtang', game: 'mahjong', song: 'char-tangtang', title: '糖糖的主題曲', world: 1, rival: { id: 'tangtang', name: '糖糖' } },
  { id: 'mj-xiaochun', game: 'mahjong', song: 'char-xiaochun', title: '小春的主題曲', world: 0, rival: { id: 'xiaochun', name: '小春' } },
  { id: 'mj-lanjie', game: 'mahjong', song: 'char-lanjie', title: '蘭姐的主題曲', world: 2, rival: { id: 'lanjie', name: '蘭姐' } },
  { id: 'mj-cangya', game: 'mahjong', song: 'char-cangya', title: '蒼牙的主題曲', world: 1, rival: { id: 'cangya', name: '蒼牙' } },
  { id: 'mj-jinye', game: 'mahjong', song: 'char-jinye', title: '金爺的主題曲', world: 4, rival: { id: 'jinye', name: '金爺' } },
  { id: 'mj-leo', game: 'mahjong', song: 'char-leo', title: '雷歐的主題曲', world: 5, rival: { id: 'leo', name: '雷歐' } },
  { id: 'mj-alie', game: 'mahjong', song: 'char-alie', title: '阿烈的主題曲', world: 3, rival: { id: 'alie', name: '阿烈' } },
  { id: 'mj-ayi', game: 'mahjong', song: 'char-ayi', title: '隱藏來客的主題曲', world: 5 },
  { id: 'vb-title', game: 'volleyball', song: 'title', title: '晴天的海灘', world: 2, boss: { key: 'blocker', name: '鐵壁攔網王' } },
  { id: 'vb-menu', game: 'volleyball', song: 'menu', title: '海邊的午後', world: 1, boss: { key: 'blocker', name: '鐵壁攔網王' } },
  { id: 'vb-match', game: 'volleyball', song: 'match', title: '全力扣殺', world: 0, boss: { key: 'blocker', name: '鐵壁攔網王' } },
  { id: 'vb-tension', game: 'volleyball', song: 'tension', title: '賽末點', world: 3, boss: { key: 'blocker', name: '鐵壁攔網王' } },
  { id: 'vq-title', game: 'quest', song: 'title', title: '踏上旅程', world: 0 },
  { id: 'vq-menu', game: 'quest', song: 'menu', title: '集合時間', world: 1 },
  { id: 'vq-city', game: 'quest', song: 'stage-city', title: '白色都市', world: 0 },
  { id: 'vq-forest', game: 'quest', song: 'stage-forest', title: '草原森林', world: 1 },
  { id: 'vq-sea', game: 'quest', song: 'stage-sea', title: '水下世界', world: 2 },
  { id: 'vq-ice', game: 'quest', song: 'stage-ice', title: '冰山', world: 3 },
  { id: 'vq-mine', game: 'quest', song: 'stage-mine', title: '火炎礦坑', world: 4 },
  { id: 'vq-castle', game: 'quest', song: 'stage-castle', title: '邪惡城堡', world: 5 },
  { id: 'vq-boss', game: 'quest', song: 'boss', title: '魔王戰', world: 4 },
  { id: 'vq-final', game: 'quest', song: 'final', title: '最後的魔王', world: 5 },
  { id: 'vr-title', game: 'runners', song: 'title', title: '晴空跑道', world: 0 },
  { id: 'vr-menu', game: 'runners', song: 'menu', title: '晴天午後', world: 1 },
  { id: 'vr-city', game: 'runners', song: 'stage-city', title: '白色大道', world: 0 },
  { id: 'vr-forest', game: 'runners', song: 'stage-forest', title: '風之草原', world: 1 },
  { id: 'vr-sea', game: 'runners', song: 'stage-sea', title: '深海神殿', world: 2 },
  { id: 'vr-ice', game: 'runners', song: 'stage-ice', title: '極光山道', world: 3 },
  { id: 'vr-mine', game: 'runners', song: 'stage-mine', title: '火炎礦坑', world: 4 },
  { id: 'vr-castle', game: 'runners', song: 'stage-castle', title: '邪惡城堡', world: 5 },
  { id: 'vr-tension', game: 'runners', song: 'tension', title: '魔王關', world: 5 },
];

// 背景：台麻館的曲子用麻將館、排球王的曲子用排球王的海灘（各畫風都有，src/lib/style-assets.json），其他用魔王那一大關的遠景
const GAME_BG = { mahjong: 'games/mahjong-parlor.webp', volleyball: 'games/volleyball-court.webp' };
// 音檔的曲子（Suno 之類，npm run import-song 接進來的）：放在原創曲的後面
// keys：有琴鍵音的話，伴奏（bgm，旋律拿掉）與旋律（sound，打中才播）兩個檔
// original：這首是哪一首 PC-98 收錄曲的新版（選曲畫面的「原曲」按鈕切過去）
const AUDIO_TRACKS = AUDIO_SONGS.map((s) => ({ id: s.id, game: s.game, song: null, title: s.title, world: s.world, bg: s.bg, boss: s.boss, rival: s.rival, original: s.original ?? null, audio: `audio/${s.id}.mp3`, keys: s.keys ? { bgm: `audio/${s.id}-bgm.mp3`, sound: `audio/${s.id}-keys.mp3` } : null, audioSong: s }));
const firstOther = LIST.findIndex((tr) => tr.game !== 'original');
export const TRACKS = [...LIST.slice(0, firstOther), ...AUDIO_TRACKS, ...LIST.slice(firstOther)].map((tr) => ({ ...tr, bg: tr.bg ?? GAME_BG[tr.game] ?? null }));

// 有音檔曲子（Suno）之後，選曲畫面與大廳先只放音檔曲子、PC-98 的收錄曲藏起來（資料與譜面都留著；要放回來把 HIDE_PC98 改成 false）
const HIDE_PC98 = true;
export const SHOWN_TRACKS = HIDE_PC98 && AUDIO_TRACKS.length ? TRACKS.filter((tr) => tr.audioSong) : TRACKS;
export const SHOWN_GAMES = GAMES.filter((g) => SHOWN_TRACKS.some((tr) => tr.game === g.id));

/** 這一首的背景圖（遊戲畫面；選曲畫面沒有封面時也用它） */
/** 選曲畫面的封面：有畫好的封面用封面，沒有就用背景 */
export const coverOf = (track) => track.cover ?? backgroundOf(track);

export const backgroundOf = (track) => track.bg ?? `stages/${['city', 'forest', 'sea', 'ice', 'mine', 'castle'][track.world]}-3/far.webp`;

/** 難度：id、名稱 */
export const LEVELS = [
  { id: 'easy', name: 'EASY' },
  { id: 'normal', name: 'NORMAL' },
  { id: 'hard', name: 'HARD' },
  { id: 'expert', name: 'EXPERT' },
];

export const trackOf = (id) => TRACKS.find((t) => t.id === id) ?? TRACKS[0];

/** 這一首的曲子資料（bpm、音軌）；音檔的曲子只有 bpm（audio: true） */
export const songOf = (track) => (track.audioSong ? { bpm: track.audioSong.bpm, loop: false, audio: true, tracks: [] } : gameOf(track.game).songs[track.song]);

// 曲子整首重複幾次：重複到大約一分半（太短的循環最多重複 24 次）
const TARGET_SECONDS = 92;
const repeats = new Map();
export function repeatOf(track) {
  if (track.audioSong) return 1;
  if (!repeats.has(track.id)) {
    const song = songOf(track);
    const sec = (compile(song).length * 60) / song.bpm;
    repeats.set(track.id, Math.max(1, Math.min(24, Math.round(TARGET_SECONDS / sec))));
  }
  return repeats.get(track.id);
}

const WORLD_IDS = ['city', 'forest', 'sea', 'ice', 'mine', 'castle'];

/**
 * 這一首的魔王：{ kind: 'bosses' | 'characters', key（圖集的 key）, name（翻譯前的名字）, rival（是不是對手角色） }
 * 角色主題曲的魔王是那位角色本人（用角色的動作圖），原創曲有自己的魔王，其他是闖天下六大關的魔王。
 */
export function bossOf(track, worlds) {
  if (track.rival) return { kind: 'characters', key: track.rival.id, name: track.rival.name, rival: true };
  // 原創曲自己的魔王（bosses/<key>.webp）
  if (track.boss) return { kind: 'bosses', key: track.boss.key, name: track.boss.name, rival: false };
  return { kind: 'bosses', key: WORLD_IDS[track.world], name: worlds[track.world].boss.name, rival: false };
}
