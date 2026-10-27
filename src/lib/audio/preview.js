// 選曲畫面的試聽：選到哪一首就播那一首（像音樂遊戲的選曲畫面）。
//   音檔曲子（Suno）：用 <audio> 串流（不用整首下載、解碼完），從最熱鬧的一段開始播 PREVIEW_SEC 秒，淡入淡出、一直循環
//   PC-98 曲子：用合成器從頭播（曲子本來就是短的循環）
// 音量走背景音樂的音量（buses.bgm）。換曲子要停 DELAY 秒才真的換，按著方向鍵一路往下時不會一直重新載入。
import { audioContext, buses } from 'virtual-core/audio/synth.js';
import { Player } from './music.js';
import { songOf } from '../game/tracks.js';
import { beatToMs } from '../game/chartgen.js';

const PREVIEW_SEC = 20;
const FADE = 0.6;
const DELAY = 0.35;

let el = null; // <audio>
let gain = null;
const player = new Player();
let timer = 0;
let loopTimer = 0;
let current = null;

/** 音檔曲子最熱鬧的地方（毫秒）：16 拍裡旋律＋大鼓＋小鼓最多的那一段（從 8 拍的整數倍開始找） */
export function previewStartMs(audioSong) {
  if (audioSong.previewMs != null) return audioSong.previewMs;
  const src = audioSong.source;
  const beats = [...src.melody.map((m) => m.beat), ...src.kicks, ...src.snares];
  let best = 0;
  let bestCount = -1;
  for (let from = 0; from + 16 <= src.length; from += 8) {
    const count = beats.filter((b) => b >= from && b < from + 16).length;
    if (count > bestCount) {
      best = from;
      bestCount = count;
    }
  }
  return Math.max(0, beatToMs(src, best) + (audioSong.offsetMs ?? 0));
}

function ensureElement() {
  const ctx = audioContext();
  if (el || !ctx) return !!el;
  el = new Audio();
  el.preload = 'auto';
  gain = ctx.createGain();
  gain.gain.value = 0;
  ctx.createMediaElementSource(el).connect(gain);
  gain.connect(buses.bgm);
  return true;
}

function fadeTo(v, sec) {
  const ctx = audioContext();
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(v, ctx.currentTime + sec);
}

function stopNow(fade = FADE) {
  clearTimeout(loopTimer);
  player.stop(fade);
  if (el && !el.paused) {
    fadeTo(0, fade);
    const which = el.src;
    setTimeout(() => {
      if (el.src === which && gain.gain.value < 0.01) el.pause();
    }, fade * 1000 + 50);
  }
}

function playAudio(track) {
  if (!ensureElement()) return;
  const start = previewStartMs(track.audioSong) / 1000;
  const url = import.meta.env.BASE_URL + track.audio;
  const round = () => {
    if (current !== track) return;
    el.currentTime = start;
    el.play().catch(() => {});
    fadeTo(1, FADE);
    // 播到一段的尾巴：淡出，再從頭
    loopTimer = setTimeout(() => {
      if (current !== track) return;
      fadeTo(0, FADE);
      loopTimer = setTimeout(round, FADE * 1000 + 300);
    }, (PREVIEW_SEC - FADE) * 1000);
  };
  if (!el.src.endsWith(track.audio)) {
    el.src = url;
    el.addEventListener('loadedmetadata', round, { once: true });
    el.load();
  } else round();
}

/** 選到這一首：試聽（同一首不會重播） */
export function previewTrack(track) {
  if (track === current) return;
  current = track;
  clearTimeout(timer);
  stopNow(0.3);
  timer = setTimeout(() => {
    if (current !== track || audioContext()?.state !== 'running') return;
    if (track.audioSong) playAudio(track);
    else {
      // 會循環的曲子 repeat 1 就是一直循環；不循環的就多排幾輪
      const song = songOf(track);
      player.play(song, { repeat: song.loop ? 1 : 99 });
    }
  }, DELAY * 1000);
}

/** 離開選曲畫面 */
export function stopPreview() {
  current = null;
  clearTimeout(timer);
  stopNow();
}
