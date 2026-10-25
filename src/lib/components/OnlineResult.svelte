<script>
  // 連線成績（art-work/rhythm-ui-concept-v1 的 02 右下）：左邊技術分排名表（名次、玩家、技術分、最大連擊、魔王戰果），
  // 自己那一列變藍；右邊「本次演奏」：自己的名次、評價、角色與魔王擊破、經驗值與升級；底下回大廳／再一首（房主）。
  import { onMount } from 'svelte';
  import { getCharacter } from '../game/characters.js';
  import { t, displayName } from '../i18n.svelte.js';
  import { play } from '../game/audio.js';
  import { xpToNext, MAX_LEVEL } from '../game/constants.js';
  import SettingsButton from './SettingsButton.svelte';

  // results：房主送來的名次；you：自己的座位；mine：自己拿到的經驗值（{ feed, xp, character }）
  // title：曲名；level；actions：[{ label, action, primary }]（房主才有）
  let { results, you, mine = null, title, level, actions = [] } = $props();

  const me = $derived(results.find((r) => r.seat === you));
  const pad = (n) => String(n ?? 0).padStart(7, '0');
  const pct = (r) => Math.round(((r.p.dmg ?? 0) / Math.max(1, r.p.boss_max ?? 1)) * 100);
  const after = $derived(mine?.feed?.after);

  let box;
  onMount(() => box?.querySelector('button.primary')?.focus({ preventScroll: true }));
  function choose(a) {
    play('select');
    a.action();
  }
</script>

<section class="screen online-result">
  <div class="paper-bg"></div>
  <div class="watermark" aria-hidden="true">RESULT</div>
  <div class="corner"><SettingsButton /></div>
  <header>
    <h2 class="pop-text"><i class="bolt"></i>{t('連線成績')}</h2>
    <span class="en-sub">RESULT</span>
    <p class="song">{title} <i>/ {level.toUpperCase()}</i></p>
  </header>

  <div class="body">
    <div class="table">
      <div class="label">{t('技術分排名')}</div>
      <div class="row head">
        <span>{t('名次')}</span><span>{t('玩家')}</span><span>{t('技術分')}</span><span>{t('最大連擊')}</span><span>{t('魔王戰果')}</span>
      </div>
      <ol>
        {#each results as r (r.seat)}
          {@const c = getCharacter(r.character)}
          <li class="row" class:me={r.seat === you} class:out={r.out}>
            <span class="rank r{r.rank}">{r.rank}</span>
            <span class="who"><img src={c.portraits[r.rank === 1 ? 'win' : 'normal']} alt="" /><b>{displayName(r.name)}</b>{#if r.seat === you}<i class="you">{t('你')}</i>{/if}</span>
            <span class="num">{r.out ? '—' : pad(r.p.score)}</span>
            <span class="num">{r.out ? '—' : r.p.max_combo}</span>
            <span class="battle" class:down={r.p.killed}>{r.out ? t('棄權') : r.p.killed ? t('擊破') : `${pct(r)}%`}</span>
          </li>
        {/each}
      </ol>
      <p class="foot-note">{t('排名依技術分計算')}<br />{t('角色等級與魔王傷害不影響排名。')}</p>
    </div>

    <div class="mine" bind:this={box}>
      <div class="label">{t('本次演奏')}</div>
      {#if me}
        {@const c = getCharacter(me.character)}
        <div class="place"><b>{String(me.rank).padStart(2, '0')}</b><span>/ {results.length}</span><i class="grade">{me.p.rank}</i></div>
        <div class="who-big">
          <img src={c.portraits[me.p.killed ? 'win' : 'normal']} alt="" />
          <div>
            <p><b>{c.name}</b>{#if me.p.killed}<i class="tag">{t('魔王擊破')}</i>{/if}</p>
            {#if mine}
              <p class="exp">EXP <b>+{mine.xp}</b></p>
              <p class="lv">Lv.{mine.feed.before.lv}{#if mine.feed.levels > 0} → <b>Lv.{after.lv}</b>{/if}</p>
            {/if}
          </div>
        </div>
        {#if mine}<div class="gauge"><i style:width="{after.lv >= MAX_LEVEL ? 100 : (after.xp / xpToNext(after.lv)) * 100}%"></i></div>{/if}
      {:else}
        <p class="watch">{t('觀戰中')}</p>
      {/if}
      <div class="actions">
        {#if actions.length}
          {#each actions as a (a.label)}
            <button type="button" class="vbtn" class:primary={a.primary} onclick={() => choose(a)}>{a.label}</button>
          {/each}
        {:else}
          <div class="hint-bar">{t('等待房主決定下一步…')}</div>
        {/if}
      </div>
    </div>
  </div>
</section>

<style>
  .online-result {
    justify-content: flex-start;
    align-items: stretch;
    gap: 1.6cqh;
    padding: 3cqh 3cqw;
    background: #fff;
  }
  .watermark {
    position: absolute;
    right: 3cqw;
    top: 1cqh;
    font-size: 15cqh;
    font-weight: 900;
    font-style: italic;
    color: transparent;
    -webkit-text-stroke: 0.25cqh rgba(20, 80, 245, 0.12);
    pointer-events: none;
  }
  .corner {
    position: absolute;
    top: 2cqh;
    right: 3cqw;
    z-index: 2;
  }
  header {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: end;
    column-gap: 3cqw;
  }
  h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 1cqh;
    font-size: 8cqh;
    color: var(--navy);
  }
  .bolt {
    width: 3.4cqh;
    height: 7cqh;
    background: var(--accent);
    clip-path: polygon(55% 0, 70% 0, 45% 48%, 75% 48%, 30% 100%, 15% 100%, 40% 55%, 10% 55%);
  }
  header .en-sub {
    grid-row: 2;
    margin-left: 4.4cqh;
  }
  .song {
    grid-row: 1;
    grid-column: 2;
    margin: 0 0 1.6cqh;
    font-weight: 900;
    font-style: italic;
    font-size: 3cqh;
  }
  .song i {
    color: var(--accent);
  }
  .body {
    position: relative;
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr 34cqw;
    gap: 2cqw;
  }
  .label {
    font-weight: 900;
    font-size: 2.6cqh;
    padding-left: 1.2cqh;
    border-left: 0.6cqh solid var(--accent);
    margin-bottom: 1cqh;
  }
  .table,
  .mine {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: rgba(255, 255, 255, 0.92);
    border: var(--line) solid var(--sky-line);
    padding: 1.6cqh 1.6cqw;
    box-shadow: var(--soft-shadow);
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow: auto;
    min-height: 0;
    flex: 1;
  }
  .row {
    display: grid;
    grid-template-columns: 7cqh 1fr 12cqw 8cqw 8cqw;
    align-items: center;
    gap: 1cqw;
    padding: 0.5cqh 1cqw;
    border-bottom: var(--line) solid var(--sky-line);
    font-weight: 800;
    font-size: 2.3cqh;
  }
  .row.head {
    background: #eef3fb;
    font-size: 1.8cqh;
    color: var(--navy-soft);
  }
  .row.me {
    background: var(--accent);
    color: #fff;
  }
  .row.out {
    opacity: 0.55;
  }
  .rank {
    font-size: 3cqh;
    font-weight: 900;
    font-style: italic;
    text-align: center;
  }
  .rank.r1 {
    color: var(--gold-deep);
  }
  .me .rank {
    color: #fff;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 1cqw;
    min-width: 0;
  }
  .who img {
    width: 5cqh;
    height: 5cqh;
    object-fit: cover;
    object-position: center 15%;
    background: #e6ebf5;
  }
  .who b {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .you {
    font-style: normal;
    font-size: 1.5cqh;
    padding: 0 0.8cqh;
    background: #fff;
    color: var(--accent);
  }
  .num {
    font-style: italic;
    font-weight: 900;
  }
  .battle.down {
    color: var(--accent);
    font-weight: 900;
  }
  .me .battle.down {
    color: #fff;
  }
  .foot-note {
    margin: 1cqh 0 0;
    text-align: right;
    font-weight: 800;
    font-size: 1.8cqh;
    color: var(--muted);
  }
  .place {
    display: flex;
    align-items: baseline;
    gap: 1cqw;
  }
  .place b {
    font-size: 10cqh;
    font-weight: 900;
    font-style: italic;
    color: var(--navy);
    line-height: 1;
  }
  .place span {
    font-size: 3.4cqh;
    font-weight: 900;
    font-style: italic;
  }
  .grade {
    margin-left: auto;
    font-size: 9cqh;
    font-weight: 900;
    font-style: italic;
    background: linear-gradient(180deg, #ffe58a, #ffc83d 45%, #d98a0a);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .who-big {
    display: flex;
    gap: 1.4cqw;
    align-items: center;
    margin-top: 1cqh;
  }
  .who-big img {
    width: 12cqh;
    height: 12cqh;
    object-fit: cover;
    object-position: center 15%;
    background: #e6ebf5;
  }
  .who-big p {
    margin: 0;
    font-weight: 900;
    font-size: 2.6cqh;
  }
  .tag {
    margin-left: 1cqw;
    font-style: italic;
    font-size: 2cqh;
    padding: 0.2cqh 1.4cqh;
    background: var(--accent);
    color: #fff;
  }
  .exp b,
  .lv b {
    color: var(--accent);
  }
  .gauge {
    margin-top: 1cqh;
    height: 1.4cqh;
    background: #e6ebf5;
  }
  .gauge i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, #2fc6ff, var(--accent));
  }
  .watch {
    font-weight: 900;
    font-size: 3cqh;
    color: var(--muted);
  }
  .actions {
    margin-top: auto;
    display: flex;
    justify-content: flex-end;
    gap: 1cqw;
  }
</style>
