// 畫面：背景、魔王、六條軌道與音符、站在判定線上的角色（同時押時另一邊出現半透明分身）、特效、HUD。只讀取狀態，不改它。
//
// 版面（960×540 的畫面座標）：
//   單機：軌道在正中間，魔王在軌道上方（音符就是魔王丟過來的攻擊），左邊角色資訊、右邊分數
//   連線 2 人：像 DJMAX 一樣左右並排（自己在左），魔王在中間上方、各自一條血條
//   連線 3～12 人：自己的軌道偏左，右邊是大家的迷你畫面（像 DJMAX 線上：名牌、RATE、BREAK、縮小的軌道、分數）
//   觀戰：魔王＋所有人的迷你畫面
// 譜面格式見 crates/beat-core/src/play.rs 的 chart_json()，狀態見 view()。
// 角色與魔王的動作圖沿用虛擬跑跑樂（虛擬闖天下的格子），背景沿用六大關的遠景。

import { W, H, LANES, LANE_COLORS, SLOT_COLORS, COUNTDOWN, atkOfLevel } from './constants.js';
import { getCharacter } from './characters.js';
import { WORLDS } from './stages.js';
import { trackOf, backgroundOf, bossOf } from './tracks.js';
import { sheetOf } from './sheets.js';
import { KEY_LABELS, PAD_LABELS } from './input.js';
import { asset, currentConfig } from '../art-style.svelte.js';
import { loadImage, whenLoaded } from '../preload.svelte.js';
import { t, displayName } from '../i18n.svelte.js';

// 內部解析度：一般風格 2 倍（1920×1080）比較銳利；像素風格用較低的倍數再放大（見 style-assets.js）
let SCALE = 2;
let cfg = currentConfig();

const ART_PATHS = {
  spark: 'effects/hit-spark.webp',
  burst: 'effects/score-burst.webp',
};
const art = (key) => loadImage(asset(ART_PATHS[key]));

// HUD 的字、框的顏色：跟介面用同一組 CSS 變數
const pal = { text: '#f5efdf', ink: '#202329', flash: '#e9b85e', paper: '#fffbf1', cream: '#f5efdf', accent: '#d94b3d', teal: '#287f78', hp: '#ff5a6e' };
let palStyle = null;
function updatePalette() {
  const style = document.documentElement.dataset.style ?? 'anime90';
  if (style === palStyle) return;
  palStyle = style;
  const css = getComputedStyle(document.documentElement);
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  pal.text = v('--on-dark', '#fff');
  pal.ink = v('--navy', '#202329');
  pal.flash = v('--gold', '#e9b85e');
  pal.paper = v('--paper-white', '#fff');
  pal.accent = v('--accent', '#d94b3d');
  pal.cream = v('--cream', '#f5efdf');
  pal.teal = v('--teal', '#287f78');
}

const ready = (img) => img && img.complete && img.naturalWidth > 0;
const FONT = '"Noto Sans TC", "Microsoft JhengHei", sans-serif';
const JUDGE_TEXT = { P: 'PERFECT', G: 'GREAT', D: 'GOOD', M: 'MISS' };
const JUDGE_COLOR = { P: '#ffe066', G: '#7fe3ff', D: '#9dff8a', M: '#ff6b7a' };

// ---------- 特效 ----------

const particles = [];
const effects = [];
const floaters = []; // 「1234」之類往上飄的字
const streaks = []; // 打中時從判定線往魔王飛的光
const banners = []; // 畫面中間的大字（魔王出現、擊破）
let frame = 0;
let shake = 0;

function effect(key, x, y, w, life, { rot = 0, grow = 0.3, alpha = 1 } = {}) {
  effects.push({ key, x, y, w, life, max: life, rot, grow, alpha });
}

function burst(x, y, color, n, speed, life = 26, gravity = 0.2) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.8);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.4, life, max: life, color, size: 2 + Math.random() * 3, gravity });
  }
}

function floater(text, x, y, color = pal.flash, size = 18) {
  floaters.push({ text, x, y, life: 44, color, size });
}

/** 大字提示。small：曲子進行中用的小提示（放在上方魔王血條底下，不擋音符）；不是 small 的只在倒數時用 */
function banner(text, sub = '', life = 120, color = '#ffd84a', small = false) {
  banners.length = 0;
  banners.push({ text, sub, life, max: life, color, small });
}

function outlinedText(g, text, x, y, size, fill = pal.text, align = 'center', stroke = pal.ink) {
  g.font = `900 ${size}px ${FONT}`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(3, size / 5);
  g.strokeStyle = stroke;
  g.strokeText(text, x, y);
  g.fillStyle = fill;
  g.fillText(text, x, y);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

// ---------- 動作圖 ----------

const CELL_H = 120;
const ANCHOR = 496 / 512;

function drawFrame(g, sheet, name, x, y, h, facing, { fallback = 'idle', flash = 0, alpha = 1, tint = null } = {}) {
  const img = loadImage(asset(sheet.src));
  if (!ready(img)) return false;
  let i = sheet.frames.indexOf(name);
  if (i < 0) i = Math.max(0, sheet.frames.indexOf(fallback));
  const c = sheet.cell;
  h *= (sheet.fix?.[sheet.frames[i]] ?? 1) * (sheet.scale ?? 1);
  // 像素圖集：讓一個邏輯像素剛好對到整數個畫布像素（不然最近鄰縮放會吃掉輪廓線）
  if (sheet.pixel) {
    const k = (h * SCALE) / c;
    if (k >= 0.75) h = (Math.round(k) * c) / SCALE;
  }
  g.save();
  g.translate(x, y);
  if (facing < 0) g.scale(-1, 1);
  if (alpha < 1) g.globalAlpha *= alpha;
  const filters = [];
  if (flash > 0) filters.push('brightness(2.2)');
  // 分身：偏藍、發光（像素風格的半透明在 alpha 上已經處理）
  if (tint) filters.push(`drop-shadow(0 0 6px ${tint})`, 'saturate(0.6)', 'brightness(1.25)');
  if (filters.length) g.filter = filters.join(' ');
  g.drawImage(img, (i % sheet.cols) * c, Math.floor(i / sheet.cols) * c, c, c, -h / 2, -h * ANCHOR, h, h);
  g.restore();
  return true;
}

function drawFallbackPerson(g, character, x, y, h, alpha = 1) {
  const c = getCharacter(character);
  g.save();
  g.globalAlpha *= alpha;
  g.fillStyle = c.clothes;
  g.beginPath();
  g.ellipse(x, y - h * 0.32, h * 0.18, h * 0.26, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = c.hair;
  g.beginPath();
  g.arc(x, y - h * 0.66, h * 0.15, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// 音鬥樂的背面動作圖（站在判定線上背對玩家、面向魔王）：有的角色就把一般的動作換成背面的
const BACK_POSE = {
  idle: 'back-idle',
  dash: 'back-idle',
  punch1: 'back-strike1',
  punch2: 'back-strike2',
  kick: 'back-strike2',
  sweep: 'back-sweep',
  special: 'back-hold',
  release: 'back-release',
  win: 'back-release',
  hurt: 'back-hurt',
  down: 'back-hurt',
};
// 沒有背面圖的角色：同時押、長押放開用相近的側面動作
const SIDE_POSE = { sweep: 'kick', release: 'kick' };

function drawPerson(g, character, pose, x, y, h, opts = {}) {
  const sheet = sheetOf('characters', character);
  if (sheet?.frames.includes('back-idle')) pose = BACK_POSE[pose] ?? pose;
  else pose = SIDE_POSE[pose] ?? pose;
  if (!(sheet && drawFrame(g, sheet, pose, x, y, h, opts.facing ?? 1, opts))) drawFallbackPerson(g, character, x, y, h, opts.alpha ?? 1);
}

// ---------- 版面 ----------

/** 一條（一組六條）軌道：cx 中心、laneW 每條寬、top 音符出現的高度、judge 判定線 */
/**
 * 一組六條軌道：cx 中心、laneW 判定線上每條的寬、top 音符出現的高度、judge 判定線。
 * Z > 1 是斜的（像 CHUNITHM／DEEMO 往遠處收窄，音符從遠處過來）：頂端的寬是判定線的 1/Z；
 * 沒有 Z 是直的（連線時看別人的畫面）。
 */
const field = (cx, laneW, { top = 120, judge = 432, Z = 0 } = {}) => ({
  cx,
  laneW,
  top,
  judge,
  Z,
  // 消失點的高度：讓 r = 1（音符剛出現）剛好落在 top
  vy: Z > 1 ? (top * Z - judge) / (Z - 1) : 0,
  left: cx - (laneW * LANES) / 2,
  width: laneW * LANES,
});
const laneX = (f, lane) => f.left + f.laneW * (lane + 0.5);

/**
 * 軌道上的一點 → 畫面座標。u：橫的位置（0 左邊、1 右邊），r：0 在判定線、1 在最遠（音符剛出現）、負的是過了判定線。
 * 回傳 { x, y, s }，s 是那個深度的縮放（判定線上是 1）。
 */
function proj(f, u, r) {
  if (!(f.Z > 1)) return { x: f.left + u * f.width, y: f.judge - r * (f.judge - f.top), s: 1 };
  const z = Math.max(0.55, 1 + r * (f.Z - 1));
  const sc = 1 / z;
  return { x: f.cx + (u - 0.5) * f.width * sc, y: f.vy + (f.judge - f.vy) * sc, s: sc };
}

/** 畫面上的高度 y → 軌道上的 r（proj 反過來） */
function rAtY(f, y) {
  if (!(f.Z > 1)) return (f.judge - y) / (f.judge - f.top);
  const sc = (y - f.vy) / (f.judge - f.vy);
  return (1 / Math.max(0.01, sc) - 1) / (f.Z - 1);
}

/** 沿著軌道畫一塊四邊形（u0～u1、r0～r1） */
function quad(g, f, u0, u1, r0, r1) {
  const a = proj(f, u0, r0);
  const b = proj(f, u1, r0);
  const c = proj(f, u1, r1);
  const d = proj(f, u0, r1);
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.lineTo(c.x, c.y);
  g.lineTo(d.x, d.y);
  g.closePath();
}

// 軌道一路收窄到魔王的腳下（像一條通往魔王的路）：音符從魔王腳邊出來，魔王本身不會被軌道擋住
const SOLO = { mode: 'solo', main: field(480, 74, { top: 198, judge: 446, Z: 5 }), rival: null, boss: { x: 480, y: 202, h: 170 } };
let layout = SOLO;

// 版面（art-work/rhythm-ui-concept-v1）：
//   單機：軌道在中間，魔王在後面上方，左邊角色與體力、右邊分數與連擊
//   2 人（DUEL）：左右各半，每半邊是名牌（體力、魔王剩餘）＋左邊分數與連擊＋軌道
//   3 人以上：左邊自己的名牌與軌道，右邊大家的一列一列（小軌道、分數、連擊、準確率、魔王剩餘）
function computeLayout(race, you, spectate) {
  if (spectate) return { mode: 'spectate', main: null, rival: null, boss: { x: 480, y: 210, h: 190 } };
  const n = race?.players?.length ?? 1;
  if (!race || n <= 1) return SOLO;
  if (n === 2) {
    const rival = race.players.find((p) => p.seat !== you);
    return { mode: 'duo', main: field(310, 52, { top: 104, judge: 446, Z: 3 }), rival: { f: field(790, 44, { top: 112, judge: 446 }), seat: rival?.seat }, boss: { x: 480, y: 260, h: 230 } };
  }
  return { mode: 'multi', main: field(250, 60, { top: 214, judge: 446, Z: 4.5 }), rival: null, boss: { x: 250, y: 218, h: 120 } };
}

/** 觸控：畫面座標 (x, y) 落在自己的哪一條軌道（判定線上方一點到畫面底部都算） */
export function laneAt(x, y) {
  const f = layout.main;
  if (!f || y < f.top + 60) return null;
  // 斜的軌道：換算成那個高度的橫向位置
  const sc = f.Z > 1 ? Math.max(0.3, (y - f.vy) / (f.judge - f.vy)) : 1;
  const u = (x - f.cx) / (f.width * sc) + 0.5;
  if (u < -0.12 || u > 1.12) return null;
  return Math.max(0, Math.min(LANES - 1, Math.floor(u * LANES)));
}

// ---------- 自己的角色與分身 ----------

// body：本體；clone：分身（同時押的另一側、或打到另一側時出現）
const me = {
  x: 480,
  pose: 'idle',
  poseT: 0,
  hurt: 0,
  attack: 0,
  trail: [],
  clone: { lane: -1, x: 0, alpha: 0, attack: 0, pose: 'punch1' },
};
const ATTACKS = ['punch1', 'punch2', 'kick'];
let attackN = 0;
const pressed = new Array(LANES).fill(0); // 軌道按下的光（倒數）
const held = new Array(LANES).fill(false);
let judgeShow = null; // { j, off, life }
let bossHurt = 0;
let bossSlam = 0;
let comboPop = 0;
let downShown = false;

// 別人（並排的對手、迷你畫面）：上一次的進度，拿來偵測「剛打中」「剛 Miss」
const others = new Map(); // seat → { combo, x, attack, hurt, flash, lane }

export function lanePress(lane, down) {
  held[lane] = down;
  if (down) pressed[lane] = 10;
}

export function reset() {
  particles.length = 0;
  effects.length = 0;
  floaters.length = 0;
  streaks.length = 0;
  banners.length = 0;
  others.clear();
  me.x = 480;
  me.hurt = me.attack = 0;
  me.trail.length = 0;
  me.clone.alpha = 0;
  me.clone.lane = -1;
  held.fill(false);
  pressed.fill(0);
  judgeShow = null;
  bossHurt = bossSlam = comboPop = 0;
  downShown = false;
  scanFrom = 0;
  introShown = false;
  shake = 0;
}

/** 自己這一格的事件（判定、受傷、擊破…）→ 特效 */
export function handleEvents(events, v) {
  const f = layout.main;
  if (!f) return;
  const b = layout.boss;
  // 這一格裡同時打中的音符：離本體最近的給本體，另一側的給分身
  const hits = events.filter((e) => e.type === 'judge' && e.j !== 'M' && !e.tail);
  if (hits.length) {
    const bodySide = me.x < f.cx ? 0 : 1;
    const sorted = [...hits].sort((a, c) => Math.abs(laneX(f, a.lane) - me.x) - Math.abs(laneX(f, c.lane) - me.x));
    const mine = sorted[0];
    const side = (lane) => (lane < 3 ? 0 : 1);
    me.x = laneX(f, mine.lane);
    me.attack = 12;
    me.pose = ATTACKS[attackN++ % ATTACKS.length];
    const other = sorted.find((e) => side(e.lane) !== side(mine.lane));
    // 左右同時押：本體兩手往外揮（分身在另一邊一起打）
    if (other || mine.chord) me.pose = 'sweep';
    if (other || (hits.length === 1 && mine.chord && side(mine.lane) !== bodySide)) {
      const e = other ?? mine;
      me.clone.lane = e.lane;
      me.clone.x = laneX(f, e.lane);
      me.clone.alpha = 0.55;
      me.clone.attack = 14;
      me.clone.pose = ATTACKS[attackN % ATTACKS.length];
    }
  }
  // 長押放開的那一下：大動作往上揮
  const release = events.find((e) => e.type === 'judge' && e.tail && e.j !== 'M');
  if (release) {
    me.x = laneX(f, release.lane);
    me.attack = 14;
    me.pose = 'release';
  }
  for (const e of events) {
    if (e.type === 'judge') {
      judgeShow = { j: e.j, off: e.off, life: 34 };
      const x = laneX(f, e.lane);
      if (e.j === 'M') continue;
      const color = JUDGE_COLOR[e.j];
      effect('spark', x, f.judge, e.j === 'P' ? 70 : 52, 14, { rot: Math.random() * 6 });
      burst(x, f.judge, color, e.j === 'P' ? 8 : 4, 3.2, 20);
      streaks.push({ x0: x, y0: f.judge - 30, x1: b.x + (Math.random() - 0.5) * 60, y1: b.y - b.h * 0.35, life: 10, max: 10, color, w: e.chord ? 7 : 4 });
      bossHurt = 6;
      if (e.dmg > 0 && (e.j === 'P' || e.chord || e.tail)) floater(String(e.dmg), b.x + (Math.random() - 0.5) * 120, b.y - b.h * 0.55, color, e.chord ? 22 : 16);
    } else if (e.type === 'hurt' || e.type === 'mine') {
      me.hurt = 16;
      bossSlam = 18;
      shake = e.type === 'mine' ? 8 : 4;
      floater(`-${e.hurt}`, me.x, f.judge + 20, pal.hp, 20);
      if (e.type === 'mine') {
        const x = laneX(f, e.lane);
        burst(x, f.judge, '#ff4d5e', 14, 4.5, 28);
        effect('burst', x, f.judge, 90, 16);
      }
    } else if (e.type === 'parry') {
      floater(t('擋下！'), me.x, f.judge - 10, '#c9f2ff', 20);
    } else if (e.type === 'heal') {
      floater(`+${e.hp}`, me.x, f.judge, '#7dff9a', 18);
    } else if (e.type === 'combo') {
      comboPop = 20;
      floater(`${e.n} COMBO!`, f.cx, f.top + 120, '#ffd84a', 22);
    } else if (e.type === 'bossdown') {
      banner(t('擊破！'), t('之後的傷害是 OVERKILL'), 100, '#ffd84a', true);
      shake = 14;
      burst(b.x, b.y - b.h * 0.4, '#ffd84a', 40, 7, 50, 0.12);
    } else if (e.type === 'down') {
      if (!downShown) banner(t('體力歸零……'), t('戰鬥輸了，曲子打完還是有技術分！'), 100, '#ff6b7a', true);
      downShown = true;
    } else if (e.type === 'hold') {
      effect('spark', laneX(f, e.lane), f.judge, 48, 10);
    }
  }
}

// ---------- 背景與魔王 ----------

function drawBackdrop(g, track, worldId, ms, bpm) {
  // 台麻館的曲子：麻將館一整張（不捲動）；其他：魔王那一大關的遠景＋中景，慢慢捲
  const far = loadImage(asset(backgroundOf(track)));
  const mid = track.bg ? null : loadImage(asset(`stages/${worldId}-3/mid.webp`));
  g.fillStyle = '#10121c';
  g.fillRect(0, 0, W, H);
  for (const [img, drift] of [
    [far, 0.004],
    [mid, 0.012],
  ]) {
    if (!img || !ready(img)) continue;
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * s;
    const x = track.bg ? (W - w) / 2 : -((frame * drift * 60) % Math.max(1, w - W));
    g.drawImage(img, x, (H - img.naturalHeight * s) / 2, w, img.naturalHeight * s);
  }
  // 深藍夜色：背景壓暗、偏藍，跟著拍子微微亮一下
  const beat = bpm ? ((Math.max(0, ms) / (60000 / bpm)) % 1) : 0.5;
  g.fillStyle = `rgba(3,8,32,${0.84 - (1 - beat) ** 4 * 0.08})`;
  g.fillRect(0, 0, W, H);
  const glow = g.createLinearGradient(0, 0, 0, H);
  glow.addColorStop(0, 'rgba(20,80,245,0.18)');
  glow.addColorStop(0.6, 'rgba(20,80,245,0)');
  glow.addColorStop(1, 'rgba(47,198,255,0.12)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
}

// 對手角色（角色主題曲的魔王）沒有魔王的格子：用角色圖集裡相近的動作
const RIVAL_POSE = { idle: 'idle', walk1: 'idle', windup: 'special', slam: 'kick', hurt: 'hurt', down: 'down' };

function drawBoss(g, boss, b, { killed = false, mineSoon = false } = {}) {
  const sheet = sheetOf(boss.kind, boss.key);
  let pose = 'idle';
  if (killed) pose = 'down';
  else if (bossSlam > 8) pose = 'slam';
  else if (bossHurt > 0) pose = 'hurt';
  else if (mineSoon) pose = 'windup';
  else if (Math.floor(frame / 30) % 2) pose = 'walk1';
  if (boss.rival) pose = RIVAL_POSE[pose] ?? 'idle';
  const sx = bossHurt > 0 ? (Math.random() - 0.5) * 6 : 0;
  const flash = bossHurt > 3 ? 1 : 0;
  g.save();
  // 光暈
  const grad = g.createRadialGradient(b.x, b.y - b.h * 0.4, 10, b.x, b.y - b.h * 0.4, b.h * 0.7);
  grad.addColorStop(0, killed ? 'rgba(255,216,74,0.35)' : 'rgba(80,140,255,0.3)');
  grad.addColorStop(1, 'rgba(80,140,255,0)');
  g.fillStyle = grad;
  g.fillRect(b.x - b.h, b.y - b.h * 1.2, b.h * 2, b.h * 1.5);
  // 對手角色：角色圖集的人比魔王小，畫大一點，加一圈紅色的光（看得出是敵人）
  const h = boss.rival ? b.h * 1.25 : b.h;
  const opts = { flash, alpha: killed ? 0.45 : b.alpha ?? 0.8, tint: boss.rival ? 'rgba(255,60,90,0.9)' : null };
  if (!(sheet && drawFrame(g, sheet, pose, b.x + sx, b.y, h, -1, opts))) {
    g.fillStyle = '#5a3a6a';
    g.beginPath();
    g.arc(b.x, b.y - b.h * 0.4, b.h * 0.3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** 斜切的長條（體力、魔王血條、準確率） */
function slant(g, x, y, w, h, k, color, back = 'rgba(255,255,255,0.12)') {
  const c = h * 0.8;
  const path = (len) => {
    g.beginPath();
    g.moveTo(x + c, y);
    g.lineTo(x + len, y);
    g.lineTo(x + len - c, y + h);
    g.lineTo(x, y + h);
    g.closePath();
  };
  g.fillStyle = back;
  path(w);
  g.fill();
  const len = Math.max(0, Math.min(1, k)) * w;
  if (len > c) {
    g.fillStyle = color;
    path(len);
    g.fill();
  }
}

/** 魔王血條：上面左邊名字、右邊 HP，下面斜切的紅條；打倒之後是 BREAK／OVERKILL */
function drawBossBar(g, x, y, w, dmg, max, { name = '', small = false } = {}) {
  const h = small ? 6 : 10;
  const left = Math.max(0, 1 - dmg / Math.max(1, max));
  const over = dmg > max ? (dmg - max) / max : 0;
  if (name) {
    text(g, name, x + 4, y - 9, small ? 12 : 16, '#fff', 'left', 900);
    if (left > 0) text(g, 'HP', x + w, y - 9, 12, 'rgba(255,255,255,0.8)', 'right', 900);
  }
  slant(g, x, y, w, h, left, '#ff3b55');
  if (left === 0) {
    slant(g, x, y, w * Math.min(1, over), h, 1, `rgba(255,216,74,${0.6 + Math.sin(frame * 0.2) * 0.3})`, 'rgba(0,0,0,0)');
    text(g, over > 0 ? `OVERKILL +${Math.round(over * 100)}%` : 'BREAK!', x + w, y - 9, small ? 11 : 14, '#ffd84a', 'right', 900);
  }
}

/** 斜體的 HUD 字（概念圖的字都沒有外框，只有一點陰影） */
function text(g, str, x, y, size, color = '#fff', align = 'left', weight = 900, italic = true) {
  g.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(0,10,40,0.6)';
  g.fillText(str, x + 1, y + 1.5);
  g.fillStyle = color;
  g.fillText(str, x, y);
}

// ---------- 軌道與音符 ----------

let scanFrom = 0;

// ghost：別人的畫面（沒有每顆的判定）時傳「最近漏掉的音符」的 Set，其他過了判定線就當作打到了
function drawField(g, f, chart, statuses, ms, fall, { me: isMe = true, held: heldLanes = held, keys = null, ghost = null } = {}) {
  const { judge, laneW } = f;
  // 斜的軌道畫到最遠處（魔王腳下）為止；直的（別人的畫面）往上多延伸一點
  const rTop = f.Z > 1 ? 1 : 1.12;
  const rBottom = rAtY(f, H + 2);
  g.save();
  // 底板：遠處幾乎透明（看得到後面的魔王），越近越暗
  const grad = g.createLinearGradient(0, proj(f, 0, rTop).y, 0, judge);
  grad.addColorStop(0, 'rgba(2,6,24,0)');
  grad.addColorStop(0.35, 'rgba(2,6,24,0.25)');
  grad.addColorStop(0.7, 'rgba(2,6,24,0.75)');
  grad.addColorStop(1, 'rgba(4,12,40,0.92)');
  g.fillStyle = grad;
  quad(g, f, 0, 1, rBottom, rTop);
  g.fill();
  // 分隔線（外框亮一點、中間那條是左右手的分界）
  for (let i = 0; i <= LANES; i++) {
    const edge = i === 0 || i === LANES;
    const a = proj(f, i / LANES, rBottom);
    const b = proj(f, i / LANES, rTop);
    g.strokeStyle = edge ? 'rgba(70,150,255,0.9)' : i === 3 ? 'rgba(120,190,255,0.5)' : 'rgba(90,150,255,0.22)';
    g.lineWidth = edge ? 3 : 1;
    if (edge) {
      g.shadowColor = 'rgba(47,140,255,0.9)';
      g.shadowBlur = 12;
    }
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    g.shadowBlur = 0;
  }
  // 按下的光
  for (let lane = 0; lane < LANES; lane++) {
    const on = heldLanes[lane];
    const k = on ? 1 : pressed[lane] / 10;
    if (!isMe && !on) continue;
    if (k <= 0) continue;
    const top = proj(f, 0, 0.55).y;
    const lg = g.createLinearGradient(0, judge, 0, top);
    lg.addColorStop(0, `rgba(90,170,255,${0.55 * k})`);
    lg.addColorStop(1, 'rgba(90,170,255,0)');
    g.fillStyle = lg;
    quad(g, f, (lane + 0.04) / LANES, (lane + 0.96) / LANES, 0, 0.55);
    g.fill();
  }
  // 判定線：發光的青藍
  const jl = proj(f, 0, 0);
  g.save();
  g.shadowColor = '#2fc6ff';
  g.shadowBlur = 14;
  g.fillStyle = '#9fe4ff';
  g.fillRect(jl.x - 6, judge - 2, f.width + 12, 4);
  g.restore();
  g.fillStyle = 'rgba(47,198,255,0.35)';
  g.fillRect(jl.x, judge + 2, f.width, 3);
  // 音符
  if (chart) drawNotes(g, f, chart, statuses, ms, fall, ghost);
  // 鍵位提示
  if (keys && isMe) {
    const labels = keys === 'pad' ? PAD_LABELS : KEY_LABELS;
    for (let lane = 0; lane < LANES; lane++) text(g, labels[lane], laneX(f, lane), judge + 20, Math.min(18, laneW * 0.36), heldLanes[lane] ? '#2fc6ff' : '#ffffff', 'center', 900, false);
  }
  g.restore();
}

function drawNotes(g, f, chart, statuses, ms, fall, ghost) {
  const { laneW } = f;
  const notes = chart.notes;
  const rBottom = rAtY(f, H + 30);
  // 從還沒完全過去的第一顆開始畫（往後找到超出最遠處就停）
  while (scanFrom < notes.length && notes[scanFrom][0] + notes[scanFrom][2] < ms - 600) scanFrom++;
  const w = laneW - 8;
  const wu = w / f.width; // 音符寬（u 的單位）
  for (let i = Math.max(0, scanFrom - 4); i < notes.length; i++) {
    const [nt, lane, len, kind, chord] = notes[i];
    const r = (nt - ms) / fall;
    if (r > (f.Z > 1 ? 1 : 1.08)) break;
    const st = ghost ? (ghost.has(i) ? 'M' : nt <= ms ? (len && nt + len > ms ? 'h' : 'P') : '0') : (statuses[i] ?? '0');
    if ('PGDx'.includes(st)) continue;
    const u = (lane + 0.5) / LANES;
    const missed = st === 'M' || st === 'm';
    if (r < rBottom && !len) continue;
    g.globalAlpha = missed ? 0.35 : 1;
    let head = r;
    if (len > 0) {
      const holding = st === 'h';
      if (holding) head = 0;
      const tail = Math.min(f.Z > 1 ? 1 : 1.1, (nt + len - ms) / fall);
      if (tail > rBottom) {
        const a = proj(f, u, head);
        const b = proj(f, u, tail);
        // 長押的身體：亮青色的實心長條＋兩邊白色的邊（在深藍的軌道上要一眼看得出來）；按住時更亮、會閃
        const bodyGrad = g.createLinearGradient(0, b.y, 0, a.y);
        bodyGrad.addColorStop(0, holding ? 'rgba(150,220,255,0.75)' : 'rgba(90,170,255,0.62)');
        bodyGrad.addColorStop(1, holding ? 'rgba(200,240,255,0.95)' : 'rgba(130,205,255,0.85)');
        g.fillStyle = bodyGrad;
        quad(g, f, u - wu * 0.36, u + wu * 0.36, Math.max(head, rBottom), tail);
        g.fill();
        g.strokeStyle = holding ? `rgba(255,255,255,${0.75 + Math.sin(frame * 0.5) * 0.25})` : 'rgba(255,255,255,0.8)';
        g.lineWidth = holding ? 2.5 : 1.5;
        g.stroke();
        // 中間一條細的亮線（遠處也看得出是一條）
        g.fillStyle = 'rgba(255,255,255,0.35)';
        quad(g, f, u - wu * 0.06, u + wu * 0.06, Math.max(head, rBottom), tail);
        g.fill();
        if (tail < 1.08) {
          const e = proj(f, u, tail);
          g.fillStyle = '#cfe6ff';
          g.fillRect(e.x - (w * e.s * 0.84) / 2, e.y - 3 * e.s, w * e.s * 0.84, 6 * e.s);
        }
      }
    }
    if (head > 1.08 || head < rBottom) {
      g.globalAlpha = 1;
      continue;
    }
    // 斜的軌道：音符在最遠處（魔王腳下）慢慢浮現
    if (f.Z > 1 && head > 0.9) g.globalAlpha *= Math.max(0, (1 - head) / 0.1);
    const pt = proj(f, u, head);
    if (kind === 1) drawMine(g, pt.x, pt.y, laneW * pt.s);
    else drawTap(g, pt.x, pt.y, w * pt.s, null, chord, pt.s);
    g.globalAlpha = 1;
  }
  g.globalAlpha = 1;
}

function drawTap(g, x, y, w, color, chord, scale = 1) {
  const h = 11 * scale;
  g.save();
  g.shadowColor = chord ? 'rgba(255,200,61,0.95)' : 'rgba(70,160,255,0.95)';
  g.shadowBlur = 12;
  const grad = g.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  if (chord) {
    // 同時押（分身會出現）：金色
    grad.addColorStop(0, '#fff6c8');
    grad.addColorStop(0.5, '#ffd24a');
    grad.addColorStop(1, '#e09a12');
  } else {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.6, '#e8f2ff');
    grad.addColorStop(1, '#9cc8ff');
  }
  g.fillStyle = grad;
  g.fillRect(x - w / 2, y - h / 2, w, h);
  g.restore();
  void color;
}

function drawMine(g, x, y, laneW) {
  const r = Math.min(13, laneW * 0.28);
  g.save();
  g.translate(x, y);
  g.rotate(frame * 0.08);
  g.fillStyle = '#ff3b4e';
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = i % 2 ? r * 0.62 : r * 1.12;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.strokeStyle = '#2a0b12';
  g.lineWidth = 2;
  g.stroke();
  g.restore();
  outlinedText(g, '!', x, y + 1, 13, '#fff', 'center', '#2a0b12');
}

// ---------- 角色 ----------

/** 自己的本體要站哪一條、分身要不要先出現：看最接近的下一拍 */
function aimMe(f, chart, statuses, ms) {
  const notes = chart.notes;
  let holdLane = -1;
  let next = null;
  for (let i = Math.max(0, scanFrom - 4); i < notes.length; i++) {
    const [nt, lane, len, kind] = notes[i];
    const st = statuses[i];
    if (st === 'h') holdLane = lane;
    if (kind === 1 || st !== '0' || nt < ms - 80) continue;
    if (nt - ms > 700) break;
    if (!next) next = { t: nt, lanes: [lane] };
    else if (Math.abs(nt - next.t) < 5) next.lanes.push(lane);
    else break;
  }
  return { holdLane, next };
}

function drawMe(g, f, character, chart, statuses, ms, v, scale = 1) {
  const h = CELL_H * scale * (f.laneW / 58) * 1.05;
  const feet = Math.min(H - 6, f.judge + h * 0.82);
  const { holdLane, next } = chart ? aimMe(f, chart, statuses, ms) : { holdLane: -1, next: null };
  // 本體：長押中就黏在那一條；不然往下一拍最近的那一條走
  let target = me.x;
  if (holdLane >= 0) target = laneX(f, holdLane);
  else if (next && me.attack <= 4) {
    const lanes = next.lanes.map((l) => laneX(f, l)).sort((a, b) => Math.abs(a - me.x) - Math.abs(b - me.x));
    target = lanes[0];
    // 同時押的另一側：分身先淡淡地出現在那裡
    const other = next.lanes.find((l) => (l < 3) !== (lanes[0] < f.cx));
    if (other != null && next.t - ms < 450 && me.clone.attack <= 0) {
      me.clone.lane = other;
      me.clone.x = laneX(f, other);
      me.clone.alpha = Math.max(me.clone.alpha, 0.15 + (1 - (next.t - ms) / 450) * 0.3);
      me.clone.pose = 'idle';
    }
  }
  const before = me.x;
  me.x += (target - me.x) * 0.32;
  if (Math.abs(me.x - before) > f.laneW * 0.4) me.trail.push({ x: before, life: 8 });
  // 殘影
  for (const tr of me.trail) {
    drawPerson(g, character, 'dash', tr.x, feet, h, { alpha: (tr.life / 8) * 0.3, tint: '#7fd8ff' });
    tr.life--;
  }
  me.trail = me.trail.filter((tr) => tr.life > 0);
  // 影子
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath();
  g.ellipse(me.x, feet + 2, h * 0.22, 5, 0, 0, Math.PI * 2);
  g.fill();
  // 分身
  const c = me.clone;
  if (c.alpha > 0.01 && c.lane >= 0) {
    const pose = c.attack > 0 ? c.pose : 'idle';
    drawPerson(g, character, pose, c.x, feet, h, { alpha: c.alpha, tint: '#7fd8ff', facing: c.x < f.cx ? 1 : -1 });
    if (c.attack > 0) c.attack--;
    else c.alpha *= 0.86;
  }
  let pose = 'idle';
  if (v?.down) pose = me.hurt > 0 ? 'hurt' : 'down';
  else if (me.hurt > 0) pose = 'hurt';
  else if (holdLane >= 0) pose = 'special';
  else if (me.attack > 0) pose = me.pose;
  else if (v?.ended && v?.killed) pose = 'win';
  const blink = me.hurt > 0 && Math.floor(frame / 3) % 2 === 0;
  if (!blink) drawPerson(g, character, pose, me.x, feet, h, { facing: me.x < f.cx ? 1 : -1 });
  if (me.attack > 0) me.attack--;
  if (me.hurt > 0) me.hurt--;
}

/** 別人（並排的對手）：只知道每秒 15 次的進度，用「連擊變多 = 打中、變 0 = Miss」來演 */
function trackOther(p, f) {
  let o = others.get(p.seat);
  if (!o) {
    o = { combo: 0, x: f ? f.cx : 0, attack: 0, hurt: 0, flash: 0, lane: 2, pose: 'idle', n: 0, j: '', jLife: 0 };
    others.set(p.seat, o);
  }
  const combo = p.p.combo ?? 0;
  if (combo > o.combo) {
    o.attack = 10;
    o.flash = 10;
    o.pose = ATTACKS[o.n++ % ATTACKS.length];
    if (p.p.lane != null) o.lane = p.p.lane;
    o.j = p.p.j || 'P';
    o.jLife = 24;
  } else if (combo < o.combo || (combo === 0 && p.p.j === 'M' && o.j !== 'M')) {
    o.hurt = 14;
    o.j = 'M';
    o.jLife = 24;
  }
  o.combo = combo;
  if (o.attack > 0) o.attack--;
  if (o.hurt > 0) o.hurt--;
  if (o.flash > 0) o.flash--;
  if (o.jLife > 0) o.jLife--;
  return o;
}

// ---------- HUD ----------

function bar(g, x, y, w, h, k, color, back = 'rgba(255,255,255,0.15)') {
  g.fillStyle = back;
  g.fillRect(x, y, w, h);
  g.fillStyle = color;
  g.fillRect(x, y, w * Math.max(0, Math.min(1, k)), h);
}

/** 方形頭像（概念圖是方的，有一條細邊） */
function portrait(g, character, mood, x, y, size, ring = null) {
  const c = getCharacter(character);
  const img = loadImage(c.portraits[mood] ?? c.portraits.normal);
  g.save();
  g.fillStyle = '#dfe8ff';
  g.fillRect(x, y, size, size);
  g.beginPath();
  g.rect(x, y, size, size);
  g.clip();
  if (ready(img)) {
    // 半身像是正方形的（臉在上半部）：整張縮進框裡，稍微放大一點、往上對齊，臉不會被切掉
    const s = (size / Math.min(img.naturalWidth, img.naturalHeight)) * 1.08;
    g.drawImage(img, x + size / 2 - (img.naturalWidth * s) / 2, y - size * 0.02, img.naturalWidth * s, img.naturalHeight * s);
  }
  g.restore();
  if (ring) {
    g.strokeStyle = ring;
    g.lineWidth = 1.5;
    g.strokeRect(x, y, size, size);
  }
}

const pad7 = (n) => String(n ?? 0).padStart(7, '0');
const moodOf = (q, hurt) => (q?.down ? 'sad' : q?.killed ? 'win' : hurt > 0 ? 'surprised' : 'normal');

/** 打得準不準（RATE）：Perfect 100%、Great 70%、Good 30% 的平均 */
function rateOf(q) {
  const c = q.counts ?? [0, 0, 0, 0];
  const n = c[0] + c[1] + c[2] + c[3];
  return n ? ((c[0] + c[1] * 0.7 + c[2] * 0.3) / n) * 100 : 100;
}

/** 單機左邊：方形頭像、名字、等級、PLAYER HP */
function drawSoloInfo(g, info, v) {
  const c = getCharacter(info.character);
  portrait(g, info.character, moodOf(v, me.hurt), 24, 196, 64, 'rgba(255,255,255,0.6)');
  text(g, c.name, 98, 214, 20, '#fff', 'left', 900, false);
  text(g, `Lv.${info.lv}`, 98, 240, 16, '#cfe0ff');
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillRect(24, 272, 230, 1);
  const hp = v ? v.hp / v.hp_max : 1;
  text(g, 'PLAYER HP', 24, 290, 13, '#fff');
  slant(g, 24, 302, 180, 9, hp, hp > 0.3 ? '#2fc6ff' : '#ff3b55');
  text(g, `${Math.round(hp * 100)}%`, 214, 306, 13, '#fff');
  text(g, `ATK ${atkOfLevel(info.lv)}  ${c.specialName}`, 24, 330, 11, 'rgba(207,224,255,0.8)', 'left', 700, false);
  // 左下的直排英文
  g.save();
  g.globalAlpha = 0.35;
  ['VIRTUAL', 'BEAT', 'BATTLE'].forEach((w, i) => text(g, w, 24, 400 + i * 14, 11, '#9cc8ff', 'left', 800));
  g.restore();
}

/** 分數與連擊（單機在右邊；2 人時在各自軌道的左邊） */
function drawScoreCombo(g, x, y, score, combo, { size = 1, judge = null } = {}) {
  text(g, 'SCORE', x, y, 13 * size, 'rgba(255,255,255,0.75)');
  text(g, pad7(score), x, y + 28 * size, 32 * size, '#fff', 'left', 900, false);
  text(g, 'COMBO', x, y + 66 * size, 13 * size, 'rgba(255,255,255,0.75)');
  const k = comboPop > 0 && judge ? 1 + comboPop / 80 : 1;
  const grad = g.createLinearGradient(0, y + 80 * size, 0, y + 120 * size);
  grad.addColorStop(0, '#fff2b0');
  grad.addColorStop(1, '#ffb81c');
  text(g, String(combo ?? 0), x, y + 102 * size, Math.round(46 * size * k), grad, 'left', 900, false);
  if (judge && judge.life > 0) {
    const pop = judge.life > 28 ? 1 + (judge.life - 28) / 20 : 1;
    g.save();
    g.globalAlpha = Math.min(1, judge.life / 10);
    text(g, JUDGE_TEXT[judge.j], x, y + 150 * size, Math.round(30 * size * pop), JUDGE_COLOR[judge.j]);
    if (judge.j !== 'P' && judge.j !== 'M' && Math.abs(judge.off) > 42) text(g, judge.off < 0 ? 'FAST' : 'SLOW', x + 4, y + 176 * size, 13, judge.off < 0 ? '#7fd8ff' : '#ff9a6b');
    g.restore();
  }
}

/** 名牌（2 人、3 人以上）：方形頭像、編號與名字、體力、魔王剩餘（右邊可以放 RANK） */
function drawPlate(g, x, y, w, p, q, { you = false, rank = null, total = 0, hurt = 0 } = {}) {
  const color = SLOT_COLORS[p.seat % SLOT_COLORS.length];
  g.fillStyle = 'rgba(4,12,40,0.78)';
  g.fillRect(x, y, w, 46);
  g.fillStyle = you ? '#1450f5' : color;
  g.fillRect(x, y, 4, 46);
  portrait(g, p.character, moodOf(q, hurt), x + 8, y + 4, 38, 'rgba(255,255,255,0.5)');
  const label = `${String(p.seat + 1).padStart(2, '0')}  ${displayName(p.name)}${you ? ` / ${t('你')}` : ''}`;
  text(g, label, x + 54, y + 14, 15, '#fff');
  if (rank) {
    text(g, 'RANK', x + w - 100, y + 15, 10, 'rgba(255,255,255,0.7)');
    text(g, String(rank).padStart(2, '0'), x + w - 44, y + 14, 20, '#ffd24a', 'right');
    text(g, `/${total}`, x + w - 8, y + 16, 12, '#fff', 'right');
  }
  const bw = (w - 64) / 2;
  const hp = (q.hp ?? 100) / Math.max(1, q.hp_max ?? 100);
  const boss = Math.max(0, 1 - (q.dmg ?? 0) / Math.max(1, q.boss_max ?? 1));
  text(g, t('體力'), x + 54, y + 34, 10, 'rgba(255,255,255,0.8)', 'left', 800, false);
  slant(g, x + 80, y + 30, bw - 60, 7, hp, '#2fc6ff');
  text(g, `${Math.round(hp * 100)}%`, x + 54 + bw - 4, y + 34, 10, '#9fe4ff', 'right', 800);
  text(g, t('魔王剩餘'), x + 60 + bw, y + 34, 10, 'rgba(255,255,255,0.8)', 'left', 800, false);
  slant(g, x + 108 + bw, y + 30, bw - 84, 7, boss, '#ff3b55');
  text(g, q.killed ? 'BREAK' : `${Math.round(boss * 100)}%`, x + w - 6, y + 34, 10, q.killed ? '#ffd84a' : '#ffb0bc', 'right', 800);
}

/** 別人正在按的軌道：回報的按鍵位元＋剛打中的那一條閃一下 */
function keysOf(p, o) {
  const keys = p.p?.keys ?? 0;
  return Array.from({ length: LANES }, (_, i) => !!(keys & (1 << i)) || (o.flash > 4 && p.p?.lane === i));
}

/** 縮小的軌道：用一般大小的座標畫，再整個縮小放進 (x, y, w, h) 的框裡（對方的按鍵會亮、漏掉的音符繼續往下掉） */
function drawTinyField(g, p, o, x, y, w, h, chart, ms, fall) {
  if (!chart || h < 12) return;
  const k = w / (58 * LANES);
  const f = field((58 * LANES) / 2, 58, { top: 20, judge: h / k - 14 });
  g.save();
  g.beginPath();
  g.rect(x, y, w, h);
  g.clip();
  g.translate(x, y);
  g.scale(k, k);
  drawField(g, f, chart, '', ms, fall, { me: false, held: keysOf(p, o), ghost: new Set(p.p?.miss ?? []) });
  g.restore();
}

/**
 * 3 人以上時別人的一列（概念圖 02 的右下）：編號、頭像、名字｜小軌道｜分數、連擊｜準確率條、魔王剩餘條。
 * 斷線、棄權的那一列變灰。
 */
function drawRow(g, p, x, y, w, h, chart, ms, fall) {
  const o = trackOther(p, null);
  const q = p.p ?? {};
  const color = SLOT_COLORS[p.seat % SLOT_COLORS.length];
  g.save();
  g.fillStyle = o.flash > 0 ? 'rgba(30,70,170,0.85)' : 'rgba(4,12,40,0.8)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = 'rgba(90,150,255,0.45)';
  g.lineWidth = 1;
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  g.fillStyle = color;
  g.fillRect(x, y, 3, h);
  const ps = Math.min(h - 18, 36);
  text(g, String(p.seat + 1).padStart(2, '0'), x + 8, y + 11, 13, '#fff');
  portrait(g, p.character, moodOf(q, o.hurt), x + 30, y + 4, ps, null);
  text(g, displayName(p.name).slice(0, 5), x + 8, y + h - 8, 11, '#fff', 'left', 800, false);
  if (q.out) {
    g.fillStyle = 'rgba(40,46,70,0.9)';
    g.fillRect(x + 34 + ps, y + 2, w - 36 - ps, h - 4);
    text(g, t('斷線・本曲棄權'), x + 34 + ps + (w - 36 - ps) / 2, y + h / 2, 13, '#aab4cc', 'center', 800);
    g.restore();
    return;
  }
  const tx = x + 36 + ps;
  const tw = Math.min(64, w * 0.28);
  drawTinyField(g, p, o, tx, y + 3, tw, h - 6, chart, ms, fall);
  const sx = tx + tw + 8;
  text(g, pad7(q.score), w + x - 8, y + 18, 16, '#fff', 'right', 900, false);
  text(g, String(q.combo ?? 0), w + x - 8, y + h - 18, 14, '#ffd24a', 'right', 900, false);
  const bw = Math.max(20, w + x - 8 - sx - 50);
  const rate = rateOf(q);
  slant(g, sx, y + h - 20, bw, 5, rate / 100, '#2fc6ff');
  text(g, `${Math.round(rate)}%`, sx + bw + 4, y + h - 18, 9, '#9fe4ff', 'left', 800);
  slant(g, sx, y + h - 10, bw, 5, 1 - (q.dmg ?? 0) / Math.max(1, q.boss_max ?? 1), '#ff3b55');
  if (o.jLife > 0) text(g, JUDGE_TEXT[o.j] ?? '', sx, y + 12, 10, JUDGE_COLOR[o.j] ?? '#fff');
  g.restore();
}

/** 大家的一列一列：6 人以內一欄，7 人以上兩欄（依分數排名，第一名在最上面） */
function drawRows(g, players, x, y, w, h, chart, ms, fall) {
  const n = players.length;
  if (!n) return;
  const cols = n > 6 ? 2 : 1;
  const rows = Math.ceil(n / cols);
  const gap = 5;
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = Math.min(70, (h - gap * (rows - 1)) / rows);
  const order = [...players].sort((a, b) => (b.p?.score ?? 0) - (a.p?.score ?? 0));
  order.forEach((p, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    drawRow(g, p, x + col * (cw + gap), y + row * (ch + gap), cw, ch, chart, ms, fall);
  });
}

/** 並排的對手：用同一份譜面畫音符（回報裡漏掉的音符會繼續往下掉、變灰），按鍵照回報亮，角色照連擊演 */
function drawRival(g, f, p, chart, ms, fall) {
  const o = trackOther(p, f);
  const q = p.p ?? {};
  drawField(g, f, chart, '', ms, fall, { me: false, held: keysOf(p, o), ghost: new Set(q.miss ?? []) });
  const h = CELL_H * (f.laneW / 58) * 1.05;
  const feet = Math.min(H - 6, f.judge + h * 0.82);
  o.x += (laneX(f, o.lane) - o.x) * 0.3;
  const pose = q.down ? 'down' : o.hurt > 0 ? 'hurt' : o.attack > 0 ? o.pose : 'idle';
  drawPerson(g, p.character, pose, o.x, feet, h, { facing: o.x < f.cx ? 1 : -1 });
  return o;
}

/** 上方的曲名列：曲名 / 難度 / 6 KEY，右邊淡淡的大字（DUEL） */
function drawHeader(g, title, level, mark = '') {
  text(g, title, 24, 26, 20, '#fff');
  text(g, `/  ${(level ?? '').toUpperCase()}  /  6 KEY`, 24 + g.measureText(title).width + 14, 28, 14, '#cfe0ff');
  if (mark) {
    g.save();
    g.font = `italic 900 64px ${FONT}`;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.strokeStyle = 'rgba(120,170,255,0.3)';
    g.lineWidth = 1.5;
    g.strokeText(mark, W - 70, 36);
    g.restore();
  }
}

/** 底部角落的等化器（跟著拍子跳） */
function drawEq(g, x, y, ms, bpm, flip = false) {
  const beat = bpm ? (Math.max(0, ms) / (60000 / bpm)) % 1 : 0.5;
  g.save();
  g.fillStyle = 'rgba(47,140,255,0.55)';
  for (let i = 0; i < 9; i++) {
    const h = 12 + Math.abs(Math.sin(i * 1.7 + frame * 0.05)) * 40 * (1 - beat * 0.6);
    const bx = flip ? x - i * 7 : x + i * 7;
    g.fillRect(bx, y - h, 4, h);
  }
  g.restore();
}

// ---------- 特效的推進與繪製 ----------

function drawEffects(g) {
  for (const s of streaks) {
    const k = s.life / s.max;
    const p = 1 - k;
    const x = s.x0 + (s.x1 - s.x0) * Math.min(1, p * 1.6);
    const y = s.y0 + (s.y1 - s.y0) * Math.min(1, p * 1.6);
    g.strokeStyle = s.color;
    g.globalAlpha = k;
    g.lineWidth = s.w;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(s.x0 + (x - s.x0) * 0.5, s.y0 + (y - s.y0) * 0.5);
    g.lineTo(x, y);
    g.stroke();
    s.life--;
  }
  g.globalAlpha = 1;
  for (const e of effects) {
    const img = art(e.key);
    const k = e.life / e.max;
    if (ready(img)) {
      const w = e.w * (1 + (1 - k) * e.grow);
      const h = (w * img.naturalHeight) / img.naturalWidth;
      g.save();
      g.globalAlpha = k * e.alpha;
      g.translate(e.x, e.y);
      g.rotate(e.rot);
      g.drawImage(img, -w / 2, -h / 2, w, h);
      g.restore();
    }
    e.life--;
  }
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    g.globalAlpha = p.life / p.max;
    g.fillStyle = p.color;
    g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    p.life--;
  }
  g.globalAlpha = 1;
  for (const f of floaters) {
    g.globalAlpha = Math.min(1, f.life / 15);
    outlinedText(g, f.text, f.x, f.y - (44 - f.life) * 0.9, f.size, f.color);
    f.life--;
  }
  g.globalAlpha = 1;
  for (const b of banners) {
    const k = b.life / b.max;
    const inK = Math.min(1, (b.max - b.life) / 12);
    g.save();
    g.globalAlpha = Math.min(1, b.life / 20);
    if (b.small) {
      // 小提示：魔王血條底下一條窄窄的帶子，左右兩邊淡掉
      const y = 74;
      const sb = g.createLinearGradient(W / 2 - 220, 0, W / 2 + 220, 0);
      sb.addColorStop(0, 'rgba(10,40,140,0)');
      sb.addColorStop(0.5, 'rgba(10,40,140,0.7)');
      sb.addColorStop(1, 'rgba(10,40,140,0)');
      g.fillStyle = sb;
      g.fillRect(W / 2 - 220, y - 18, 440, b.sub ? 50 : 36);
      outlinedText(g, b.text, W / 2 + (1 - inK) * 80, y, 26, b.color);
      if (b.sub) outlinedText(g, b.sub, W / 2, y + 22, 11, pal.cream);
      g.restore();
      b.life--;
      continue;
    }
    const bg = g.createLinearGradient(0, 0, W, 0);
    bg.addColorStop(0, 'rgba(20,80,245,0)');
    bg.addColorStop(0.5, 'rgba(10,40,140,0.75)');
    bg.addColorStop(1, 'rgba(20,80,245,0)');
    g.fillStyle = bg;
    g.fillRect(0, H / 2 - 52, W, 104);
    outlinedText(g, b.text, W / 2 + (1 - inK) * 200, H / 2 - 12, 46, b.color);
    if (b.sub) outlinedText(g, b.sub, W / 2, H / 2 + 30, 17, pal.cream);
    g.restore();
    b.life--;
    void k;
  }
  remove(streaks);
  remove(effects);
  remove(particles);
  remove(floaters);
  remove(banners);
}

function remove(list) {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].life <= 0) list.splice(i, 1);
}

// ---------- 主程式 ----------

let introShown = false;

function drawCountdown(g, f, ms, bossName) {
  if (ms >= 0 || ms < -COUNTDOWN * (1000 / 60) - 200) return;
  const n = Math.ceil(-ms / 1000);
  const k = 1 - ((-ms / 1000) % 1);
  if (!introShown) {
    introShown = true;
    banner(bossName, t('出現了！把音符打回去！'), 90, '#ff8f9b');
  }
  if (n <= 3 && n >= 1) outlinedText(g, String(n), f ? f.cx : W / 2, (f ? f.top : 120) + 120, Math.round(60 + k * 30), '#ffd84a');
}

/** 開始前：等背景、魔王、角色的圖載好（最多等 ms 毫秒，網路很慢時不要一直卡住） */
export function prepare({ song, character }, ms = 4000) {
  const worldId = WORLDS[trackOf(song).world].id;
  const urls = [asset(backgroundOf(trackOf(song))), asset(`stages/${worldId}-3/mid.webp`)];
  const b = bossOf(trackOf(song), WORLDS);
  const boss = sheetOf(b.kind, b.key);
  if (boss) urls.push(asset(boss.src));
  const me = character && sheetOf('characters', character);
  if (me) urls.push(asset(me.src));
  return Promise.race([Promise.all(urls.map(whenLoaded)), new Promise((resolve) => setTimeout(resolve, ms))]);
}

/**
 * 畫一格。s = { chart, view, statuses, ms, fall, info, race, you, spectate, paused, keys }
 */
export function draw(canvas, s) {
  updatePalette();
  cfg = currentConfig();
  if (SCALE !== cfg.canvasScale || canvas.width !== Math.round(W * cfg.canvasScale)) resize(canvas);
  const g = canvas.getContext('2d');
  // 上一格要是畫到一半出錯，save／clip 會留著：整個重設（反正每格都整張重畫）
  g.reset?.();
  g.imageSmoothingEnabled = !cfg.pixelated;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (!s.paused) frame++;
  const { chart, view: v, statuses, ms, fall, info, race, you, spectate } = s;
  if (!info) return;
  layout = computeLayout(race, you, spectate);
  const tr = trackOf(info.song);
  const world = WORLDS[tr.world];
  const boss = bossOf(tr, WORLDS);
  const bossName = boss.rival ? t(boss.name) + t('（對手）') : t(boss.name);
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;
  if (shake > 0 && !s.paused) shake = Math.max(0, shake - 0.6);
  g.save();
  g.translate(sx, sy);
  drawBackdrop(g, tr, world.id, ms, chart?.bpm ?? 0);

  const players = race?.players ?? [];
  const mine = players.find((p) => p.seat === you);
  const killed = v ? v.killed : players.some((p) => p.p?.killed);
  // 下一顆地雷快來了：魔王舉手
  let mineSoon = false;
  if (chart) {
    for (let i = scanFrom; i < chart.notes.length; i++) {
      const n = chart.notes[i];
      if (n[0] - ms > 700) break;
      if (n[3] === 1 && n[0] > ms) mineSoon = true;
    }
  }
  drawBoss(g, boss, layout.boss, { killed, mineSoon });

  const myP = { score: v?.score, combo: v?.combo, counts: v?.counts, dmg: v?.dmg, boss_max: v?.boss_max, hp: v?.hp, hp_max: v?.hp_max, down: v?.down, killed: v?.killed };
  if (layout.mode === 'spectate') {
    const watching = t('觀戰中');
    drawHeader(g, `${watching}  ${t(tr.title)}`, info.level);
    drawRows(g, players, 24, 56, W - 48, H - 72, chart, ms, fall);
    drawCountdown(g, null, ms, bossName);
  } else {
    const f = layout.main;
    if (layout.mode === 'solo') {
      drawBossBar(g, 300, 34, 360, v?.dmg ?? 0, v?.boss_max ?? 1, { name: bossName });
      drawField(g, f, chart, statuses, ms, fall, { keys: s.keys });
      if (info.character) drawMe(g, f, info.character, chart, statuses, ms, v);
      drawSoloInfo(g, info, v);
      drawScoreCombo(g, 690, 200, v?.score, v?.combo, { judge: judgeShow });
      text(g, `${t(tr.title)} / ${(info.level ?? '').toUpperCase()}`, 690, 170, 13, '#cfe0ff');
      drawEq(g, W - 30, H - 6, ms, chart?.bpm, true);
      drawEq(g, 24, H - 6, ms, chart?.bpm);
      if (info.demo) text(g, t('示範中（電腦）'), f.cx, 64, 14, '#ffd84a', 'center');
    } else if (layout.mode === 'duo') {
      drawHeader(g, t(tr.title), info.level, 'DUEL');
      // 自己（左半邊）
      const meP = { seat: you ?? 0, name: mine?.name ?? '', character: info.character };
      drawPlate(g, 16, 56, 448, meP, myP, { you: true, hurt: me.hurt });
      drawField(g, f, chart, statuses, ms, fall, { keys: s.keys });
      if (info.character) drawMe(g, f, info.character, chart, statuses, ms, v);
      drawScoreCombo(g, 22, 130, v?.score, v?.combo, { size: 0.78, judge: judgeShow });
      // 對手（右半邊）
      const rival = players.find((p) => p.seat === layout.rival.seat);
      if (rival) {
        const rf = layout.rival.f;
        const o = drawRival(g, rf, rival, chart, ms, fall);
        const q = rival.p ?? {};
        drawPlate(g, 496, 56, 448, rival, q, { hurt: o.hurt });
        drawScoreCombo(g, 502, 130, q.score, q.combo, { size: 0.78, judge: o.jLife > 0 ? { j: o.j, off: 0, life: o.jLife } : null });
      }
      drawEq(g, 20, H - 6, ms, chart?.bpm);
      drawEq(g, W - 20, H - 6, ms, chart?.bpm, true);
    } else {
      // 3 人以上：左邊自己的名牌與軌道，右邊大家一列一列
      text(g, t('多人演奏'), 22, 26, 22, '#fff');
      text(g, `${players.length} PLAYERS`, 24, 46, 10, '#cfe0ff', 'left', 800);
      text(g, `${t(tr.title)}  /  ${(info.level ?? '').toUpperCase()}  /  6 KEY`, 150, 28, 13, '#cfe0ff');
      const order = [...players].sort((a, b) => (b.p?.score ?? 0) - (a.p?.score ?? 0));
      const rank = Math.max(1, order.findIndex((p) => p.seat === you) + 1);
      const meP = { seat: you ?? 0, name: mine?.name ?? '', character: info.character };
      drawPlate(g, 16, 56, 440, meP, myP, { you: true, rank, total: players.length, hurt: me.hurt });
      drawField(g, f, chart, statuses, ms, fall, { keys: s.keys });
      if (info.character) drawMe(g, f, info.character, chart, statuses, ms, v);
      // 自己的連擊與判定放在軌道中間
      if (judgeShow && judgeShow.life > 0) text(g, JUDGE_TEXT[judgeShow.j], f.cx, f.judge - 70, 26, JUDGE_COLOR[judgeShow.j], 'center');
      // 自己的分數與連擊：軌道左邊的空位
      text(g, 'SCORE', 14, 128, 10, 'rgba(255,255,255,0.7)');
      text(g, pad7(v?.score), 14, 146, 14, '#fff', 'left', 900, false);
      text(g, 'COMBO', 14, 176, 10, 'rgba(255,255,255,0.7)');
      text(g, String(v?.combo ?? 0), 14, 200, 26, '#ffd24a', 'left', 900, false);
      const rest = players.filter((p) => p.seat !== you);
      drawRows(g, rest, 472, 56, W - 488, H - 66, chart, ms, fall);
      drawEq(g, 20, H - 6, ms, chart?.bpm);
    }
    drawCountdown(g, f, ms, bossName);
  }
  drawEffects(g);
  g.restore();

  if (!s.paused) {
    for (let i = 0; i < LANES; i++) if (pressed[i] > 0) pressed[i]--;
    if (judgeShow) judgeShow.life--;
    if (bossHurt > 0) bossHurt--;
    if (bossSlam > 0) bossSlam--;
    if (comboPop > 0) comboPop--;
  }
}

export function resize(canvas) {
  cfg = currentConfig();
  SCALE = cfg.canvasScale ?? 2;
  canvas.width = Math.round(W * SCALE);
  canvas.height = Math.round(H * SCALE);
}
