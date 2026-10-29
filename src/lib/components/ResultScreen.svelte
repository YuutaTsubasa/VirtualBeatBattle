<script>
  // 演奏結果（art-work/rhythm-ui-concept-v1 的右下）：左邊「演奏結果」標籤、金色大評價（SSS～D）、新紀錄、
  // 技術分、最大連擊、Full Combo、判定次數；右邊「魔王戰果」：擊破成功／魔王逃走、造成傷害、角色升級與經驗值。
  import { onMount } from 'svelte';
  import { t } from '../i18n.svelte.js';
  import { play } from '../game/audio.js';
  import { atkOfLevel, xpToNext, MAX_LEVEL } from '../game/constants.js';
  import { sheetOf } from '../game/sheets.js';
  import { asset } from '../art-style.svelte.js';
  import SettingsButton from './SettingsButton.svelte';
  import { formatRating, ratingTier } from '../game/rating.js';

  // result：App 的 onEnd 組好的結果；actions：[{ label, action, primary }]
  let { result, actions, demo = false } = $props();

  const pad = (n) => String(n).padStart(7, '0');
  const after = $derived(result.feed?.after);
  const xpPct = $derived(after ? (after.lv >= MAX_LEVEL ? 100 : (after.xp / xpToNext(after.lv)) * 100) : 0);
  const boss = $derived.by(() => {
    const sheet = sheetOf(result.boss.kind, result.boss.key);
    if (!sheet) return '';
    const rows = Math.ceil(sheet.frames.length / sheet.cols);
    const i = Math.max(0, sheet.frames.indexOf(result.killed ? 'down' : 'idle'));
    const col = i % sheet.cols;
    const row = Math.floor(i / sheet.cols);
    return `background-image: url(${asset(sheet.src)}); background-size: ${sheet.cols * 100}% ${rows * 100}%; background-position: ${(col / (sheet.cols - 1)) * 100}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`;
  });

  let box;
  onMount(() => box.querySelector('button.primary')?.focus({ preventScroll: true }));
  function choose(a) {
    play('select');
    a.action();
  }
</script>

<section class="screen result-screen">
  <div class="paper-bg"></div>
  <div class="corner"><SettingsButton /></div>
  <div class="left">
    <div class="tag"><b>{t('演奏結果')}</b><small class="en-sub">RESULT</small></div>
    <p class="song">{result.title} <i>/ {result.level.toUpperCase()}</i></p>
    <div class="grade">
      <b class="rank r-{result.rank}">{result.rank}</b>
      <div class="score">
        {#if result.record && !demo}<span class="new">{t('新紀錄')}</span>{/if}
        <b>{pad(result.score)}</b>
        <span class="mc">MAX COMBO <b>{result.maxCombo}</b>{#if result.ap}<i class="fc ap">ALL PERFECT</i>{:else if result.fc}<i class="fc">FULL COMBO</i>{/if}</span>
        <!-- 這一次的譜面 Rating、玩家 Rating 前後（電腦示範不算） -->
        {#if result.rating && !demo}
          {@const gain = result.rating.after - result.rating.before}
          <span class="rt">
            {t('這個譜面')} <b>{formatRating(result.rating.chart)}</b>
            <i></i>RATING <b class="tier-{ratingTier(result.rating.after)}">{formatRating(result.rating.after)}</b>
            {#if gain >= 0.005}<em>+{formatRating(gain)}</em>{/if}
          </span>
        {/if}
      </div>
    </div>
    <dl class="counts">
      <dt class="p">PERFECT</dt><dd>{result.counts[0]}</dd>
      <dt class="g">GREAT</dt><dd>{result.counts[1]}</dd>
      <dt class="d">GOOD</dt><dd>{result.counts[2]}</dd>
      <dt class="m">MISS</dt><dd>{result.counts[3]}</dd>
    </dl>
  </div>

  <div class="right" bind:this={box}>
    <span class="boss-art" class:down={result.killed} style={boss}></span>
    <div class="battle">
      <b class="head">{t('魔王戰果')}</b><small class="en-sub">BATTLE RESULT</small>
      <p class="verdict" class:fail={!result.killed}>{result.killed ? t('擊破成功') : t('魔王逃走了…')}</p>
      <span class="label">{t('造成傷害')}</span>
      <div class="dmg"><div class="gauge"><i style:width="{Math.min(100, result.dmgPct)}%"></i></div><b>{result.dmgPct}%</b></div>
    </div>

    {#if result.feed && !demo}
      <div class="me">
        <img src={result.character.portraits[result.killed ? 'win' : 'normal']} alt="" />
        <div class="me-info">
          <p><b>{result.character.name}</b> Lv.{result.feed.before.lv}{#if result.feed.levels > 0} <span class="arrow">→</span> <b class="up">Lv.{after.lv}</b>{/if}</p>
          <div class="exp"><span>EXP</span><div class="gauge gold"><i style:width="{xpPct}%"></i></div><b>+{result.xp}</b></div>
          {#if result.feed.levels > 0}<small>{t('升級了！攻擊力 {a} → {b}', { a: atkOfLevel(result.feed.before.lv), b: atkOfLevel(after.lv) })}</small>{/if}
        </div>
      </div>
    {/if}
    {#if result.unlocked}<p class="unlock">{t('隱藏角色「阿翼」加入了！')}</p>{/if}
    <p class="line">「{result.line}」</p>

    <div class="actions">
      {#each actions.filter((a) => !a.primary) as a (a.label)}
        <button type="button" class="vbtn small" onclick={() => choose(a)}>{a.label}</button>
      {/each}
      {#each actions.filter((a) => a.primary) as a (a.label)}
        <button type="button" class="vbtn primary" onclick={() => choose(a)}>{a.label}</button>
      {/each}
    </div>
  </div>
</section>

<style>
  .result-screen {
    flex-direction: row;
    align-items: stretch;
    justify-content: stretch;
    gap: 0;
    background: var(--paper-white);
  }
  .corner {
    position: absolute;
    top: 2cqh;
    right: 3cqw;
    z-index: 2;
  }
  .left {
    position: relative;
    width: 50cqw;
    padding: 4cqh 3cqw 4cqh 0;
    display: flex;
    flex-direction: column;
    gap: 1.4cqh;
  }
  .tag {
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    padding: 1.4cqh 6cqw 1.4cqh 4cqw;
    background: var(--accent);
    color: var(--on-dark);
    clip-path: polygon(0 0, 100% 0, calc(100% - 4cqh) 100%, 0 100%);
  }
  .tag b {
    font-size: 6.4cqh;
    font-style: italic;
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1.1;
  }
  .song {
    margin: 0 0 0 4cqw;
    font-weight: 900;
    font-size: 2.6cqh;
    color: var(--navy);
  }
  .song i {
    color: var(--accent);
  }
  .grade {
    display: flex;
    align-items: center;
    gap: 2cqw;
    margin-left: 4cqw;
  }
  .rank {
    font-size: 22cqh;
    line-height: 0.9;
    font-weight: 900;
    font-style: italic;
    letter-spacing: -0.04em;
    /* 斜體的字會超出右邊的框，漸層（background-clip: text）只畫在框裡：右邊多留一點 */
    padding: 0 0.22em 0 0.04em;
    background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 55%, var(--paper-white)) 0%, var(--gold) 45%, var(--gold-deep) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 0.6cqh 0 rgba(150, 90, 0, 0.35));
    animation: pop 0.5s cubic-bezier(0.3, 1.6, 0.6, 1);
  }
  .rank.r-C,
  .rank.r-D {
    background: linear-gradient(180deg, var(--muted-line), var(--muted-text));
    -webkit-background-clip: text;
    background-clip: text;
  }
  @keyframes pop {
    from {
      transform: scale(2);
      opacity: 0;
    }
  }
  .score {
    display: flex;
    flex-direction: column;
    gap: 0.4cqh;
  }
  .new {
    align-self: flex-start;
    padding: 0.2cqh 2.4cqh;
    background: var(--accent);
    color: var(--on-dark);
    font-weight: 900;
    font-style: italic;
    font-size: 2.2cqh;
    clip-path: polygon(1cqh 0, 100% 0, calc(100% - 1cqh) 100%, 0 100%);
  }
  .score > b {
    font-size: 9cqh;
    font-weight: 900;
    font-style: italic;
    letter-spacing: 0.04em;
    line-height: 1;
    color: var(--navy);
  }
  .mc {
    display: flex;
    align-items: center;
    gap: 1cqw;
    font-weight: 900;
    font-size: 2.2cqh;
  }
  .mc b {
    font-size: 3.2cqh;
    font-style: italic;
  }
  .rt {
    display: flex;
    align-items: baseline;
    gap: 0.8cqw;
    font-weight: 900;
    font-size: 1.9cqh;
    color: var(--navy-soft);
  }
  .rt b {
    font-size: 2.8cqh;
    font-style: italic;
    color: var(--navy);
  }
  .rt i {
    width: var(--line);
    height: 2cqh;
    margin: 0 0.6cqw;
    align-self: center;
    background: var(--sky-line);
  }
  .rt em {
    font-style: normal;
    font-size: 2.2cqh;
    color: var(--ok);
  }
  .rt .tier-green {
    color: var(--ok);
  }
  .rt .tier-orange {
    color: var(--gold-deep);
  }
  .rt .tier-red {
    color: var(--danger);
  }
  .rt .tier-purple {
    color: #8a3ad6;
  }
  .fc {
    padding: 0.2cqh 1.2cqh;
    background: var(--accent);
    color: var(--on-dark);
    font-size: 1.7cqh;
  }
  .fc.ap {
    background: linear-gradient(90deg, var(--gold), var(--gold));
    color: var(--navy);
  }
  .counts {
    margin: 1cqh 0 0 20cqw;
    display: grid;
    grid-template-columns: 1fr auto;
    row-gap: 0.6cqh;
    width: 24cqw;
    font-weight: 900;
    font-style: italic;
    font-size: 2.6cqh;
  }
  .counts dt,
  .counts dd {
    margin: 0;
    padding-bottom: 0.4cqh;
    border-bottom: var(--line) solid var(--sky-line);
  }
  .counts dd {
    text-align: right;
    color: var(--navy);
  }
  .counts .p {
    color: var(--sky);
  }
  .counts .g {
    color: var(--accent);
  }
  .counts .d {
    color: var(--ok);
  }
  .counts .m {
    color: var(--red);
  }

  .right {
    position: relative;
    flex: 1;
    margin: 6cqh 3cqw 4cqh 0;
    padding: 5cqh 3cqw 3cqh;
    background: color-mix(in srgb, var(--paper-white) 92%, transparent);
    border-left: 0.6cqh solid var(--accent);
    box-shadow: var(--soft-shadow);
    display: flex;
    flex-direction: column;
    gap: 1.6cqh;
  }
  .boss-art {
    position: absolute;
    right: -1cqw;
    top: -6cqh;
    width: 34cqh;
    height: 34cqh;
    background-repeat: no-repeat;
    transform: scaleX(-1);
    opacity: 0.85;
    pointer-events: none;
  }
  .battle {
    display: flex;
    flex-direction: column;
    gap: 0.4cqh;
  }
  .head {
    font-size: 4.4cqh;
    font-style: italic;
    font-weight: 900;
    color: var(--navy);
  }
  .verdict {
    margin: 1cqh 0;
    font-size: 6cqh;
    font-weight: 900;
    font-style: italic;
    color: var(--accent);
  }
  .verdict.fail {
    color: var(--navy-soft);
    font-size: 5cqh;
  }
  .label {
    font-weight: 900;
    font-size: 2.2cqh;
  }
  .dmg,
  .exp {
    display: flex;
    align-items: center;
    gap: 1.2cqw;
    font-weight: 900;
    font-size: 2.4cqh;
  }
  .gauge {
    flex: 1;
    height: 1.6cqh;
    background: var(--sky-pale);
    clip-path: polygon(0.8cqh 0, 100% 0, calc(100% - 0.8cqh) 100%, 0 100%);
  }
  .gauge i {
    display: block;
    height: 100%;
    background: repeating-linear-gradient(115deg, var(--accent) 0 3cqh, var(--accent) 3cqh 3.6cqh);
    transition: width 0.8s ease-out;
  }
  .gauge.gold i {
    background: linear-gradient(90deg, var(--sky), var(--accent));
  }
  .me {
    display: flex;
    gap: 1.6cqw;
    align-items: center;
    margin-top: 1cqh;
  }
  .me img {
    width: 13cqh;
    height: 13cqh;
    object-fit: cover;
    object-position: center 15%;
    background: var(--sky-pale);
  }
  .me-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.6cqh;
  }
  .me-info p {
    margin: 0;
    font-weight: 900;
    font-size: 2.6cqh;
  }
  .me-info .up {
    font-size: 3.4cqh;
    color: var(--accent);
  }
  .arrow {
    color: var(--muted);
  }
  .exp b {
    color: var(--accent);
  }
  .me-info small {
    font-weight: 800;
    font-size: 1.9cqh;
    color: var(--accent);
  }
  .unlock {
    margin: 0;
    font-weight: 900;
    color: var(--red);
    font-size: 2.4cqh;
  }
  .line {
    margin: 0;
    font-weight: 800;
    font-size: 2.1cqh;
    color: var(--navy-soft);
  }
  .actions {
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 1cqw;
  }

  /* 直式：上面評價與判定數，下面魔王戰果與按鈕 */
  @container stage (aspect-ratio < 1) {
    .result-screen {
      flex-direction: column;
    }
    .corner {
      top: 1.4cqh;
      right: 4cqw;
    }
    .left {
      width: 100%;
      padding: 2cqh 0 0;
      gap: 0.8cqh;
    }
    .tag {
      padding: 1cqh 10cqw 1cqh 5cqw;
      clip-path: polygon(0 0, 100% 0, calc(100% - 2.4cqh) 100%, 0 100%);
    }
    .tag b {
      font-size: 3.8cqh;
    }
    .song {
      margin-left: 5cqw;
      font-size: 1.9cqh;
    }
    .grade {
      margin-left: 5cqw;
      gap: 4cqw;
    }
    .rank {
      font-size: 11cqh;
    }
    .new {
      font-size: 1.5cqh;
    }
    .score > b {
      font-size: 5cqh;
    }
    .mc {
      font-size: 1.5cqh;
      gap: 2cqw;
      flex-wrap: wrap;
    }
    .mc b {
      font-size: 2.2cqh;
    }
    .fc {
      font-size: 1.2cqh;
    }
    .counts {
      margin: 0 5cqw;
      width: auto;
      grid-template-columns: 1fr auto 1fr auto;
      column-gap: 4cqw;
      font-size: 1.9cqh;
    }
    .right {
      flex: 1;
      min-height: 0;
      margin: 1.4cqh 4cqw 1.6cqh;
      padding: 1.8cqh 4cqw 1.4cqh;
      gap: 1cqh;
    }
    .boss-art {
      width: 15cqh;
      height: 15cqh;
      top: -3cqh;
    }
    .head {
      font-size: 2.6cqh;
    }
    .verdict {
      font-size: 3.6cqh;
    }
    .verdict.fail {
      font-size: 3cqh;
    }
    .label {
      font-size: 1.5cqh;
    }
    .dmg,
    .exp {
      font-size: 1.8cqh;
      gap: 3cqw;
    }
    .gauge {
      height: 1.1cqh;
    }
    .me {
      gap: 3cqw;
    }
    .me img {
      width: 8cqh;
      height: 8cqh;
    }
    .me-info p {
      font-size: 1.9cqh;
    }
    .me-info .up {
      font-size: 2.4cqh;
    }
    .me-info small {
      font-size: 1.4cqh;
    }
    .unlock {
      font-size: 1.8cqh;
    }
    .line {
      font-size: 1.6cqh;
    }
    .actions {
      justify-content: center;
      gap: 1cqh 2cqw;
    }
  }
</style>
