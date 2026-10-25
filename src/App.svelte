<script>
  import { artStyle } from './lib/art-style.svelte.js';
  import { t } from './lib/i18n.svelte.js';
  import { loading, preloadStyle, preloadStyleWithin } from './lib/preload.svelte.js';
  import { onMount } from 'svelte';
  import { createEngine } from './lib/engine.js';
  import { getCharacter, pickLine, unlockHidden } from './lib/game/characters.js';
  import { savedCharacter, saveCharacter, savedPick, savePick, levelOf, feedXp, recordBest } from './lib/game/progress.js';
  import { trackOf } from './lib/game/tracks.js';
  import { WORLDS } from './lib/game/stages.js';
  import { COUNTDOWN } from './lib/game/constants.js';
  import { toggleMute } from './lib/game/audio.js';
  import { net, hostCmd, leave, onFrame, toast } from './lib/net.svelte.js';
  import Menu from './lib/components/Menu.svelte';
  import Logo from './lib/components/Logo.svelte';
  import Dialog from './lib/components/Dialog.svelte';
  import TitleScreen from './lib/components/TitleScreen.svelte';
  import HelpScreen from './lib/components/HelpScreen.svelte';
  import SettingsDialog from './lib/components/SettingsDialog.svelte';
  import SelectScreen from './lib/components/SelectScreen.svelte';
  import SongSelect from './lib/components/SongSelect.svelte';
  import ResultScreen from './lib/components/ResultScreen.svelte';
  import OnlineResult from './lib/components/OnlineResult.svelte';
  import RoomEntry from './lib/components/RoomEntry.svelte';
  import Lobby from './lib/components/Lobby.svelte';
  import Controls from './lib/components/Controls.svelte';
  import { ui, openSettings } from './lib/ui.svelte.js';
  import { roomCodeOf } from './lib/site.js';
  import { setBgm, playJingle } from './lib/audio/sound.svelte.js';

  // 單機：title | select | songs | play | pause | result | help | host | join（設定是隨時可開的視窗）
  // 連線中（net.room 有值）時畫面由房間狀態決定：大廳或比賽
  // 分享連結（…#join/房號）打開：直接到加入房間、帶入房號
  const linkCode = roomCodeOf(location.hash) ?? '';
  if (linkCode) history.replaceState(null, '', location.pathname + location.search);
  let joinCode = $state(linkCode);
  let screen = $state(linkCode ? 'join' : 'title');
  let character = $state(savedCharacter());
  let pick = $state(savedPick()); // 選曲畫面上次停在哪：{ song, level }
  let playing = $state(null); // 目前（或上一次）的曲子：{ song, level, demo }
  let result = $state(null);
  let onlineMenu = $state(false);
  let canvas;
  let engine = $state();

  // 開遊戲時先把目前風格的圖都載好（最多等 15 秒）；之後換風格就在背景載
  let booting = $state(true);
  let waiting = $state(false);
  const percent = $derived(loading.total ? Math.round((loading.done / loading.total) * 100) : 0);
  preloadStyleWithin(artStyle.id, 15000).then(() => (booting = false));
  $effect(() => {
    if (!booting) preloadStyle(artStyle.id);
  });

  async function ensureArt() {
    let done = false;
    const all = preloadStyle(artStyle.id).then(() => (done = true));
    await Promise.resolve();
    if (done) return;
    waiting = true;
    await Promise.race([all, new Promise((resolve) => setTimeout(resolve, 10000))]);
    waiting = false;
  }

  // 連線：房主送來的比賽狀態（只記會改變畫面的部分，影格本身交給 engine）
  let racePhase = $state(null); // countdown | playing | results
  let raceResults = $state(null);
  let raceSong = $state(null);
  let raceLevel = $state('normal');
  let raceMine = $state(null); // 連線打完自己拿到的經驗值與升級
  let raceSeed = null;

  onMount(() => {
    engine = createEngine(canvas, { onEnd });
    window.__vbb = engine;
    const off = onFrame(onRaceFrame);
    // 單機遊戲中切到背景、或手機轉成直的：自動暫停
    const portrait = matchMedia('(orientation: portrait) and (pointer: coarse)');
    const autoPause = () => {
      if ((document.hidden || portrait.matches) && screen === 'play' && !roomPhase) pause();
    };
    document.addEventListener('visibilitychange', autoPause);
    portrait.addEventListener('change', autoPause);
    const onHash = () => {
      const code = roomCodeOf(location.hash);
      if (!code) return;
      history.replaceState(null, '', location.pathname + location.search);
      if (net.room || net.status !== 'idle' || ['play', 'pause'].includes(screen)) return;
      joinCode = code;
      screen = 'join';
    };
    addEventListener('hashchange', onHash);
    return () => {
      engine.destroy();
      off();
      document.removeEventListener('visibilitychange', autoPause);
      removeEventListener('hashchange', onHash);
      portrait.removeEventListener('change', autoPause);
    };
  });

  // ───────────── 連線 ─────────────

  const roomPhase = $derived(net.room?.phase ?? null);
  let prevPhase = null;
  $effect(() => {
    const phase = roomPhase;
    if (!engine || phase === prevPhase) return;
    if (phase !== 'playing') {
      engine.stop();
      racePhase = null;
      raceResults = null;
      raceSeed = null;
      raceMine = null;
      onlineMenu = false;
      if (phase === null && prevPhase !== null) screen = 'title';
    }
    prevPhase = phase;
  });

  function onRaceFrame(s) {
    if (!engine || roomPhase !== 'playing') return;
    // 新的一首：照房主的時間開始自己的曲子（開始後才進來、或沒座位就觀戰）
    if (s.seed !== raceSeed) {
      raceSeed = s.seed;
      raceResults = null;
      raceMine = null;
      raceSong = s.song;
      raceLevel = s.level;
      const mine = s.players.find((p) => p.seat === net.seat);
      ensureArt();
      if (mine && s.t < COUNTDOWN + 30) {
        engine.startOnline({ song: s.song, level: s.level, character: mine.character, lv: levelOf(mine.character).lv, seat: net.seat, t: s.t });
      } else engine.spectate({ song: s.song, level: s.level, t: s.t });
    }
    if (s.phase !== racePhase) {
      racePhase = s.phase;
      if (s.phase === 'results') {
        raceResults = s.results;
        // 自己打完的經驗值餵給自己的角色、成績記在自己的紀錄裡
        const v = engine.view;
        const mine = s.players.find((p) => p.seat === net.seat);
        if (v && mine && engine.state === 'online') {
          const feed = feedXp(mine.character, v.xp);
          recordBest(s.song, s.level, { score: v.score, rank: v.rank, fc: v.fc, killed: v.killed });
          raceMine = { feed, xp: v.xp, character: mine.character };
          if (v.killed && unlockHidden()) toast(t('隱藏角色「阿翼」加入了！'), 'ok');
        }
        playJingle(s.results?.[0]?.seat === net.seat ? 'win' : 'lose');
      }
    }
  }

  const view = $derived(roomPhase ? `online-${roomPhase}` : screen);

  // 背景音樂：依畫面切換（src/lib/audio/songs.js）；打歌的時候由 engine 自己放那一首
  const scene = $derived.by(() => {
    if (view === 'online-lobby') return 'menu';
    if (view === 'online-playing') return raceResults ? 'menu' : null;
    if (screen === 'title') return 'title';
    if (screen === 'play' || screen === 'pause') return null;
    return 'menu';
  });
  $effect(() => setBgm(scene));

  // ───────────── 單機 ─────────────

  function picked(id) {
    character = id;
    saveCharacter(id);
    screen = 'songs';
  }

  async function start({ song, level, demo = false }) {
    await ensureArt();
    pick = { song, level };
    savePick(pick);
    playing = { song, level, demo };
    result = null;
    await engine.startLocal({ song, level, character, lv: levelOf(character).lv, demo });
    screen = 'play';
  }

  function toTitle() {
    engine.stop();
    screen = 'title';
  }

  // 單機打完
  function onEnd(v) {
    if (net.room) return;
    const c = getCharacter(character);
    const demo = playing.demo;
    const feed = demo ? null : feedXp(character, v.xp);
    const record = demo ? false : recordBest(playing.song, playing.level, { score: v.score, rank: v.rank, fc: v.fc, killed: v.killed });
    const unlocked = !demo && v.killed && unlockHidden();
    result = {
      title: t(trackOf(playing.song).title),
      world: WORLDS[trackOf(playing.song).world].id,
      level: playing.level,
      character: c,
      killed: v.killed,
      score: v.score,
      rank: v.rank,
      fc: v.fc,
      counts: v.counts,
      maxCombo: v.max_combo,
      dmgPct: Math.round((v.dmg / Math.max(1, v.boss_max)) * 100),
      xp: v.xp,
      feed,
      record,
      unlocked,
      line: pickLine(c, v.killed ? 'win' : 'lose'),
    };
    playJingle(v.killed ? 'win' : 'lose');
    screen = 'result';
  }

  // 正在遊戲中（鍵盤、手把拿來打音符，不做選單操作）
  const inGame = $derived((screen === 'play' && !roomPhase) || (view === 'online-playing' && !raceResults && !onlineMenu));

  let selectScreen = $state();

  // Esc／手把 B
  function back() {
    if (view === 'online-playing') {
      if (onlineMenu) onlineMenu = false;
      return;
    }
    if (view === 'online-lobby') return; // 離開房間要按按鈕，避免誤觸
    if (screen === 'select') selectScreen?.goBack();
    else if (screen === 'songs') screen = 'select';
    else if (screen === 'pause') resume();
    else if (['help', 'host', 'join'].includes(screen)) screen = 'title';
  }

  // Esc／手把 Start
  function pause() {
    if (view === 'online-playing') onlineMenu = true;
    else if (screen === 'play') {
      engine.pause();
      screen = 'pause';
    }
  }

  function resume() {
    engine.resume();
    screen = 'play';
  }

  function onkeydown(e) {
    if (e.repeat || e.target.closest?.('input, textarea, select')) return;
    if (e.code === 'KeyM' && !inGame) toggleMute();
  }

</script>

<svelte:window {onkeydown} />
<Controls {inGame} onback={back} onpause={pause} />

<div id="stage">
  <canvas bind:this={canvas}></canvas>

  {#if view === 'online-lobby'}
    <Lobby />
  {:else if view === 'online-playing'}
    {#if raceResults}
      <OnlineResult
        results={raceResults}
        you={net.seat}
        mine={raceMine}
        title={raceSong ? t(trackOf(raceSong).title) : ''}
        level={raceLevel}
        actions={net.isHost
          ? [
              { label: t('回大廳'), action: () => hostCmd('reset') },
              { label: t('再一首'), action: () => hostCmd('start'), primary: true },
            ]
          : []}
      />
    {:else if onlineMenu}
      <Dialog title={t('選單')} subtitle={t('連線遊戲不會暫停喔！')}>
        <Menu
          items={[
            { label: t('回到比賽'), action: () => (onlineMenu = false) },
            { label: t('設定'), action: openSettings },
            ...(net.isHost ? [{ label: t('結束比賽、回大廳'), action: () => hostCmd('reset') }] : []),
            { label: t('離開房間'), action: leave },
          ]}
        />
      </Dialog>
    {/if}
    {#if net.status === 'reconnecting'}
      <div class="net-banner">{t('連線中斷，重新連線中…')}</div>
    {/if}
  {:else if screen === 'title'}
    <TitleScreen
      items={[
        { label: t('單人演奏'), action: () => (screen = 'select') },
        { label: t('開設房間'), action: () => (screen = 'host') },
        { label: t('加入房間'), action: () => (screen = 'join') },
        { label: t('操作說明'), action: () => (screen = 'help') },
        { label: t('設定'), action: openSettings },
      ]}
    />
  {:else if screen === 'host' || screen === 'join'}
    {#key joinCode}
      <RoomEntry
        page={screen}
        code={screen === 'join' ? joinCode : ''}
        onback={() => {
          joinCode = '';
          screen = 'title';
        }}
      />
    {/key}
  {:else if screen === 'help'}
    <HelpScreen onback={() => (screen = 'title')} />
  {:else if screen === 'select'}
    <SelectScreen bind:this={selectScreen} initial={character} onstart={picked} onback={() => (screen = 'title')} />
  {:else if screen === 'songs'}
    <SongSelect {character} {pick} onstart={start} onback={() => (screen = 'select')} />
  {:else if screen === 'pause'}
    <Dialog title={t('暫停')}>
      <Menu
        items={[
          { label: t('繼續'), action: resume },
          { label: t('從頭開始'), action: () => start(playing) },
          { label: t('返回選曲'), action: () => { engine.stop(); screen = 'songs'; } },
          { label: t('設定'), action: openSettings },
          { label: t('回標題'), action: toTitle },
        ]}
      />
    </Dialog>
  {:else if screen === 'result' && result}
    <ResultScreen
      {result}
      demo={playing?.demo}
      actions={[
        { label: t('回標題'), action: toTitle },
        { label: t('換角色'), action: () => { engine.stop(); screen = 'select'; } },
        { label: t('再挑戰'), action: () => start({ ...playing, demo: false }) },
        { label: t('返回選曲'), action: () => { engine.stop(); screen = 'songs'; }, primary: true },
      ]}
    />
  {/if}

  {#if inGame}
    <!-- 右上角的圓形暫停鈕 -->
    <button type="button" class="pause-btn" tabindex="-1" aria-label={t('暫停')} onclick={pause}><i></i><i></i></button>
  {/if}

  <div class="toasts">
    {#each net.toasts as t (t.id)}
      <div class="toast" class:ok={t.kind === 'ok'}>{t.message}</div>
    {/each}
  </div>
  <SettingsDialog />
  {#if booting || waiting}
    <div class="loading" role="status">
      <div class="loading-logo"><Logo size="big" /></div>
      <div class="bar"><i style:width="{percent}%"></i></div>
      <p>{t('載入中…')} {percent}%</p>
    </div>
  {/if}
  <div class="rotate-hint">{t('請把裝置轉成橫向 ↻')}</div>
</div>

<style>
  canvas {
    touch-action: none;
  }
  .pause-btn {
    position: absolute;
    top: 2.2cqh;
    right: 1.25cqw;
    width: 7cqh;
    height: 7cqh;
    border-radius: 50%;
    border: 0.37cqh solid var(--navy);
    background: #fff;
    box-shadow: 0 0.55cqh 0 rgba(17, 111, 149, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.9cqh;
    z-index: 5;
    opacity: 0.85;
  }
  .pause-btn i {
    width: 1cqh;
    height: 3cqh;
    border-radius: 0.4cqh;
    background: var(--navy);
  }
  .pause-btn:hover {
    background: var(--sky-light);
  }
  .loading {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3cqh;
    background: var(--navy-deep);
    color: var(--cream);
  }
  .loading .bar {
    width: 40cqw;
    height: 2.4cqh;
    border: 0.4cqh solid var(--cream);
    padding: 0.4cqh;
  }
  .loading .bar i {
    display: block;
    height: 100%;
    background: var(--gold);
    transition: width 0.15s;
  }
  .loading p {
    margin: 0;
    font-weight: 900;
    font-size: 2.6cqh;
    letter-spacing: 0.2em;
  }
  .loading-logo {
    width: 50cqw;
    display: flex;
    justify-content: center;
  }
</style>
