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
import { audioContext, buses } from './audio/synth.js';
import { Player } from './audio/music.js';
import { createKeys, keySlices } from './audio/keysound.js';
import { holdAudio } from './audio/sound.svelte.js';
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

// ───── 音檔的曲子（Suno 之類）：先下載、解碼好再開始 ─────
const audioBuffers = new Map(); // 網址 → Promise<AudioBuffer | null>

/** 下載＋解碼一個音檔（載不到就是 null） */
function loadAudio(path) {
  const ctx = audioContext();
  if (!ctx) return Promise.resolve(null);
  const url = import.meta.env.BASE_URL + path;
  if (!audioBuffers.has(url)) {
    audioBuffers.set(
      url,
      fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status))))
        .then((data) => ctx.decodeAudioData(data))
        .catch(() => {
          audioBuffers.delete(url);
          return null;
        }),
    );
  }
  return audioBuffers.get(url);
}

/**
 * 這一首是音檔的話先載好（載不到就算了：照樣可以玩，只是沒聲音）。回傳 { music, keys }。
 * 自己打、而且有琴鍵音：music 是拿掉旋律的伴奏、keys 是旋律；觀戰（keys = false）聽完整的原曲
 */
async function loadTrackAudio(songId, keys = true) {
  const tr = trackOf(songId);
  if (!tr.audio) return { music: null, keys: null };
  if (keys && tr.keys) {
    const [music, sound] = await Promise.all([loadAudio(tr.keys.bgm), loadAudio(tr.keys.sound)]);
    if (music && sound) return { music, keys: sound };
  }
  return { music: await loadAudio(tr.audio), keys: null };
}

/** 播音檔：音檔的 offset 秒是第 1 拍，對齊到時鐘的 beatAt（曲子的 0 毫秒）。回傳 { stop(fade) }，介面跟 Player 一樣 */
function playBuffer(buffer, beatAt, offset) {
  const ctx = audioContext();
  const gain = ctx.createGain();
  gain.connect(buses.bgm);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(gain);
  const want = beatAt - offset; // 音檔開頭要在這個時間播
  const now = ctx.currentTime + 0.02;
  if (want >= now) src.start(want);
  else src.start(now, now - want); // 已經晚了：從中間開始，保持對齊
  return {
    stop(fade = 0.4) {
      const t = ctx.currentTime;
      gain.gain.setTargetAtTime(0, t, Math.max(fade, 0.01) / 3);
      src.stop(t + fade + 0.1);
    },
  };
}

/** 開始一首前：暫停時停住的 AudioContext 叫醒（暫停選單按「從頭開始」） */
async function wakeAudio() {
  holdAudio(false);
  const ctx = audioContext();
  // 還沒有使用者操作過的話 resume 可能一直不回來（連線開始是房主的訊息觸發的）：最多等 0.3 秒
  if (ctx?.state === 'suspended') await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 300))]);
}

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
  let keyPlayer = null; // 琴鍵音（音檔曲子打中音符時播旋律）
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
    const { W, H } = render.stageSize(); // 直的畫面是 540×960
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
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
    const ctx = audioContext();
    musicOn = true;
    // 時鐘是 AudioContext 才排程音樂（不出聲的環境照樣可以玩）
    if (!useAudioClock || !ctx) return;
    if (tr.audioSong) {
      // 音檔：開始前已經載好了（loadTrackAudio）
      loadTrackAudio(info.song, state !== 'spectate' && options.keysound).then(({ music, keys }) => {
        if (!music || !musicOn || info?.song !== tr.id) return;
        player = playBuffer(music, start, tr.audioSong.offsetMs / 1000);
        if (keys && chart) keyPlayer = createKeys(keys, keySlices(chart.notes, tr.audioSong));
      });
      return;
    }
    player = new Player();
    player.play(songOf(tr), { at: Math.max(start, ctx.currentTime + 0.02), repeat: repeatOf(tr) });
  }

  // 音檔的第 1 拍不在檔案開頭（前奏）時，要提早開始播
  const leadIn = () => (info ? (trackOf(info.song).audioSong?.offsetMs ?? 0) / 1000 : 0);

  function handle(v) {
    for (const e of v.events) {
      if (EVENT_SOUND[e.type]) play(EVENT_SOUND[e.type]);
      if (e.type === 'judge' && e.j !== 'M' && !e.tail) keyPlayer?.hit(e.i);
      onEvent(e, v);
    }
    render.handleEvents(v.events, v);
  }

  function frame() {
    input.pollPads();
    if (!ready || state === 'idle' || state === 'paused') return;
    // 倒數快結束時才排程音樂（之前都還可能跟房主對時）
    if (!musicOn && clock() >= start - 0.4 - leadIn()) startMusic();
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
    keyPlayer?.stop(0.3);
    keyPlayer = null;
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
      await wakeAudio();
      race = null;
      you = null;
      await Promise.all([render.prepare({ song, character }), loadTrackAudio(song, options.keysound)]);
      // 音檔有前奏（第 1 拍在後面）：倒數拉長，讓前奏完整播完
      const intro = (trackOf(song).audioSong?.offsetMs ?? 0) / 1000;
      begin({ song, level, character, lv, demo }, 'local', Math.max(LEAD, intro + 0.6));
    },
    /** 連線比賽：倒數照房主的時間對齊 */
    async startOnline({ song, level, character, lv, seat, t }) {
      await wasmReady;
      await wakeAudio();
      you = seat;
      await Promise.all([render.prepare({ song, character }, 1500), loadTrackAudio(song, options.keysound)]);
      begin({ song, level, character, lv, demo: false }, 'online', Math.max(0.05, (COUNTDOWN - t) / 60));
    },
    /** 連線觀戰（沒有座位、或開始後才進來）：聽同一首曲子、看大家的進度 */
    async spectate({ song, level, t }) {
      await wasmReady;
      await wakeAudio();
      you = null;
      await Promise.all([render.prepare({ song }, 1500), loadTrackAudio(song, false)]);
      begin({ song, level, character: null, lv: 1, demo: false }, 'spectate', (COUNTDOWN - t) / 60);
    },
    pause() {
      if (state !== 'local') return;
      state = 'paused';
      input.releaseAll();
      pausedAt = clock();
      if (useAudioClock) {
        holdAudio(true);
        audioContext().suspend();
      }
    },
    resume() {
      if (state !== 'paused') return;
      // AudioContext 暫停時時間也停了；用 performance.now 當時鐘的話，把暫停的時間補回去
      holdAudio(false);
      if (useAudioClock) audioContext().resume();
      else start += clock() - pausedAt;
      state = 'local';
    },
    // 回到選單：停掉遊戲（不再出聲）
    stop() {
      holdAudio(false);
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
