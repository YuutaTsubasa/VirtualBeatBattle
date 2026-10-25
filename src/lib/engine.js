// 遊戲主迴圈：音樂的時鐘就是遊戲的時鐘。
//   曲子用 Web Audio 排程播放（AudioContext 的時間），判定也用同一個時鐘換算成「曲子的第幾毫秒」，
//   所以畫面掉格、分頁卡一下都不會讓判定跑掉。按鍵用事件本身的時間（不是下一個影格才算）。
//   判定、傷害在 Rust（crates/beat-core 的 play.rs），網頁裡是 WebAssembly（crates/beat-wasm 的 LocalPlay）。
//
//   單機：打一首曲子（或交給電腦示範）
//   連線：自己的曲子一樣在自己的電腦上判定，倒數照房主的時間對齊；每 1/15 秒把進度回報給房主，
//         別人的進度跟著房主的比賽影格送來，畫面把它畫成並排（2 人）或旁邊的小畫面（3～12 人）
// 跟 Svelte 無關，UI 透過回傳的方法控制它。

import init, { LocalPlay } from './local/pkg/beat_wasm.js';
import * as input from './game/input.js';
import * as render from './game/render.js';
import { play } from './game/audio.js';
import { COUNTDOWN } from './game/constants.js';
import { trackOf, songOf, repeatOf } from './game/tracks.js';
import { options, fallMs } from './game/options.svelte.js';
import { onFrame, sendProgress } from './net.svelte.js';
import { audioContext } from './audio/synth.js';
import { Player } from './audio/music.js';
import { ui } from './ui.svelte.js';

// 打完後先停一下才跳結果（毫秒）
const END_DELAY = 1800;
// 連線時多久回報一次進度（毫秒）
const REPORT_MS = 66;
// 開始前的倒數（秒）
const LEAD = COUNTDOWN / 60;

// 判定事件 → 音效（src/lib/audio/sound.svelte.js 的 sfx）
const EVENT_SOUND = {
  mine: 'hurt',
  hurt: 'punch',
  parry: 'shield',
  heal: 'pickup',
  bossdown: 'bossdown',
  down: 'fall',
};

const wasmReady = init();

// 音樂的時鐘（秒）：開始一首時 AudioContext 在跑就用它（暫停時 suspend，時間也跟著停），
// 沒有聲音的環境就用 performance.now
let useAudioClock = false;
function clock() {
  const ctx = audioContext();
  return useAudioClock && ctx ? ctx.currentTime : performance.now() / 1000;
}
function pickClock() {
  const ctx = audioContext();
  useAudioClock = !!ctx && ctx.state === 'running';
}

/**
 * onEnd(view, chart)：單機打完；連線的結果看房主送來的名次
 * onEvent(event, view)：每個判定事件（台詞、畫面用）
 */
export function createEngine(canvas, { onEnd = () => {}, onEvent = () => {} }) {
  render.resize(canvas);

  // idle：在選單；local：單機；paused；online：連線比賽；spectate：連線觀戰
  let state = 'idle';
  let lp = null; // LocalPlay
  let chart = null; // 譜面
  let view = null; // 自己這一格的狀態
  let statuses = '';
  let info = null; // { song, level, character, lv, demo }
  let race = null; // 連線：房主送來的比賽影格
  let you = null;
  let start = 0; // 曲子 0 毫秒對應的時鐘時間
  let player = null; // 這一首的音樂
  let musicOn = false;
  let doneAt = 0;
  let ended = false;
  let lastReport = 0;
  let lastCount = 99;
  let pausedAt = 0;
  let ready = false;
  wasmReady.then(() => (ready = true));

  /** 現在是曲子的第幾毫秒（扣掉裝置的輸出延遲與個人的校正：校正 +100 = 聲音晚 100ms 才聽到） */
  function songMs() {
    const ctx = audioContext();
    const latency = useAudioClock && ctx ? ctx.outputLatency || ctx.baseLatency || 0 : 0;
    return (clock() - start - latency) * 1000 - options.offset;
  }
  /** 按鍵事件的那一刻是曲子的第幾毫秒 */
  const msAt = (timeStamp) => songMs() - Math.max(0, performance.now() - timeStamp);

  const playing = () => state === 'local' || state === 'online';

  const stopInput = input.listen((lane, down, timeStamp) => {
    if (!lp || !playing() || info?.demo) return;
    const ms = Math.round(msAt(timeStamp));
    if (down) {
      lp.press(lane, ms);
      play('tap');
    } else lp.release(lane, ms);
    render.lanePress(lane, down);
  });

  // 觸控／滑鼠：手指落在哪一條軌道就按哪一條（可以多指）
  const pointers = new Map();
  function toStage(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 960, y: ((e.clientY - r.top) / r.height) * 540 };
  }
  function onPointerDown(e) {
    if (!lp || !playing()) return;
    const { x, y } = toStage(e);
    const lane = render.laneAt(x, y);
    if (lane == null) return;
    e.preventDefault();
    pointers.set(e.pointerId, lane);
    input.pointer(lane, e.pointerId, true, e.timeStamp);
  }
  function onPointerUp(e) {
    const lane = pointers.get(e.pointerId);
    if (lane == null) return;
    pointers.delete(e.pointerId);
    input.pointer(lane, e.pointerId, false, e.timeStamp);
  }
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  const offFrame = onFrame((s) => {
    if (state !== 'online' && state !== 'spectate') return;
    race = s;
    // 倒數中：跟房主的時間對齊（分頁卡了一下、或比較晚收到開始的訊息，都不會比別人晚開始）
    if (!musicOn) {
      const want = clock() + (COUNTDOWN - s.t) / 60;
      if (Math.abs(want - start) > 0.05) start = want;
    }
  });

  function startMusic() {
    if (musicOn || !info) return;
    const tr = trackOf(info.song);
    player = new Player();
    const ctx = audioContext();
    // 時鐘是 AudioContext 才排程音樂（不出聲的環境照樣可以玩）
    if (useAudioClock && ctx) player.play(songOf(tr), { at: Math.max(start, ctx.currentTime + 0.02), repeat: repeatOf(tr) });
    musicOn = true;
  }

  function handle(v) {
    for (const e of v.events) {
      if (EVENT_SOUND[e.type]) play(EVENT_SOUND[e.type]);
      onEvent(e, v);
    }
    render.handleEvents(v.events, v);
  }

  function frame() {
    input.pollPads();
    if (!ready || state === 'idle' || state === 'paused') return;
    // 倒數快結束時才排程音樂（之前都還可能跟房主對時）
    if (!musicOn && clock() >= start - 0.4) startMusic();
    const ms = songMs();
    // 倒數 3、2、1
    const count = Math.ceil(-ms / 1000);
    if (count !== lastCount && count >= 0 && count <= 3) play(count === 0 ? 'go' : 'count');
    lastCount = count;
    if (lp && playing()) {
      lp.update(Math.round(ms));
      view = JSON.parse(lp.state());
      statuses = lp.statuses();
      handle(view);
      const now = performance.now();
      if (state === 'online' && now - lastReport >= REPORT_MS) {
        lastReport = now;
        sendProgress(lp.progress());
      }
      if (lp.done() && !ended) {
        if (!doneAt) {
          doneAt = now;
          if (state === 'online') sendProgress(lp.progress());
        }
        if (now - doneAt >= END_DELAY) {
          ended = true;
          if (state === 'local') onEnd(view, chart);
        }
      }
    }
  }

  let raf = 0;
  function loop() {
    // 先排下一格：畫面哪裡出錯也不會讓整個遊戲停住
    raf = requestAnimationFrame(loop);
    frame();
    if (state !== 'idle') {
      render.draw(canvas, {
        chart,
        view,
        statuses,
        ms: songMs(),
        fall: fallMs(),
        info,
        race,
        you,
        spectate: state === 'spectate',
        paused: state === 'paused',
        keys: ui.input === 'key' || ui.input === 'pointer' ? 'key' : ui.input === 'pad' ? 'pad' : null,
      });
    }
  }
  raf = requestAnimationFrame(loop);

  function stopMusic() {
    player?.stop(0.3);
    player = null;
    musicOn = false;
  }

  function begin(newInfo, newState, startIn) {
    stopMusic();
    lp?.free();
    lp = null;
    info = newInfo;
    chart = null;
    view = null;
    statuses = '';
    doneAt = 0;
    ended = false;
    lastCount = 99;
    input.releaseAll();
    render.reset();
    if (newState === 'spectate') {
      // 觀戰：沒有自己的判定，只拿譜面畫大家的迷你畫面
      const tmp = new LocalPlay(info.song, info.level, 'xiaocui', 1);
      chart = JSON.parse(tmp.chart());
      tmp.free();
    } else {
      lp = new LocalPlay(info.song, info.level, info.character, info.lv);
      if (info.demo) lp.setAi('hard');
      chart = JSON.parse(lp.chart());
      view = JSON.parse(lp.state());
      statuses = lp.statuses();
    }
    pickClock();
    start = clock() + startIn;
    state = newState;
  }

  return {
    /** 單機：song、level、character、lv（角色等級）；demo = 交給電腦打 */
    async startLocal({ song, level, character, lv, demo = false }) {
      await wasmReady;
      race = null;
      you = null;
      await render.prepare({ song, character });
      begin({ song, level, character, lv, demo }, 'local', LEAD);
    },
    /** 連線比賽：倒數照房主的時間對齊 */
    async startOnline({ song, level, character, lv, seat, t }) {
      await wasmReady;
      you = seat;
      await render.prepare({ song, character }, 1500);
      begin({ song, level, character, lv, demo: false }, 'online', Math.max(0.05, (COUNTDOWN - t) / 60));
    },
    /** 連線觀戰（沒有座位、或開始後才進來）：聽同一首曲子、看大家的進度 */
    async spectate({ song, level, t }) {
      await wasmReady;
      you = null;
      await render.prepare({ song }, 1500);
      begin({ song, level, character: null, lv: 1, demo: false }, 'spectate', (COUNTDOWN - t) / 60);
    },
    pause() {
      if (state !== 'local') return;
      state = 'paused';
      input.releaseAll();
      pausedAt = clock();
      if (useAudioClock) audioContext().suspend();
    },
    resume() {
      if (state !== 'paused') return;
      // AudioContext 暫停時時間也停了；用 performance.now 當時鐘的話，把暫停的時間補回去
      if (useAudioClock) audioContext().resume();
      else start += clock() - pausedAt;
      state = 'local';
    },
    // 回到選單：停掉遊戲（不再出聲）
    stop() {
      if (state === 'paused' && useAudioClock) audioContext().resume();
      stopMusic();
      lp?.free();
      lp = null;
      chart = null;
      view = null;
      race = null;
      input.releaseAll();
      render.reset();
      state = 'idle';
    },
    destroy() {
      cancelAnimationFrame(raf);
      offFrame();
      stopInput();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    },
    get view() {
      return view;
    },
    get state() {
      return state;
    },
    get songMs() {
      return songMs();
    },
  };
}
