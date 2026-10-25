// 畫面：背景、魔王、六條軌道與音符、站在判定線上的角色（同時押時另一邊出現半透明分身）、特效、HUD。只讀取狀態，不改它。
//
// 版面（960×540 的畫面座標）：
//   單機：軌道在正中間，魔王在軌道上方（音符就是魔王丟過來的攻擊），左邊角色資訊、右邊分數
//   連線 2 人：像 DJMAX 一樣左右並排（自己在左），魔王在中間上方、各自一條血條
//   連線 3～12 人：自己的軌道偏左，右邊排一列（7 人以上兩列）小小的對手卡片
//   觀戰：魔王＋所有人的卡片
// 譜面格式見 crates/beat-core/src/play.rs 的 chart_json()，狀態見 view()。
// 角色與魔王的動作圖沿用虛擬跑跑樂（虛擬闖天下的格子），背景沿用六大關的遠景。

import { W, H, LANES, LANE_COLORS, SLOT_COLORS, COUNTDOWN, atkOfLevel } from './constants.js';
import { getCharacter } from './characters.js';
import { WORLDS } from './stages.js';
import { trackOf } from './tracks.js';
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

function banner(text, sub = '', life = 120, color = '#ffd84a') {
  banners.length = 0;
  banners.push({ text, sub, life, max: life, color });
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

function drawPerson(g, character, pose, x, y, h, opts = {}) {
  const sheet = sheetOf('characters', character);
  if (!(sheet && drawFrame(g, sheet, pose, x, y, h, opts.facing ?? 1, opts))) drawFallbackPerson(g, character, x, y, h, opts.alpha ?? 1);
}

// ---------- 版面 ----------

/** 一條（一組六條）軌道：cx 中心、laneW 每條寬、top 音符出現的高度、judge 判定線 */
const field = (cx, laneW, { top = 120, judge = 432 } = {}) => ({ cx, laneW, top, judge, left: cx - (laneW * LANES) / 2, width: laneW * LANES });
const laneX = (f, lane) => f.left + f.laneW * (lane + 0.5);

let layout = { mode: 'solo', main: field(480, 58), rival: null, boss: { x: 480, y: 150, h: 150 } };

function computeLayout(race, you, spectate) {
  if (spectate) return { mode: 'spectate', main: null, rival: null, boss: { x: 480, y: 172, h: 160 } };
  const n = race?.players?.length ?? 1;
  if (!race || n <= 1) return { mode: 'solo', main: field(480, 58), rival: null, boss: { x: 480, y: 150, h: 150 } };
  if (n === 2) {
    const rival = race.players.find((p) => p.seat !== you);
    return { mode: 'duo', main: field(250, 46, { top: 140 }), rival: { f: field(710, 46, { top: 140 }), seat: rival?.seat }, boss: { x: 480, y: 150, h: 140 } };
  }
  return { mode: 'multi', main: field(330, 52), rival: null, boss: { x: 330, y: 150, h: 150 } };
}

/** 觸控：畫面座標 (x, y) 落在自己的哪一條軌道（判定線上方一點到畫面底部都算） */
export function laneAt(x, y) {
  const f = layout.main;
  if (!f || y < f.top + 60) return null;
  const margin = f.laneW * 0.6;
  if (x < f.left - margin || x > f.left + f.width + margin) return null;
  return Math.max(0, Math.min(LANES - 1, Math.floor((x - f.left) / f.laneW)));
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

// 別人（並排的對手、小卡片）：上一次的進度，拿來偵測「剛打中」「剛 Miss」
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
    if (other || (hits.length === 1 && mine.chord && side(mine.lane) !== bodySide)) {
      const e = other ?? mine;
      me.clone.lane = e.lane;
      me.clone.x = laneX(f, e.lane);
      me.clone.alpha = 0.55;
      me.clone.attack = 14;
      me.clone.pose = ATTACKS[attackN % ATTACKS.length];
    }
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
      banner(t('擊破！'), t('魔王倒下了！之後的傷害是 OVERKILL'), 150, '#ffd84a');
      shake = 14;
      burst(b.x, b.y - b.h * 0.4, '#ffd84a', 40, 7, 50, 0.12);
    } else if (e.type === 'down') {
      if (!downShown) banner(t('體力歸零……'), t('戰鬥輸了，曲子打完還是有技術分！'), 140, '#ff6b7a');
      downShown = true;
    } else if (e.type === 'hold') {
      effect('spark', laneX(f, e.lane), f.judge, 48, 10);
    }
  }
}

// ---------- 背景與魔王 ----------

function drawBackdrop(g, worldId, ms, bpm) {
  const far = loadImage(asset(`stages/${worldId}-3/far.webp`));
  const mid = loadImage(asset(`stages/${worldId}-3/mid.webp`));
  g.fillStyle = '#10121c';
  g.fillRect(0, 0, W, H);
  for (const [img, drift] of [
    [far, 0.004],
    [mid, 0.012],
  ]) {
    if (!ready(img)) continue;
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * s;
    const x = -((frame * drift * 60) % Math.max(1, w - W));
    g.drawImage(img, x, (H - img.naturalHeight * s) / 2, w, img.naturalHeight * s);
  }
  // 跟著拍子微微亮一下
  const beat = bpm ? ((Math.max(0, ms) / (60000 / bpm)) % 1) : 0.5;
  g.fillStyle = `rgba(10,10,28,${0.6 - (1 - beat) ** 4 * 0.12})`;
  g.fillRect(0, 0, W, H);
}

function drawBoss(g, worldId, b, { killed = false, mineSoon = false } = {}) {
  const sheet = sheetOf('bosses', worldId);
  let pose = 'idle';
  if (killed) pose = 'down';
  else if (bossSlam > 8) pose = 'slam';
  else if (bossHurt > 0) pose = 'hurt';
  else if (mineSoon) pose = 'windup';
  else if (Math.floor(frame / 30) % 2) pose = 'walk1';
  const sx = bossHurt > 0 ? (Math.random() - 0.5) * 6 : 0;
  const flash = bossHurt > 3 ? 1 : 0;
  g.save();
  // 光暈
  const grad = g.createRadialGradient(b.x, b.y - b.h * 0.4, 10, b.x, b.y - b.h * 0.4, b.h * 0.7);
  grad.addColorStop(0, killed ? 'rgba(255,216,74,0.35)' : 'rgba(255,90,110,0.28)');
  grad.addColorStop(1, 'rgba(255,90,110,0)');
  g.fillStyle = grad;
  g.fillRect(b.x - b.h, b.y - b.h * 1.2, b.h * 2, b.h * 1.5);
  if (!(sheet && drawFrame(g, sheet, pose, b.x + sx, b.y, b.h, -1, { flash, alpha: killed ? 0.6 : 1 }))) {
    g.fillStyle = '#5a3a6a';
    g.beginPath();
    g.arc(b.x, b.y - b.h * 0.4, b.h * 0.3, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** 魔王血條：x、y 左上，w 寬；color 是誰打的（連線時用座位色） */
function drawBossBar(g, x, y, w, dmg, max, { name = '', color = '#ff5a6e', small = false } = {}) {
  const h = small ? 8 : 14;
  const left = Math.max(0, 1 - dmg / Math.max(1, max));
  const over = dmg > max ? (dmg - max) / max : 0;
  if (name) outlinedText(g, name, x, y - (small ? 8 : 12), small ? 12 : 15, pal.cream, 'left');
  g.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(g, x - 2, y - 2, w + 4, h + 4, 4);
  g.fill();
  g.fillStyle = '#3a1520';
  g.fillRect(x, y, w, h);
  const grad = g.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#ff8f9b');
  grad.addColorStop(1, color);
  g.fillStyle = grad;
  g.fillRect(x, y, w * left, h);
  if (left === 0) {
    g.fillStyle = `rgba(255,216,74,${0.6 + Math.sin(frame * 0.2) * 0.3})`;
    g.fillRect(x, y, w * Math.min(1, over), h);
    outlinedText(g, over > 0 ? `OVERKILL +${Math.round(over * 100)}%` : 'BREAK!', x + w, y - (small ? 8 : 12), small ? 11 : 14, '#ffd84a', 'right');
  } else if (!small) {
    outlinedText(g, `${Math.round(left * 100)}%`, x + w, y - 12, 13, pal.cream, 'right');
  }
}

// ---------- 軌道與音符 ----------

let scanFrom = 0;

function drawField(g, f, chart, statuses, ms, fall, { me: isMe = true, held: heldLanes = held, keys = null, ghost = false } = {}) {
  const { left, width, top, judge, laneW } = f;
  // 底板
  g.save();
  const grad = g.createLinearGradient(0, top - 40, 0, judge);
  grad.addColorStop(0, 'rgba(8,10,24,0)');
  grad.addColorStop(0.2, 'rgba(8,10,24,0.72)');
  grad.addColorStop(1, 'rgba(8,10,24,0.86)');
  g.fillStyle = grad;
  g.fillRect(left, top - 40, width, H - top + 40);
  for (let i = 0; i <= LANES; i++) {
    g.fillStyle = i === 3 ? 'rgba(255,216,74,0.55)' : 'rgba(255,255,255,0.12)';
    g.fillRect(left + i * laneW - (i === 3 ? 1 : 0.5), top - 40, i === 3 ? 2 : 1, H - top + 40);
  }
  // 按下的光
  for (let lane = 0; lane < LANES; lane++) {
    const on = heldLanes[lane];
    const k = on ? 1 : pressed[lane] / 10;
    if (!isMe && !on) continue;
    if (k <= 0) continue;
    const x = left + lane * laneW;
    const lg = g.createLinearGradient(0, judge, 0, judge - 220);
    lg.addColorStop(0, `rgba(255,255,255,${0.35 * k})`);
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg;
    g.fillRect(x + 1, judge - 220, laneW - 2, 220);
  }
  // 判定線
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fillRect(left - 4, judge - 2, width + 8, 4);
  g.fillStyle = 'rgba(255,216,74,0.5)';
  g.fillRect(left - 4, judge - 6, width + 8, 2);
  // 音符
  if (chart) drawNotes(g, f, chart, statuses, ms, fall, ghost);
  // 鍵位提示
  if (keys && isMe) {
    const labels = keys === 'pad' ? PAD_LABELS : KEY_LABELS;
    for (let lane = 0; lane < LANES; lane++) outlinedText(g, labels[lane], laneX(f, lane), judge + 16, 13, heldLanes[lane] ? '#ffd84a' : 'rgba(245,239,223,0.7)');
  }
  g.restore();
}

function drawNotes(g, f, chart, statuses, ms, fall, ghost) {
  const { judge, top, laneW } = f;
  const span = judge - top;
  const yOf = (t) => judge - ((t - ms) / fall) * span;
  const notes = chart.notes;
  // 從還沒完全過去的第一顆開始畫（往後找到超出畫面頂端就停）
  while (scanFrom < notes.length && notes[scanFrom][0] + notes[scanFrom][2] < ms - 600) scanFrom++;
  const w = laneW - 8;
  for (let i = Math.max(0, scanFrom - 4); i < notes.length; i++) {
    const [nt, lane, len, kind, chord] = notes[i];
    if (nt - ms > fall * 1.08) break;
    const st = ghost ? (nt + len < ms ? 'P' : '0') : (statuses[i] ?? '0');
    if ('PGDx'.includes(st)) continue;
    const x = laneX(f, lane);
    const missed = st === 'M' || st === 'm';
    let y = yOf(nt);
    if (y > H + 30 && !len) continue;
    g.globalAlpha = missed ? 0.35 : 1;
    if (kind === 1) {
      drawMine(g, x, y, laneW);
      g.globalAlpha = 1;
      continue;
    }
    const color = LANE_COLORS[lane];
    if (len > 0) {
      const holding = st === 'h';
      if (holding) y = judge;
      const yEnd = Math.max(top - 40, yOf(nt + len));
      const bodyGrad = g.createLinearGradient(0, yEnd, 0, y);
      bodyGrad.addColorStop(0, `${color}55`);
      bodyGrad.addColorStop(1, holding ? `${color}dd` : `${color}99`);
      g.fillStyle = bodyGrad;
      g.fillRect(x - w * 0.32, yEnd, w * 0.64, y - yEnd);
      if (holding) {
        g.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(frame * 0.5) * 0.25})`;
        g.fillRect(x - w * 0.32, yEnd, 3, y - yEnd);
        g.fillRect(x + w * 0.32 - 3, yEnd, 3, y - yEnd);
      }
      g.fillStyle = color;
      roundRect(g, x - w * 0.42, yEnd - 4, w * 0.84, 8, 3);
      g.fill();
    }
    if (y < top - 40) continue;
    drawTap(g, x, y, w, color, chord);
    g.globalAlpha = 1;
  }
  g.globalAlpha = 1;
}

function drawTap(g, x, y, w, color, chord) {
  const h = 14;
  if (chord) {
    // 同時押（分身會出現）：金色外框
    g.fillStyle = 'rgba(255,216,74,0.9)';
    roundRect(g, x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, 6);
    g.fill();
  }
  const grad = g.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, color);
  g.fillStyle = grad;
  roundRect(g, x - w / 2, y - h / 2, w, h, 5);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.lineWidth = 1.5;
  g.stroke();
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

function drawPanel(g, x, y, w, h) {
  g.fillStyle = 'rgba(8,10,24,0.72)';
  roundRect(g, x, y, w, h, 10);
  g.fill();
  g.strokeStyle = 'rgba(255,216,74,0.45)';
  g.lineWidth = 1.5;
  g.stroke();
}

function bar(g, x, y, w, h, k, color, back = 'rgba(255,255,255,0.15)') {
  g.fillStyle = back;
  g.fillRect(x, y, w, h);
  g.fillStyle = color;
  g.fillRect(x, y, w * Math.max(0, Math.min(1, k)), h);
}

function portrait(g, character, mood, x, y, size, ring = null) {
  const c = getCharacter(character);
  const img = loadImage(c.portraits[mood] ?? c.portraits.normal);
  g.save();
  g.beginPath();
  g.arc(x, y, size / 2, 0, Math.PI * 2);
  g.fillStyle = '#ffe9a8';
  g.fill();
  g.clip();
  if (ready(img)) {
    const s = size / Math.min(img.naturalWidth, img.naturalHeight * 0.62);
    g.drawImage(img, x - (img.naturalWidth * s) / 2, y - size * 0.42, img.naturalWidth * s, img.naturalHeight * s);
  }
  g.restore();
  if (ring) {
    g.strokeStyle = ring;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(x, y, size / 2, 0, Math.PI * 2);
    g.stroke();
  }
}

const pad7 = (n) => String(n ?? 0).padStart(7, '0');

/** 自己的角色資訊（左邊）：頭像、名字、等級、攻擊、體力、能力 */
function drawMyInfo(g, x, y, w, info, v, compact = false) {
  const c = getCharacter(info.character);
  drawPanel(g, x, y, w, compact ? 120 : 170);
  const mood = v?.down ? 'sad' : v?.killed ? 'win' : me.hurt > 0 ? 'surprised' : 'normal';
  portrait(g, info.character, mood, x + 38, y + 40, 56, c.specialColor);
  outlinedText(g, c.name, x + 74, y + 26, 18, pal.cream, 'left');
  outlinedText(g, `Lv.${info.lv}  ATK ${atkOfLevel(info.lv)}`, x + 74, y + 50, 13, '#ffd84a', 'left');
  const hp = v ? v.hp / v.hp_max : 1;
  outlinedText(g, 'HP', x + 14, y + 86, 13, pal.cream, 'left');
  bar(g, x + 40, y + 80, w - 54, 12, hp, hp > 0.3 ? '#7dff9a' : '#ff5a6e');
  outlinedText(g, `${v?.hp ?? 100}`, x + w - 14, y + 100, 11, pal.cream, 'right');
  if (!compact) {
    outlinedText(g, c.specialName, x + 14, y + 122, 14, c.specialColor, 'left');
    g.font = `700 11px ${FONT}`;
    g.fillStyle = 'rgba(245,239,223,0.85)';
    g.textAlign = 'left';
    wrap(g, c.specialDesc, x + 14, y + 142, w - 28, 14, 2);
  }
}

function wrap(g, text, x, y, w, lh, maxLines) {
  let line = '';
  let n = 0;
  for (const ch of text) {
    if (g.measureText(line + ch).width > w && line) {
      g.fillText(line, x, y + n * lh);
      line = ch;
      if (++n >= maxLines) return;
    } else line += ch;
  }
  if (line) g.fillText(line, x, y + n * lh);
}

/** 分數面板（右邊）：技術分、判定次數、最大連擊 */
function drawScore(g, x, y, w, v, info) {
  drawPanel(g, x, y, w, 200);
  const tr = trackOf(info.song);
  outlinedText(g, t(tr.title), x + 14, y + 22, 16, pal.cream, 'left');
  outlinedText(g, `${(info.level ?? '').toUpperCase()}`, x + w - 14, y + 22, 13, '#ffd84a', 'right');
  outlinedText(g, 'SCORE', x + 14, y + 52, 12, 'rgba(245,239,223,0.7)', 'left');
  outlinedText(g, pad7(v?.score), x + w - 14, y + 56, 26, '#fff', 'right');
  const rows = [
    ['PERFECT', v?.counts?.[0], JUDGE_COLOR.P],
    ['GREAT', v?.counts?.[1], JUDGE_COLOR.G],
    ['GOOD', v?.counts?.[2], JUDGE_COLOR.D],
    ['MISS', v?.counts?.[3], JUDGE_COLOR.M],
  ];
  rows.forEach(([label, n, color], i) => {
    outlinedText(g, label, x + 14, y + 88 + i * 22, 13, color, 'left');
    outlinedText(g, String(n ?? 0), x + w - 14, y + 88 + i * 22, 14, pal.cream, 'right');
  });
  outlinedText(g, 'MAX COMBO', x + 14, y + 182, 12, 'rgba(245,239,223,0.7)', 'left');
  outlinedText(g, String(v?.max_combo ?? 0), x + w - 14, y + 182, 15, pal.cream, 'right');
}

/** 軌道中間的連擊數與判定字 */
function drawCombo(g, f, combo, judge) {
  if (combo >= 3) {
    const k = comboPop > 0 ? 1 + comboPop / 60 : 1;
    g.save();
    g.globalAlpha = 0.85;
    outlinedText(g, String(combo), f.cx, f.top + 170, Math.round(44 * k), '#ffffff');
    outlinedText(g, 'COMBO', f.cx, f.top + 204, 14, '#ffd84a');
    g.restore();
  }
  if (judge && judge.life > 0) {
    const k = Math.min(1, judge.life / 10);
    g.save();
    g.globalAlpha = k;
    const pop = judge.life > 28 ? 1 + (judge.life - 28) / 20 : 1;
    outlinedText(g, JUDGE_TEXT[judge.j], f.cx, f.judge - 70, Math.round(30 * pop), JUDGE_COLOR[judge.j]);
    if (judge.j !== 'P' && judge.j !== 'M' && Math.abs(judge.off) > 42) outlinedText(g, judge.off < 0 ? 'FAST' : 'SLOW', f.cx, f.judge - 46, 13, judge.off < 0 ? '#7fd8ff' : '#ff9a6b');
    g.restore();
  }
}

/** 小卡片（3 人以上時的對手、觀戰）：頭像、名字、分數、連擊、對魔王的傷害、體力 */
function drawCard(g, p, x, y, w, h, place) {
  const o = trackOther(p, null);
  const color = SLOT_COLORS[p.seat % SLOT_COLORS.length];
  const q = p.p ?? {};
  g.save();
  g.fillStyle = o.flash > 0 ? `rgba(255,255,255,${0.12 + o.flash / 60})` : 'rgba(8,10,24,0.75)';
  roundRect(g, x, y, w, h, 8);
  g.fill();
  g.fillStyle = color;
  g.fillRect(x, y + 4, 4, h - 8);
  const ps = Math.min(h - 14, 46);
  const bob = o.attack > 0 ? -3 : 0;
  portrait(g, p.character, q.down ? 'sad' : q.killed ? 'win' : o.hurt > 0 ? 'surprised' : 'normal', x + 10 + ps / 2, y + h / 2 + bob, ps, color);
  const tx = x + 16 + ps;
  const small = w < 200;
  outlinedText(g, `${place}`, x + w - 10, y + 13, 12, '#ffd84a', 'right');
  outlinedText(g, `${p.seat + 1}P ${displayName(p.name)}`.slice(0, small ? 9 : 16), tx, y + 13, small ? 11 : 13, pal.cream, 'left');
  outlinedText(g, pad7(q.score), tx, y + h / 2 + 1, small ? 13 : 16, '#fff', 'left');
  if (!small) outlinedText(g, `${q.combo ?? 0} combo`, x + w - 10, y + h / 2 + 1, 12, 'rgba(245,239,223,0.8)', 'right');
  // 對魔王的傷害、體力
  const bw = w - (tx - x) - 10;
  bar(g, tx, y + h - 13, bw, 4, (q.dmg ?? 0) / Math.max(1, q.boss_max ?? 1), q.killed ? '#ffd84a' : '#ff8f9b');
  bar(g, tx, y + h - 7, bw, 3, (q.hp ?? 100) / Math.max(1, q.hp_max ?? 100), '#7dff9a');
  if (o.jLife > 0) outlinedText(g, JUDGE_TEXT[o.j] ?? '', x + w - 10, y + h - 22, small ? 9 : 11, JUDGE_COLOR[o.j] ?? '#fff', 'right');
  if (q.out) outlinedText(g, t('棄權'), x + w / 2, y + h / 2, 16, '#ff6b7a');
  g.restore();
}

function drawCards(g, players, x, y, w, maxH) {
  if (!players.length) return;
  const cols = players.length > 6 ? 2 : 1;
  const rows = Math.ceil(players.length / cols);
  const gap = 6;
  const cw = (w - gap * (cols - 1)) / cols;
  const ch = Math.min(70, (maxH - gap * (rows - 1)) / rows);
  const order = [...players].sort((a, b) => (b.p?.score ?? 0) - (a.p?.score ?? 0));
  players.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    drawCard(g, p, x + col * (cw + gap), y + row * (ch + gap), cw, ch, order.indexOf(p) + 1);
  });
}

/** 並排的對手：用同一份譜面畫音符（看不到對方實際按的狀況，音符到判定線就消失），角色照連擊演 */
function drawRival(g, f, p, chart, ms, fall, worldId) {
  const o = trackOther(p, f);
  const q = p.p ?? {};
  const heldLanes = new Array(LANES).fill(false);
  if (o.flash > 0 && p.p.lane != null) heldLanes[p.p.lane] = true;
  drawField(g, f, chart, '', ms, fall, { me: false, held: heldLanes, ghost: true });
  const h = CELL_H * (f.laneW / 58) * 1.05;
  const feet = Math.min(H - 6, f.judge + h * 0.82);
  o.x += (laneX(f, o.lane) - o.x) * 0.3;
  const pose = q.down ? 'down' : o.hurt > 0 ? 'hurt' : o.attack > 0 ? o.pose : 'idle';
  drawPerson(g, p.character, pose, o.x, feet, h, { facing: o.x < f.cx ? 1 : -1 });
  if (q.combo >= 3) outlinedText(g, String(q.combo), f.cx, f.top + 170, 40, 'rgba(255,255,255,0.85)');
  if (o.jLife > 0) outlinedText(g, JUDGE_TEXT[o.j] ?? '', f.cx, f.judge - 70, 24, JUDGE_COLOR[o.j] ?? '#fff');
  void worldId;
}

function drawTopBar(g, f, name, score, color, dmg, max, hp, hpMax) {
  const x = f.left;
  const w = f.width;
  drawBossBar(g, x, 24, w, dmg, max, { color });
  outlinedText(g, name, x, 52, 14, color, 'left');
  outlinedText(g, pad7(score), x + w, 52, 18, '#fff', 'right');
  bar(g, x, 62, w, 4, hp / Math.max(1, hpMax), '#7dff9a');
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
    g.fillStyle = 'rgba(0,0,0,0.5)';
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
  const urls = [asset(`stages/${worldId}-3/far.webp`), asset(`stages/${worldId}-3/mid.webp`)];
  const boss = sheetOf('bosses', worldId);
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
  g.imageSmoothingEnabled = !cfg.pixelated;
  g.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (!s.paused) frame++;
  const { chart, view: v, statuses, ms, fall, info, race, you, spectate } = s;
  if (!info) return;
  layout = computeLayout(race, you, spectate);
  const tr = trackOf(info.song);
  const world = WORLDS[tr.world];
  const bossName = t(world.boss.name);
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;
  if (shake > 0 && !s.paused) shake = Math.max(0, shake - 0.6);
  g.save();
  g.translate(sx, sy);
  drawBackdrop(g, world.id, ms, chart?.bpm ?? 0);

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
  drawBoss(g, world.id, layout.boss, { killed, mineSoon });

  if (layout.mode === 'spectate') {
    const watching = t('觀戰中');
    outlinedText(g, `${watching} · ${t(tr.title)}`, W / 2, 26, 20, '#ffd84a');
    drawCards(g, players, 40, 190, W - 80, H - 210);
    drawCountdown(g, null, ms, bossName);
  } else {
    const f = layout.main;
    drawField(g, f, chart, statuses, ms, fall, { keys: s.keys });
    if (info.character) drawMe(g, f, info.character, chart, statuses, ms, v);
    drawCombo(g, f, v?.combo ?? 0, judgeShow);

    if (layout.mode === 'solo') {
      drawBossBar(g, f.left - 60, 24, f.width + 120, v?.dmg ?? 0, v?.boss_max ?? 1, { name: `BOSS ${bossName}` });
      drawMyInfo(g, 24, 170, 236, info, v);
      drawScore(g, W - 260, 170, 236, v, info);
      if (info.demo) outlinedText(g, t('示範中（電腦）'), f.cx, H - 18, 16, '#ffd84a');
    } else if (layout.mode === 'duo') {
      const rival = players.find((p) => p.seat === layout.rival.seat);
      const myColor = SLOT_COLORS[(you ?? 0) % SLOT_COLORS.length];
      drawTopBar(g, f, `${(you ?? 0) + 1}P ${displayName(mine?.name ?? '')}`, v?.score, myColor, v?.dmg ?? 0, v?.boss_max ?? 1, v?.hp ?? 100, v?.hp_max ?? 100);
      if (rival) {
        const rf = layout.rival.f;
        drawRival(g, rf, rival, chart, ms, fall, world.id);
        const q = rival.p ?? {};
        drawTopBar(g, rf, `${rival.seat + 1}P ${displayName(rival.name)}`, q.score, SLOT_COLORS[rival.seat % SLOT_COLORS.length], q.dmg ?? 0, q.boss_max || v?.boss_max || 1, q.hp ?? 100, q.hp_max ?? 100);
      }
      outlinedText(g, `BOSS ${bossName}`, W / 2, 16, 13, '#ff8f9b');
    } else {
      // 3 人以上：左邊自己的資訊、右邊對手的小卡片
      drawBossBar(g, f.left - 20, 24, f.width + 40, v?.dmg ?? 0, v?.boss_max ?? 1, { name: `BOSS ${bossName}` });
      drawMyInfo(g, 10, 170, 150, info, v, true);
      outlinedText(g, 'SCORE', 18, 316, 11, 'rgba(245,239,223,0.7)', 'left');
      outlinedText(g, pad7(v?.score), 18, 336, 20, '#fff', 'left');
      const rest = players.filter((p) => p.seat !== you);
      drawCards(g, rest, 556, 62, W - 572, H - 78);
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
