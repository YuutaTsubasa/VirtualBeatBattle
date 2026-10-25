<script>
  // 選角：左上是目前角色的大幅姿態，右邊白色能力牌（名字、等級、小能力、說明），底下一排名冊（10 位＋隱藏角色）。
  // 每個角色的能力不一樣（數值在 crates/beat-core/src/characters.rs），等級各自養（經驗值餵給打的那個角色）。
  // 阿翼沒解鎖前不露出身份。
  import { onMount, untrack } from 'svelte';
  import { CHARACTERS, isUnlocked } from '../game/characters.js';
  import { levelOf } from '../game/progress.js';
  import { atkOfLevel, xpToNext, MAX_LEVEL } from '../game/constants.js';
  import { play } from '../game/audio.js';
  import { ui } from '../ui.svelte.js';
  import ScreenFrame from './ScreenFrame.svelte';
  import BackButton from './BackButton.svelte';
  import ControlHint from './ControlHint.svelte';
  import CharacterGrid from './CharacterGrid.svelte';
  import RunnerPose from './RunnerPose.svelte';
  import { asset } from '../art-style.svelte.js';
  import { t } from '../i18n.svelte.js';

  // onstart(角色 id)、onback()
  let { initial = 'xiaocui', onstart, onback } = $props();
  let cursor = $state(Math.max(0, CHARACTERS.findIndex((c) => c.id === untrack(() => initial))));
  let grid;
  let startButton = $state();

  const current = $derived(CHARACTERS[cursor]);
  const open = $derived(isUnlocked(current));
  const lv = $derived(levelOf(current.id));

  onMount(() => grid.focusIndex(cursor));

  function pick(character = current) {
    if (!isUnlocked(character)) return play('deny');
    play('select');
    onstart(character.id);
  }

  function randomPick() {
    const pool = CHARACTERS.filter((c) => isUnlocked(c));
    const c = pool[Math.floor(Math.random() * pool.length)];
    cursor = CHARACTERS.indexOf(c);
    grid.focusIndex(cursor);
  }

  // Esc／手把 B（由 App 透過 Controls 呼叫）
  export function goBack() {
    play('select');
    onback();
  }
</script>

<ScreenFrame title={t('選擇角色')} subtitle={t('打中音符就是這個角色的攻擊，經驗值也算在這個角色身上')}>
  <div class="select">
    <div class="hero">
      <div class="swoosh"></div>
      {#if open}
        {#key current.id}
          <div class="hero-run"><RunnerPose character={current} size="46cqh" /></div>
        {/key}
      {:else}
        <img class="lock" src={asset('ui/icons/lock.webp')} alt="" />
      {/if}
    </div>

    <div class="info panel">
      {#if open}
        <div class="mode-pill">Lv.{lv.lv} <b>ATK {atkOfLevel(lv.lv)}</b>
          <span class="xp"><i style:width="{lv.lv >= MAX_LEVEL ? 100 : (lv.xp / xpToNext(lv.lv)) * 100}%"></i></span>
        </div>
      {/if}
      <h3 class="name pop-text">{open ? current.name : '？？？'}</h3>
      <p class="intro">{open ? current.intro : t('第一次打倒魔王就會出現。')}</p>
      <div class="ability" style:--sp={open ? current.specialColor : 'var(--muted)'}>
        <span class="pill">{t('特殊能力')}</span>
        <b>{open ? current.specialName : '？？？'}</b>
      </div>
      <p class="desc">{open ? current.specialDesc : ''}</p>
      <button type="button" class="vbtn small random" onclick={randomPick}>{t('隨機')}</button>
    </div>

    <div class="roster panel">
      <CharacterGrid bind:this={grid} bind:cursor columns={11} onpick={(c) => pick(c)} />
    </div>
  </div>

  {#snippet foot()}
    <BackButton onclick={goBack} />
    <ControlHint extra={ui.input === 'touch' ? t('點一下看資料，再點一下決定') : ''} />
    <button type="button" class="vbtn primary" bind:this={startButton} disabled={!open} onclick={() => pick()}>
      {t('選擇魔王')}
    </button>
  {/snippet}
</ScreenFrame>

<style>
  .select {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 38cqw;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 1.6cqh 2cqw;
    min-height: 0;
  }
  /* 大幅奔跑姿態：踩在一條晴空藍的速度帶上 */
  .hero {
    position: relative;
    min-height: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .swoosh {
    position: absolute;
    left: -3cqw;
    right: 0;
    bottom: 2cqh;
    height: 11cqh;
    border-radius: 0 999px 999px 0;
    background:
      linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7) 30%, transparent 31%, transparent 60%, rgba(255, 255, 255, 0.6) 61%, transparent 75%) 0 30% / 100% 0.6cqh no-repeat,
      linear-gradient(90deg, rgba(35, 181, 232, 0), var(--sky) 40%, #8fdcf7);
    transform: skewY(-4deg);
  }
  .hero-run {
    position: relative;
    margin-bottom: -2cqh;
    animation: in 0.25s ease-out;
  }
  .hero .lock {
    position: relative;
    height: 20cqh;
    margin-bottom: 8cqh;
    opacity: 0.6;
  }
  @keyframes in {
    from {
      opacity: 0.3;
      transform: translateX(-3cqw);
    }
  }

  .info {
    padding: 2cqh 2.6cqw 2cqh;
    gap: 1cqh;
    align-items: flex-start;
  }
  .mode-pill {
    align-self: flex-end;
    display: flex;
    gap: 1.4cqh;
    align-items: center;
    padding: 0.3cqh 1.8cqh;
    border: 0.25cqh solid var(--teal);
    border-radius: 999px;
    color: var(--teal);
    font-weight: 900;
    font-size: 2cqh;
  }
  .mode-pill b {
    color: var(--gold-deep);
  }
  .mode-pill .xp {
    width: 10cqw;
    height: 1cqh;
    border-radius: 999px;
    background: color-mix(in srgb, var(--teal) 20%, transparent);
    overflow: hidden;
  }
  .mode-pill .xp i {
    display: block;
    height: 100%;
    background: var(--gold);
  }
  .name {
    margin: 0;
    font-size: 9cqh;
    color: var(--navy);
  }
  .intro {
    margin: 0;
    font-weight: 800;
    font-size: 2.2cqh;
    color: var(--navy-soft);
  }
  .ability {
    display: flex;
    align-items: center;
    gap: 1.2cqh;
    margin-top: 0.6cqh;
  }
  .ability .pill {
    padding: 0.2cqh 1.4cqh;
    border-radius: 999px;
    background: var(--teal);
    color: #fff;
    font-weight: 900;
    font-size: 1.9cqh;
  }
  .ability b {
    font-size: 3.6cqh;
    font-weight: 900;
    color: var(--teal);
    border-bottom: 0.5cqh solid var(--sp);
  }
  .desc {
    margin: 0;
    font-weight: 800;
    font-size: 2.6cqh;
    line-height: 1.45;
  }
  .random {
    margin-top: auto;
    align-self: flex-end;
  }

  .roster {
    grid-column: 1 / -1;
    padding: 1.2cqh 1.4cqw;
    flex-direction: row;
  }
  .roster :global(.grid) {
    gap: 1cqh 0.8cqw;
  }
  /* 名冊：11 位排一排，格子接近正方形，整張臉都看得到 */
  .roster :global(.card) {
    aspect-ratio: auto;
    height: 17cqh;
  }
  .roster :global(.card img) {
    object-position: center 18%;
  }
</style>
