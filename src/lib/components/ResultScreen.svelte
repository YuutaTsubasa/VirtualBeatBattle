<script>
  // 單機打完的結算：疊在遊戲畫面上。左邊角色（打倒魔王擺勝利姿勢、輸了是被打的樣子），右邊結算牌：
  // 評價（SSS～D）、技術分、判定次數、最大連擊、魔王戰的結果（打掉幾成），以及經驗值與升級。
  import { onMount } from 'svelte';
  import { t } from '../i18n.svelte.js';
  import { play } from '../game/audio.js';
  import { atkOfLevel, xpToNext, MAX_LEVEL } from '../game/constants.js';
  import SpritePose from './SpritePose.svelte';

  // result：App 的 onEnd 組好的結果；actions：[{ label, action, primary }]
  let { result, actions, demo = false } = $props();

  const pad = (n) => String(n).padStart(7, '0');
  const after = $derived(result.feed?.after);
  const xpPct = $derived(after ? (after.lv >= MAX_LEVEL ? 100 : (after.xp / xpToNext(after.lv)) * 100) : 0);

  let box;
  onMount(() => box.querySelector('button')?.focus({ preventScroll: true }));
  function choose(a) {
    play('select');
    a.action();
  }
</script>

<section class="screen overlay result-screen">
  <div class="pose" class:down={!result.killed}>
    <SpritePose character={result.character} pose={result.killed ? 'win' : 'hurt'} size="62cqh" />
  </div>

  <div class="sheet panel" bind:this={box}>
    <h2 class="pop-text" class:fail={!result.killed}>{result.killed ? t('擊破！') : t('魔王逃走了…')}</h2>
    <div class="stage">{result.title} ・ {result.level.toUpperCase()}</div>

    <div class="grade">
      <b class="rank r-{result.rank}">{result.rank}</b>
      <div class="score">
        <span>SCORE</span>
        <b>{pad(result.score)}</b>
        {#if result.fc}<i class="fc">FULL COMBO</i>{/if}
      </div>
    </div>

    <div class="counts">
      <span class="p">PERFECT <b>{result.counts[0]}</b></span>
      <span class="g">GREAT <b>{result.counts[1]}</b></span>
      <span class="d">GOOD <b>{result.counts[2]}</b></span>
      <span class="m">MISS <b>{result.counts[3]}</b></span>
      <span>MAX COMBO <b>{result.maxCombo}</b></span>
    </div>

    <div class="boss">
      <span>{t('對魔王的傷害')}</span>
      <div class="hp"><i style:width="{Math.min(100, result.dmgPct)}%"></i></div>
      <b>{result.dmgPct}%</b>
    </div>

    {#if result.feed && !demo}
      <div class="xp-row">
        <span>{t('經驗值')} <b>+{result.xp}</b></span>
        <span class="lv">Lv.{result.feed.before.lv}{#if result.feed.levels > 0} → <b>Lv.{after.lv}</b>{/if}</span>
      </div>
      <div class="xp"><i style:width="{xpPct}%"></i></div>
      {#if result.feed.levels > 0}<p class="record">{t('升級了！攻擊力 {a} → {b}', { a: atkOfLevel(result.feed.before.lv), b: atkOfLevel(after.lv) })}</p>{/if}
    {/if}
    {#if result.record && !demo}<p class="record">{t('新紀錄！')}</p>{/if}
    {#if result.unlocked}<p class="record">{t('隱藏角色「阿翼」加入了！')}</p>{/if}
    <p class="line">「{result.line}」</p>

    {#each actions.filter((a) => a.primary) as a (a.label)}
      <button type="button" class="vbtn primary main" onclick={() => choose(a)}>{a.label}</button>
    {/each}
    <div class="more">
      {#each actions.filter((a) => !a.primary) as a (a.label)}
        <button type="button" class="vbtn small" onclick={() => choose(a)}>{a.label}</button>
      {/each}
    </div>
  </div>
</section>

<style>
  .result-screen {
    flex-direction: row;
    justify-content: center;
    gap: 2cqw;
    background: linear-gradient(90deg, rgba(10, 12, 30, 0.2), rgba(10, 12, 30, 0.65));
  }
  .pose {
    align-self: flex-end;
    margin-bottom: -2cqh;
    animation: run-in 0.4s ease-out;
  }
  .pose.down {
    filter: saturate(0.6);
  }
  @keyframes run-in {
    from {
      transform: translateX(-8cqw);
      opacity: 0;
    }
  }
  .sheet {
    width: 48cqw;
    padding: 0 3cqw 2cqh;
    align-items: center;
    gap: 0.9cqh;
    border-radius: 3.4cqh;
    margin-top: 7cqh;
  }
  h2 {
    margin: -5.4cqh 0 0;
    font-size: 9cqh;
    color: var(--accent);
  }
  h2.fail {
    color: var(--teal);
    font-size: 7.4cqh;
    margin-top: -4cqh;
  }
  .stage {
    padding: 0.2cqh 3cqh;
    border: 0.3cqh solid var(--teal);
    border-radius: 999px;
    font-weight: 900;
    font-size: 2.2cqh;
    color: var(--teal);
  }
  .grade {
    display: flex;
    align-items: center;
    gap: 2cqw;
  }
  .rank {
    font-size: 11cqh;
    line-height: 1;
    font-weight: 900;
    font-style: italic;
    color: var(--gold);
    -webkit-text-stroke: 0.5cqh var(--navy);
    animation: pop 0.5s cubic-bezier(0.3, 1.6, 0.6, 1);
  }
  .rank.r-C,
  .rank.r-D {
    color: #9bb5c2;
  }
  @keyframes pop {
    from {
      transform: scale(2.2);
      opacity: 0;
    }
  }
  .score {
    display: flex;
    flex-direction: column;
    font-weight: 900;
  }
  .score span {
    font-size: 1.8cqh;
    color: var(--navy-soft);
    letter-spacing: 0.2em;
  }
  .score b {
    font-size: 6cqh;
    line-height: 1;
    color: var(--navy);
    letter-spacing: 0.06em;
  }
  .fc {
    font-style: normal;
    color: var(--accent);
    font-size: 2cqh;
  }
  .counts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4cqh 1.4cqw;
    font-weight: 900;
    font-size: 1.9cqh;
  }
  .counts b {
    font-size: 2.4cqh;
    color: var(--navy);
  }
  .counts .p {
    color: #c79a00;
  }
  .counts .g {
    color: #1f8fbf;
  }
  .counts .d {
    color: #3a9a3a;
  }
  .counts .m {
    color: #d94b5b;
  }
  .boss {
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 1cqw;
    font-weight: 900;
    font-size: 2.1cqh;
  }
  .hp,
  .xp {
    height: 1.6cqh;
    border-radius: 999px;
    background: color-mix(in srgb, var(--navy) 16%, transparent);
    overflow: hidden;
  }
  .hp i,
  .xp i {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 0.8s ease-out;
  }
  .xp {
    width: 100%;
  }
  .xp i {
    background: var(--gold);
  }
  .xp-row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    font-weight: 900;
    font-size: 2.2cqh;
  }
  .xp-row b {
    color: var(--accent);
  }
  .record {
    margin: 0;
    font-weight: 900;
    color: var(--accent);
    font-size: 2.4cqh;
  }
  .line {
    margin: 0;
    font-weight: 800;
    font-size: 2.2cqh;
    color: var(--navy-soft);
  }
  .main {
    min-width: 24cqw;
  }
  .more {
    display: flex;
    gap: 1cqw;
  }
</style>
