// 遊戲中的輸入：六條軌道的「按下／放開」，鍵盤、手把、滑鼠／觸控合在一起。
// 節奏遊戲要的是「什麼時候按的」，所以鍵盤直接用事件的 timeStamp（不等下一個影格）；
// 手把只能每個影格讀一次（誤差最多 1/60 秒）。觸控在 engine.js 依手指落在哪一條軌道判斷。
// （選單的操作在 src/lib/components/Controls.svelte）

import { padDpad } from 'virtual-core/input/controls.js';

// 預設 S D F ／ J K L（左手三指、右手三指）；也可以用 A S D ／ ← ↓ →（右手方向鍵）
export const KEYS = [
  ['KeyS', 'KeyA'],
  ['KeyD', 'KeyW'],
  ['KeyF', 'KeyE'],
  ['KeyJ', 'ArrowLeft'],
  ['KeyK', 'ArrowDown', 'ArrowUp'],
  ['KeyL', 'ArrowRight'],
];
export const KEY_LABELS = ['S', 'D', 'F', 'J', 'K', 'L'];

const laneOfKey = new Map(KEYS.flatMap((codes, lane) => codes.map((c) => [c, lane])));

// 手把：左手 ←、↑／↓、→，右手 □／X、△／Y（或 ✕／A）、○／B；LB、RB 也當最外側
// 字串是十字鍵的方向（用 padDpad 讀，非標準手把的十字鍵也收得到），數字是按鈕編號
const PAD_LANES = [
  ['left', 4],
  ['up', 'down'],
  ['right'],
  [2],
  [3, 0],
  [1, 5],
];
export const PAD_LABELS = ['←', '↑', '→', '□', '△', '○'];

let listener = null;
// 每條軌道被幾個來源按住（鍵盤兩個鍵、手把、手指可能同時按）
const holders = Array.from({ length: 6 }, () => new Set());

function emit(lane, source, down, time) {
  const set = holders[lane];
  const was = set.size > 0;
  if (down) set.add(source);
  else set.delete(source);
  const now = set.size > 0;
  if (was !== now) listener?.(lane, now, time);
}

/** 開始收輸入：fn(lane, down, timeStamp)；回傳停止的函式 */
export function listen(fn) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
    releaseAll();
  };
}

export function releaseAll() {
  const now = performance.now();
  holders.forEach((set, lane) => {
    if (set.size) {
      set.clear();
      listener?.(lane, false, now);
    }
  });
}

function typing(target) {
  return !!target?.closest?.('input, textarea, select, [contenteditable]');
}

window.addEventListener('keydown', (e) => {
  if (e.repeat || typing(e.target) || !listener) return;
  const lane = laneOfKey.get(e.code);
  if (lane == null) return;
  e.preventDefault?.();
  emit(lane, e.code, true, e.timeStamp);
});
window.addEventListener('keyup', (e) => {
  const lane = laneOfKey.get(e.code);
  if (lane != null) emit(lane, e.code, false, e.timeStamp);
});
window.addEventListener('blur', releaseAll);

// ---------- 手把：每個影格讀一次 ----------

const padPrev = new Map();

export function pollPads() {
  if (!listener) return;
  let pads = [];
  try {
    pads = navigator.getGamepads?.() ?? [];
  } catch {
    // 某些瀏覽器在非安全環境會擋
  }
  const now = performance.now();
  for (const pad of pads) {
    // 沒有標準配置的手把也收（十字鍵另外處理，見 padDpad）
    if (!pad?.connected) continue;
    const prev = padPrev.get(pad.index) ?? [];
    const dpad = padDpad(pad);
    const cur = PAD_LANES.map((btns) => btns.some((b) => (typeof b === 'string' ? dpad[b] : pad.buttons[b]?.pressed)));
    cur.forEach((on, lane) => {
      if (on !== !!prev[lane]) emit(lane, `pad${pad.index}`, on, now);
    });
    padPrev.set(pad.index, cur);
  }
}

// ---------- 觸控／滑鼠（engine.js 依位置換算成軌道） ----------

export function pointer(lane, id, down, time) {
  emit(lane, `ptr${id}`, down, time);
}
