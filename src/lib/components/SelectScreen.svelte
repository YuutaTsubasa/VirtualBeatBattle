<script>
  // 選擇角色（art-work/rhythm-ui-concept-v1/03-character-select）：左邊目前角色的大頭像（斜切的藍色背景、大大的編號），
  // 名字、介紹、等級與經驗值、攻擊力、特殊能力；右邊「角色名冊」4×3：十一位角色（阿翼沒解鎖前是「？？？」）＋隨機選擇。
  // 能力的數值在 crates/beat-core/src/characters.rs；等級各自養（經驗值餵給打的那個角色）。
  // 點一下（或鍵盤／手把移過去）是看資料，再點一次（或 Enter）決定。
  import { onMount, untrack } from 'svelte';
  import { CHARACTERS, isUnlocked } from '../game/characters.js';
  import { levelOf } from '../game/progress.js';
  import { atkOfLevel, xpToNext, MAX_LEVEL } from '../game/constants.js';
  import { play } from '../game/audio.js';
  import { ui } from '../ui.svelte.js';
  import { asset } from '../art-style.svelte.js';
  import { t } from '../i18n.svelte.js';
  import ScreenFrame from './ScreenFrame.svelte';
  import BackButton from './BackButton.svelte';
  import ControlHint from './ControlHint.svelte';

  // onstart(角色 id)、onback()
  let { initial = 'xiaocui', onstart, onback } = $props();
  let cursor = $state(Math.max(0, CHARACTERS.findIndex((c) => c.id === untrack(() => initial))));
  let grid;

  const current = $derived(CHARACTERS[cursor]);
  const open = $derived(isUnlocked(current));
  const lv = $derived(levelOf(current.id));
  const need = $derived(xpToNext(lv.lv));

  onMount(() => grid.querySelectorAll('button')[cursor]?.focus({ preventScroll: true }));

  function look(i) {
    if (i !== cursor && (ui.input === 'key' || ui.input === 'pad')) play('move');
    cursor = i;
  }

  // 滑鼠／觸控按下去的時候，這一張是不是本來就在看了（按下去會先 focus、focus 又會切過去看，
  // 所以要在 focus 之前記下來，不然第一下點就直接決定了）
  let wasLooking = false;

  function choose(i, e) {
    // 滑鼠／觸控：點已經在看的那一張才決定，第一下只是看資料
    if (e.detail > 0 && !wasLooking) return look(i);
    // 鍵盤 Enter／手把 A（detail = 0）：方向鍵移過來就已經在看了，直接決定
    if (i !== cursor) return look(i);
    pick();
  }

  function pick(character = current) {
    if (!isUnlocked(character)) return play('deny');
    play('select');
    onstart(character.id);
  }

  function randomPick() {
    const pool = CHARACTERS.filter((c) => isUnlocked(c));
    const c = pool[Math.floor(Math.random() * pool.length)];
    cursor = CHARACTERS.indexOf(c);
    play('select');
  }

  // Esc／手把 B（由 App 透過 Controls 呼叫）
  export function goBack() {
    play('select');
    onback();
  }
</script>

<ScreenFrame title={t('選擇角色')} en="CHARACTER SELECT">
  <div class="select">
    <div class="profile">
      <div class="hero">
        <img class="sky" src={asset('stages/city-1/far.webp')} alt="" />
        <span class="no">{String(cursor + 1).padStart(2, '0')}</span>
        {#if open}
          {#key current.id}<img class="face" src={current.portraits.happy} alt="" />{/key}
          <p class="tagline">{t('用音樂')}<br />{t('讓世界再次共鳴')}</p>
        {:else}
          <img class="lock" src={asset('ui/icons/lock.webp')} alt="" />
        {/if}
      </div>
      <div class="name-row">
        <h3 class="pop-text">{open ? current.name : '？？？'}</h3>
        <i class="slashes"></i>
      </div>
      <p class="intro">{open ? current.intro : t('首次擊破魔王解鎖')}</p>
      {#if open}
        <div class="metrics">
          <b class="lv">Lv.{lv.lv}</b>
          <span class="xp"><i style:width="{lv.lv >= MAX_LEVEL ? 100 : (lv.xp / need) * 100}%"></i></span>
          <span class="xp-num">{lv.lv >= MAX_LEVEL ? 'MAX' : `${lv.xp} / ${need}`}</span>
          <span class="atk">ATK <b>{atkOfLevel(lv.lv)}</b></span>
        </div>
        <div class="ability">
          <span class="icon" style:--sp={current.specialColor}>♪</span>
          <div>
            <small>{t('特殊能力')}</small>
            <b>{current.specialName}</b>
            <p>{current.specialDesc}</p>
          </div>
        </div>
        <p class="note-line">{t('角色能力影響魔王戰，技術分依判定計算')}</p>
      {/if}
    </div>

    <div class="roster">
      <div class="roster-head"><b class="pop-text">{t('角色名冊')}</b><small class="en-sub">CHARACTER LIST</small></div>
      <div class="grid" bind:this={grid}>
        {#each CHARACTERS as c, i (c.id)}
          {@const unlocked = isUnlocked(c)}
          <button
            type="button"
            class="pass"
            class:sel={i === cursor}
            class:locked={!unlocked}
            onpointerdown={() => (wasLooking = i === cursor)}
            onfocus={() => look(i)}
            onclick={(e) => choose(i, e)}
            ondblclick={() => pick(c)}
          >
            {#if unlocked}
              <img src={c.portraits.normal} alt="" />
              <span class="nm">{c.name}</span>
            {:else}
              <span class="mystery"><img src={asset('ui/icons/lock.webp')} alt="" /><b>？？？</b><small>{t('首次擊破魔王解鎖')}</small></span>
            {/if}
            {#if i === cursor}<i class="mark"></i>{/if}
          </button>
        {/each}
        <button type="button" class="pass random" onclick={randomPick}>
          <span class="dice">⚄</span>
          <span class="nm">{t('隨機選擇')}</span>
        </button>
      </div>
    </div>
  </div>

  {#snippet foot()}
    <BackButton onclick={goBack} />
    <ControlHint extra={ui.input === 'touch' ? t('點一下看資料，再點一下決定') : ''} />
    <button type="button" class="vbtn primary" disabled={!open} onclick={() => pick()}>{t('選擇曲目')}</button>
  {/snippet}
</ScreenFrame>

<style>
  .select {
    flex: 1;
    display: grid;
    grid-template-columns: 40cqw 1fr;
    gap: 2.4cqw;
    min-height: 0;
  }
  .profile {
    display: flex;
    flex-direction: column;
    min-height: 0;
    gap: 0.6cqh;
  }
  /* 斜切的藍色背景＋天空都市，頭像蓋在上面 */
  .hero {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    clip-path: polygon(0 8%, 100% 0, 92% 100%, 0 100%);
    background: linear-gradient(120deg, var(--accent), #2d64ff 60%, #6fb2ff);
  }
  .sky {
    position: absolute;
    right: 0;
    top: 0;
    width: 70%;
    height: 100%;
    object-fit: cover;
    clip-path: polygon(30% 0, 100% 0, 100% 100%, 0 100%);
    opacity: 0.9;
  }
  .no {
    position: absolute;
    left: 2cqw;
    top: 3cqh;
    font-size: 16cqh;
    font-weight: 900;
    font-style: italic;
    line-height: 1;
    color: rgba(255, 255, 255, 0.22);
  }
  .face {
    position: absolute;
    left: 42%;
    bottom: -14%;
    height: 128%;
    translate: -50% 0;
    filter: drop-shadow(0 1cqh 2cqh rgba(5, 20, 80, 0.4));
    animation: in 0.25s ease-out;
  }
  @keyframes in {
    from {
      opacity: 0.2;
      translate: -44% 0;
    }
  }
  .lock {
    position: absolute;
    left: 50%;
    top: 50%;
    height: 14cqh;
    translate: -50% -50%;
    opacity: 0.6;
  }
  .tagline {
    position: absolute;
    right: 10%;
    bottom: 4%;
    margin: 0;
    font-family: 'Klee One', 'Yu Gothic', var(--font);
    font-style: italic;
    font-weight: 700;
    font-size: 2.6cqh;
    line-height: 1.4;
    color: var(--accent);
    text-shadow: 0 0 0.8cqh #fff, 0 0 1.6cqh #fff;
    rotate: -10deg;
  }
  .name-row {
    display: flex;
    align-items: center;
    gap: 1.4cqw;
  }
  h3 {
    margin: 0;
    font-size: 7.4cqh;
    color: var(--navy);
  }
  .slashes {
    width: 4cqh;
    height: 5cqh;
    background: repeating-linear-gradient(115deg, var(--accent) 0 0.6cqh, transparent 0.6cqh 1.4cqh);
    clip-path: polygon(30% 0, 100% 0, 70% 100%, 0 100%);
  }
  .intro {
    margin: 0;
    font-weight: 800;
    font-size: 2.2cqh;
    letter-spacing: 0.2em;
    color: var(--navy-soft);
  }
  .metrics {
    display: flex;
    align-items: center;
    gap: 1.2cqw;
    padding: 0.6cqh 0;
    border-top: var(--line) solid var(--sky-line);
    border-bottom: var(--line) solid var(--sky-line);
  }
  .lv {
    font-size: 3.6cqh;
    font-weight: 900;
    font-style: italic;
  }
  .xp {
    flex: 1;
    height: 1.2cqh;
    background: #e6ebf5;
    clip-path: polygon(0.5cqh 0, 100% 0, calc(100% - 0.5cqh) 100%, 0 100%);
  }
  .xp i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #2fc6ff, var(--accent));
  }
  .xp-num {
    font-weight: 800;
    font-size: 1.9cqh;
  }
  .atk {
    font-weight: 900;
    font-size: 1.9cqh;
    padding-left: 1.2cqw;
    border-left: var(--line) solid var(--sky-line);
  }
  .atk b {
    font-size: 3.6cqh;
    font-style: italic;
  }
  .ability {
    display: flex;
    align-items: center;
    gap: 1.4cqw;
    padding: 0.8cqh 1cqw;
    background: #fff;
    border: var(--line) solid var(--sky-line);
  }
  .icon {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 8cqh;
    height: 8cqh;
    background: var(--accent);
    color: #fff;
    font-size: 5cqh;
    clip-path: polygon(1.4cqh 0, 100% 0, calc(100% - 1.4cqh) 100%, 0 100%);
  }
  .ability small {
    display: block;
    font-weight: 900;
    font-size: 1.8cqh;
  }
  .ability b {
    display: block;
    font-size: 3.4cqh;
    font-style: italic;
    color: var(--accent);
    line-height: 1.15;
  }
  .ability p {
    margin: 0;
    font-weight: 800;
    font-size: 2cqh;
  }
  .note-line {
    margin: 0;
    font-weight: 700;
    font-size: 1.6cqh;
    color: var(--muted);
    text-align: center;
  }

  .roster {
    display: flex;
    flex-direction: column;
    min-height: 0;
    gap: 1cqh;
  }
  .roster-head {
    display: flex;
    align-items: baseline;
    gap: 1.4cqw;
    padding-left: 1.4cqh;
    border-left: 0.6cqh solid var(--accent);
  }
  .roster-head b {
    font-size: 4cqh;
    color: var(--navy);
  }
  .roster-head small {
    font-size: 1.5cqh;
    color: var(--muted);
  }
  .grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 1.2cqh 0.9cqw;
  }
  /* 名冊卡：像音樂人的通行證，右下一個小斜角，底下名字條 */
  .pass {
    position: relative;
    padding: 0;
    border: var(--line) solid var(--sky-line);
    background: linear-gradient(160deg, #dfe8ff, #f6f9ff);
    overflow: hidden;
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 2cqh), calc(100% - 2cqh) 100%, 0 100%);
    display: flex;
    flex-direction: column;
    transition: transform 0.08s;
  }
  .pass:hover {
    transform: translateY(-0.4cqh);
  }
  .pass img {
    flex: 1;
    min-height: 0;
    width: 100%;
    object-fit: cover;
    object-position: center 14%;
  }
  .nm {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4cqh 1cqw;
    background: #fff;
    font-weight: 900;
    font-style: italic;
    font-size: 2.4cqh;
    color: var(--navy);
  }
  .nm::after {
    content: '';
    width: 3cqh;
    height: 1.8cqh;
    background: repeating-linear-gradient(115deg, rgba(20, 80, 245, 0.25) 0 0.4cqh, transparent 0.4cqh 0.9cqh);
  }
  .pass.sel {
    border: 0.4cqh solid #9fe4ff;
    box-shadow: 0 0 0 0.3cqh var(--accent) inset;
  }
  .pass.sel .nm {
    background: var(--accent);
    color: #fff;
  }
  .mark {
    position: absolute;
    left: 0.8cqh;
    top: 0.8cqh;
    width: 2.2cqh;
    height: 2.2cqh;
    background: #fff;
    border: 0.4cqh solid var(--accent);
    rotate: 45deg;
  }
  .locked {
    background: linear-gradient(160deg, #0d1a45, #1b2c6a);
  }
  .mystery {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4cqh;
    color: #fff;
  }
  .mystery img {
    flex: none;
    width: 5cqh;
    height: 5cqh;
    object-fit: contain;
  }
  .mystery b {
    font-size: 3cqh;
  }
  .mystery small {
    font-weight: 800;
    font-size: 1.5cqh;
  }
  .random {
    background: #fff;
  }
  .dice {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11cqh;
    color: var(--navy);
  }
</style>
