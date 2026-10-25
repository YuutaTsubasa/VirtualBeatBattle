// 存在這台電腦的進度：每個角色的等級與經驗值、每首曲子各難度的最佳成績、選過的角色
import { MAX_LEVEL, xpToNext } from './constants.js';

const LEVELS_KEY = 'vbb_levels';
const BEST_KEY = 'vbb_best';
const CHAR_KEY = 'vbb_character';
const PICK_KEY = 'vbb_song_pick';

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 不能存就算了
  }
}

/** 角色的等級與經驗值：{ lv, xp }（xp 是這一級累積了多少） */
export function levelOf(id) {
  const v = read(LEVELS_KEY, {})[id];
  return { lv: v?.lv ?? 1, xp: v?.xp ?? 0 };
}

/**
 * 餵經驗值：回傳 { before, after, levels }（升了幾級）。滿級之後經驗值不再累積。
 */
export function feedXp(id, gained) {
  const all = read(LEVELS_KEY, {});
  const before = levelOf(id);
  let { lv, xp } = before;
  xp += gained;
  while (lv < MAX_LEVEL && xp >= xpToNext(lv)) {
    xp -= xpToNext(lv);
    lv++;
  }
  if (lv >= MAX_LEVEL) xp = 0;
  all[id] = { lv, xp };
  write(LEVELS_KEY, all);
  return { before, after: { lv, xp }, levels: lv - before.lv };
}

const bestKey = (song, level) => `${song}:${level}`;

/** 最佳成績：{ score, rank, fc, killed } 或 null */
export function bestOf(song, level) {
  return read(BEST_KEY, {})[bestKey(song, level)] ?? null;
}

/** 記下成績（分數取最高、打倒魔王與 Full Combo 有過一次就算），回傳是不是新紀錄 */
export function recordBest(song, level, { score, rank, fc, killed }) {
  const all = read(BEST_KEY, {});
  const k = bestKey(song, level);
  const old = all[k];
  const record = !old || score > old.score;
  all[k] = {
    score: Math.max(score, old?.score ?? 0),
    rank: record ? rank : old.rank,
    fc: fc || !!old?.fc,
    killed: killed || !!old?.killed,
  };
  write(BEST_KEY, all);
  return record;
}

/** 打倒過幾隻魔王（任何難度都算） */
export function bossesDown(songs) {
  const all = read(BEST_KEY, {});
  return songs.filter((s) => Object.entries(all).some(([k, v]) => k.startsWith(`${s}:`) && v.killed)).length;
}

export function savedCharacter() {
  return read(CHAR_KEY, 'xiaocui');
}
export function saveCharacter(id) {
  write(CHAR_KEY, id);
}

/** 選曲畫面上次停在哪：{ song, level } */
export function savedPick() {
  return read(PICK_KEY, { song: 'city', level: 'normal' });
}
export function savePick(pick) {
  write(PICK_KEY, pick);
}
