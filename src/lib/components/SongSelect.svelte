<script>
  // 選曲（= 選魔王）：左邊六首曲子，右邊選到的魔王、難度、最佳成績，以及「現在的等級全 Perfect 大約打得掉幾成」。
  // 魔王的血量是初始等級全 Perfect 打掉七成五（crates/beat-core/src/play.rs），所以要練等級或打得更準才打得倒。
  import { onMount, untrack } from 'svelte';
  import { TRACKS, LEVELS } from '../game/tracks.js';
  import { WORLDS } from '../game/stages.js';
  import { SONGS } from '../audio/songs.js';
  import { getCharacter } from '../game/characters.js';
  import { levelOf, bestOf } from '../game/progress.js';
  import { atkOfLevel, xpToNext, MAX_LEVEL } from '../game/constants.js';
  import { sheetOf } from '../game/sheets.js';
  import { asset } from '../art-style.svelte.js';
  import { play } from '../game/audio.js';
  import { t } from '../i18n.svelte.js';
  import ScreenFrame from './ScreenFrame.svelte';
  import BackButton from './BackButton.svelte';
  import SpritePose from './SpritePose.svelte';
  import CHARTS from '../../../crates/beat-core/charts.json' with { type: 'json' };

  // onstart({ song, level, demo })、onback()
  let { character, pick, onstart, onback } = $props();

  let songId = $state(untrack(() => pick?.song) ?? 'city');
  let level = $state(untrack(() => pick?.level) ?? 'normal');
  const c = $derived(getCharacter(character));
  const lv = $derived(levelOf(character));
  const track = $derived(TRACKS.find((tr) => tr.id === songId) ?? TRACKS[0]);
  const world = $derived(WORLDS[track.world]);
  const chartInfo = $derived(CHARTS.songs.find((s) => s.id === songId));
  const best = $derived(bestOf(songId, level));
  // 現在的等級全 Perfect 大約打得掉魔王幾成（不算角色能力）
  const estimate = $derived(Math.round(75 * (atkOfLevel(lv.lv) / 100)));
  const minutes = (ms) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}`;

  function bossStyle(worldId) {
    const sheet = sheetOf('bosses', worldId);
    if (!sheet) return '';
    const rows = Math.ceil(sheet.frames.length / sheet.cols);
    return `background-image: url(${asset(sheet.src)}); background-size: ${sheet.cols * 100}% ${rows * 100}%; background-position: 0 0`;
  }

  let list;
  onMount(() => list.querySelector('.song.sel')?.focus({ preventScroll: true }));

  function choose(id) {
    if (id !== songId) play('move');
    songId = id;
  }

  function start(demo = false) {
    play('select');
    onstart({ song: songId, level, demo });
  }
</script>

<ScreenFrame title={t('選擇魔王')} subtitle={t('每一首歌都是一隻魔王：打中音符就是反擊！')} world={track.world}>
  <div class="pick">
    <div class="songs" bind:this={list}>
      {#each TRACKS as tr (tr.id)}
        {@const w = WORLDS[tr.world]}
        {@const b = bestOf(tr.id, level)}
        <button type="button" class="song panel" class:sel={tr.id === songId} onclick={() => choose(tr.id)} onfocus={() => choose(tr.id)} ondblclick={() => start()}>
          <span class="thumb" style={bossStyle(w.id)}></span>
          <span class="names">
            <b>{t(tr.title)}</b>
            <small>BOSS {t(w.boss.name)}</small>
          </span>
          <span class="mark">
            {#if b?.killed}<i class="down">{t('擊破')}</i>{/if}
            {#if b}<i class="rank">{b.rank}</i>{/if}
          </span>
        </button>
      {/each}
    </div>

    <div class="detail panel">
      <div class="boss-art" style={bossStyle(world.id)}></div>
      <div class="head">
        <h3 class="pop-text">{t(track.title)}</h3>
        <span class="meta">BPM {SONGS[track.song].bpm} ・ {minutes(chartInfo?.length_ms ?? 0)}</span>
      </div>
      <p class="boss">BOSS <b>{t(world.boss.name)}</b></p>

      <div class="levels" role="radiogroup">
        {#each LEVELS as l (l.id)}
          <button type="button" role="radio" aria-checked={level === l.id} class="lv {l.id}" class:on={level === l.id} onclick={() => { play('move'); level = l.id; }}>
            <span>{l.name}</span><b>{chartInfo?.charts[l.id].rating}</b>
          </button>
        {/each}
      </div>

      <div class="rows">
        <div><span>{t('最佳成績')}</span><b>{best ? `${String(best.score).padStart(7, '0')}  ${best.rank}` : '—'}{#if best?.fc}<i class="fc">FC</i>{/if}</b></div>
        <div><span>{t('音符數')}</span><b>{chartInfo?.charts[level].notes.filter((n) => n[3] === 0).length}</b></div>
      </div>

      <div class="me">
        <div class="me-pic"><SpritePose character={c} pose="idle" size="16cqh" /></div>
        <div class="me-info">
          <b>{c.name} <span>Lv.{lv.lv}</span></b>
          <div class="xp"><i style:width="{lv.lv >= MAX_LEVEL ? 100 : (lv.xp / xpToNext(lv.lv)) * 100}%"></i></div>
          <small>ATK {atkOfLevel(lv.lv)} ・ {c.specialName}</small>
          <p class="estimate" class:ok={estimate >= 100}>
            {t('全 Perfect 大約打掉魔王 {n}%', { n: estimate })}{estimate >= 100 ? t('，打得倒！') : t('，再練幾級吧')}
          </p>
        </div>
      </div>
    </div>
  </div>

  {#snippet foot()}
    <BackButton onclick={onback} />
    <div class="go">
      <button type="button" class="vbtn small" onclick={() => start(true)}>{t('電腦示範')}</button>
      <button type="button" class="vbtn primary" onclick={() => start()}>{t('開始！')}</button>
    </div>
  {/snippet}
</ScreenFrame>

<style>
  .go {
    display: flex;
    align-items: center;
    gap: 1.4cqw;
    margin-left: auto;
  }
  .pick {
    flex: 1;
    display: grid;
    grid-template-columns: 40cqw 1fr;
    gap: 2cqw;
    min-height: 0;
  }
  .songs {
    display: flex;
    flex-direction: column;
    gap: 1cqh;
    min-height: 0;
    overflow: hidden auto;
    padding: 0.4cqh 1.6cqw 0.4cqh 0.4cqh;
  }
  .song {
    flex-direction: row;
    align-items: center;
    gap: 1.2cqw;
    padding: 0.6cqh 1.2cqw;
    text-align: left;
    cursor: pointer;
    min-height: 9cqh;
  }
  .song.sel {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--gold) 22%, var(--paper-white, #fff));
    translate: 1cqw 0;
  }
  .thumb {
    width: 8cqh;
    height: 8cqh;
    flex: none;
    background-repeat: no-repeat;
    transform: scaleX(-1);
    border-radius: 1cqh;
    background-color: rgba(0, 0, 0, 0.08);
  }
  .names {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .names b {
    font-size: 3cqh;
    color: var(--navy);
  }
  .names small {
    font-weight: 800;
    font-size: 1.8cqh;
    color: var(--navy-soft);
  }
  .mark {
    display: flex;
    gap: 0.6cqw;
    align-items: center;
  }
  .mark i {
    font-style: normal;
    font-weight: 900;
    font-size: 1.9cqh;
    padding: 0.1cqh 1cqh;
    border-radius: 999px;
  }
  .mark .down {
    background: var(--accent);
    color: #fff;
  }
  .mark .rank {
    background: var(--navy);
    color: var(--gold);
  }

  .detail {
    position: relative;
    padding: 2cqh 2.4cqw;
    gap: 1cqh;
    overflow: hidden;
  }
  .boss-art {
    position: absolute;
    right: -2cqw;
    top: -2cqh;
    width: 34cqh;
    height: 34cqh;
    background-repeat: no-repeat;
    transform: scaleX(-1);
    opacity: 0.9;
    pointer-events: none;
  }
  .head {
    display: flex;
    flex-direction: column;
    position: relative;
  }
  h3 {
    margin: 0;
    font-size: 6.4cqh;
    color: var(--navy);
  }
  .meta {
    font-weight: 800;
    color: var(--navy-soft);
    font-size: 2cqh;
  }
  .boss {
    margin: 0;
    position: relative;
    font-weight: 900;
    font-size: 2.2cqh;
    color: var(--accent);
  }
  .boss b {
    font-size: 3cqh;
  }
  .levels {
    position: relative;
    display: flex;
    gap: 1cqw;
    margin-top: 6cqh;
  }
  .lv {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.6cqh 0;
    border: 0.35cqh solid var(--navy);
    border-radius: 1.4cqh;
    background: var(--paper-white, #fff);
    font-weight: 900;
    cursor: pointer;
    color: var(--navy);
  }
  .lv span {
    font-size: 1.9cqh;
    letter-spacing: 0.1em;
  }
  .lv b {
    font-size: 4cqh;
    line-height: 1;
  }
  .lv.easy.on {
    background: #7fdc8f;
  }
  .lv.normal.on {
    background: #7fc8ff;
  }
  .lv.hard.on {
    background: #ff8f8f;
  }
  .lv.on {
    box-shadow: 0 0.5cqh 0 var(--navy);
    translate: 0 -0.4cqh;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 0.4cqh;
    font-weight: 800;
    font-size: 2.2cqh;
  }
  .rows div {
    display: flex;
    justify-content: space-between;
    border-bottom: 0.2cqh dashed color-mix(in srgb, var(--navy) 30%, transparent);
  }
  .fc {
    margin-left: 0.6cqw;
    font-style: normal;
    color: var(--accent);
  }
  .me {
    margin-top: auto;
    display: flex;
    gap: 1.2cqw;
    align-items: center;
  }
  .me-pic {
    margin: -2cqh 0 -1cqh;
  }
  .me-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.4cqh;
  }
  .me-info b {
    font-size: 3cqh;
    color: var(--navy);
  }
  .me-info b span {
    color: var(--accent);
    font-size: 2.4cqh;
  }
  .me-info small {
    font-weight: 800;
    font-size: 1.9cqh;
    color: var(--navy-soft);
  }
  .xp {
    height: 1.2cqh;
    border-radius: 999px;
    background: color-mix(in srgb, var(--navy) 18%, transparent);
    overflow: hidden;
  }
  .xp i {
    display: block;
    height: 100%;
    background: var(--gold);
  }
  .estimate {
    margin: 0;
    font-weight: 900;
    font-size: 2.1cqh;
    color: var(--teal);
  }
  .estimate.ok {
    color: var(--accent);
  }
</style>
