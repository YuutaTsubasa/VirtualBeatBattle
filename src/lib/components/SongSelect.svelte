<script>
  // 選擇曲目（art-work/rhythm-ui-concept-v1 的右上）：左邊編號的曲目列表（選到的那一列變藍；上面可以依來源遊戲篩選），
  // 右邊大圖、收錄自哪一款遊戲（那款遊戲的 Logo）、曲名、魔王、BPM／長度／6 KEY、難度、最佳成績；
  // 底部一條：角色（等級）、魔王（戰力推估）、電腦示範、開始演奏。
  // 每一首都是一隻魔王；魔王的血量是初始等級全 Perfect 打掉七成五（crates/beat-core/src/play.rs），
  // 「戰力推估」就是現在的等級全 Perfect 大約打得掉幾成。
  import { onMount, untrack } from 'svelte';
  import { SHOWN_TRACKS as TRACKS, LEVELS, SHOWN_GAMES as GAMES, gameOf, songOf, backgroundOf, bossOf } from '../game/tracks.js';
  import { WORLDS } from '../game/stages.js';
  import { getCharacter } from '../game/characters.js';
  import { levelOf, bestOf } from '../game/progress.js';
  import { atkOfLevel, xpToNext, MAX_LEVEL } from '../game/constants.js';
  import { sheetOf } from '../game/sheets.js';
  import { asset } from '../art-style.svelte.js';
  import { play } from '../game/audio.js';
  import { t } from '../i18n.svelte.js';
  import ScreenFrame from './ScreenFrame.svelte';
  import BackButton from './BackButton.svelte';
  import Logo from './Logo.svelte';
  import META from '../game/charts-meta.json' with { type: 'json' };

  // onstart({ song, level, demo })、onback()
  let { character, pick, onstart, onback } = $props();

  // 上次選的曲子現在不在清單裡（例如 PC-98 的曲子先藏起來了）就選第一首
  const firstPick = untrack(() => pick?.song);
  let songId = $state(TRACKS.some((tr) => tr.id === firstPick) ? firstPick : TRACKS[0].id);
  let level = $state(untrack(() => pick?.level) ?? 'normal');
  const c = $derived(getCharacter(character));
  const lv = $derived(levelOf(character));
  const track = $derived(TRACKS.find((tr) => tr.id === songId) ?? TRACKS[0]);
  const chartInfo = $derived(META[track.id]);
  const game = $derived(gameOf(track.game));
  // 依來源遊戲篩選（all = 全部）
  let filter = $state('all');
  // 排序（記在這台電腦）：default 收錄順序、asc／desc 照選到的難度的等級（低→高／高→低）、
  // all-asc／all-desc 把每一首的四個難度拆開、全部的譜面一起照等級排（點一列就同時選曲子和難度）
  const SORTS = ['default', 'asc', 'desc', 'all-asc', 'all-desc'];
  const SORT_LABEL = { default: '預設', asc: '等級 ↑', desc: '等級 ↓', 'all-asc': '全難度 ↑', 'all-desc': '全難度 ↓' };
  const allLevels = $derived(sort.startsWith('all-'));
  let sort = $state(loadSort());
  function loadSort() {
    try {
      const v = localStorage.getItem('vbb_song_sort');
      return SORTS.includes(v) ? v : 'default';
    } catch {
      return 'default';
    }
  }
  const ratingOf = (tr, lv = level) => META[tr.id]?.levels[lv]?.rating ?? 0;
  // 列表的每一列：{ key, tr, lv }（lv 是全難度排序時那一列的難度，其他時候是 null＝跟著上面選的難度）
  const shown = $derived.by(() => {
    const songs = filter === 'all' ? TRACKS : TRACKS.filter((tr) => tr.game === filter);
    let rows = allLevels ? songs.flatMap((tr) => LEVELS.map((l) => ({ key: `${tr.id}:${l.id}`, tr, lv: l.id }))) : songs.map((tr) => ({ key: tr.id, tr, lv: null }));
    if (sort === 'default') return rows;
    const k = sort.endsWith('asc') ? 1 : -1;
    const r = (row) => ratingOf(row.tr, row.lv ?? level);
    // 等級一樣的話照 BPM，再一樣就照收錄順序、難度順序
    const order = (row) => TRACKS.indexOf(row.tr) * 10 + (row.lv ? LEVELS.findIndex((l) => l.id === row.lv) : 0);
    return [...rows].sort((a, b) => k * (r(a) - r(b)) || k * (songOf(a.tr).bpm - songOf(b.tr).bpm) || order(a) - order(b));
  });

  function cycleSort() {
    play('move');
    sort = SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length];
    try {
      localStorage.setItem('vbb_song_sort', sort);
    } catch {
      // 存不了就算了
    }
    requestAnimationFrame(() => list?.querySelector('.song.sel')?.scrollIntoView({ block: 'nearest' }));
  }
  const best = $derived(bestOf(songId, level));
  // 現在的等級全 Perfect 大約打得掉魔王幾成（不算角色能力）
  const estimate = $derived(Math.round(75 * (atkOfLevel(lv.lv) / 100)));
  const minutes = (ms) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}`;
  const art = (tr) => asset(backgroundOf(tr));

  // 魔王：闖天下的魔王，或角色主題曲的對手角色
  const boss = $derived(bossOf(track, WORLDS));
  const bossName = $derived(boss.rival ? t(boss.name) + t('（對手）') : t(boss.name));

  function bossStyle(b) {
    const sheet = sheetOf(b.kind, b.key);
    if (!sheet) return '';
    const rows = Math.ceil(sheet.frames.length / sheet.cols);
    return `background-image: url(${asset(sheet.src)}); background-size: ${sheet.cols * 100}% ${rows * 100}%; background-position: 0 0`;
  }

  let list;
  onMount(() => list.querySelector('.song.sel')?.focus({ preventScroll: true }));

  function setFilter(id) {
    play('move');
    filter = id;
    // 選到的曲子不在篩選結果裡：改選這款遊戲的第一首
    if (id !== 'all' && track.game !== id) songId = TRACKS.find((tr) => tr.game === id).id;
    requestAnimationFrame(() => list?.querySelector('.song.sel')?.scrollIntoView({ block: 'nearest' }));
  }

  function choose(id, lv = null) {
    if (id !== songId || (lv && lv !== level)) play('move');
    songId = id;
    if (lv) level = lv;
  }

  function start(demo = false) {
    play('select');
    onstart({ song: songId, level, demo });
  }
</script>

<ScreenFrame title={t('選擇曲目')} en="SONG SELECT">
  <div class="pick">
    <div class="list-col">
      <div class="filters" role="tablist">
        <button type="button" class="sort" class:on={sort !== 'default'} onclick={cycleSort} title={t('排序')}>
          {t(SORT_LABEL[sort])}
        </button>
        <button type="button" role="tab" aria-selected={filter === 'all'} class:on={filter === 'all'} onclick={() => setFilter('all')}>{t('全部')} <i>{TRACKS.length}</i></button>
        {#each GAMES as g (g.id)}
          <button type="button" role="tab" aria-selected={filter === g.id} class:on={filter === g.id} onclick={() => setFilter(g.id)}>{t(g.short)}</button>
        {/each}
      </div>
      <div class="songs" bind:this={list}>
        {#each shown as row (row.key)}
          {@const tr = row.tr}
          {@const lv = row.lv ?? level}
          {@const b = bestOf(tr.id, lv)}
          <button type="button" class="song" class:sel={tr.id === songId && lv === level} onclick={() => choose(tr.id, row.lv)} onfocus={() => choose(tr.id, row.lv)} ondblclick={() => start()}>
            <span class="no">{String(TRACKS.indexOf(tr) + 1).padStart(2, '0')}</span>
            <img class="thumb" src={art(tr)} alt="" />
            <span class="names">
              <b>{t(tr.title)}</b>
              <small>{t('來自 {game}', { game: t(gameOf(tr.game).name) })}</small>
            </span>
            <span class="mark">
              {#if b?.ap}<i class="clear ap">AP</i>{:else if b?.fc}<i class="clear fc">FC</i>{/if}
              {#if b?.killed}<i class="down">{t('擊破')}</i>{/if}
              {#if b}<i class="rank">{b.rank}</i>{/if}
            </span>
            <span class="lvl {lv}">{#if row.lv}<small>{LEVELS.find((l) => l.id === lv).name.slice(0, 2)}</small>{/if}{ratingOf(tr, lv)}</span>
            <span class="bpm"><i class="eq"></i>{songOf(tr).bpm}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="detail">
      <div class="cover">
        <img src={art(track)} alt="" />
        <span class="boss-art" class:rival={boss.rival} style={bossStyle(boss)}></span>
      </div>
      <div class="info">
        <div class="from">
          <span>{t('收錄自')}</span>
          {#key game.id}
            {#if game.logo}<img src={asset(game.logo)} alt={t(game.name)} />{:else}<span class="own-logo"><Logo /></span>{/if}
          {/key}
        </div>
        <h3 class="pop-text">{t(track.title)}</h3>
        <p class="boss">BOSS {bossName}</p>
        <p class="meta">BPM <b>{songOf(track).bpm}</b><i></i><b>{minutes(chartInfo?.length_ms ?? 0)}</b><i></i><b>6 KEY</b></p>
        <div class="levels" role="radiogroup">
          {#each LEVELS as l (l.id)}
            <button type="button" role="radio" aria-checked={level === l.id} class="lv {l.id}" class:on={level === l.id} onclick={() => { play('move'); level = l.id; }}>
              {l.name}<b>{chartInfo?.levels[l.id].rating}</b>
            </button>
          {/each}
        </div>
        <span class="label">BEST SCORE</span>
        <p class="best">
          {best ? String(best.score).padStart(7, '0') : '0000000'}
          {#if best}<i class="rank">{best.rank}</i>{/if}
          {#if best?.ap}<i class="fc ap">ALL PERFECT</i>{:else if best?.fc}<i class="fc">FULL COMBO</i>{/if}
        </p>
        <span class="notes">{t('音符數')} {chartInfo?.levels[level].notes}</span>
      </div>
    </div>
  </div>

  {#snippet foot()}
    <BackButton onclick={onback} />
    <div class="bar">
      <div class="who">
        <img src={c.portraits.normal} alt="" />
        <span><b>{c.name}</b><small>Lv.{lv.lv}</small><i class="gauge"><i style:width="{lv.lv >= MAX_LEVEL ? 100 : (lv.xp / xpToNext(lv.lv)) * 100}%"></i></i></span>
      </div>
      <div class="who" title={t('全 Perfect 大約打掉魔王 {n}%', { n: estimate })}>
        <span class="boss-face" style={bossStyle(boss)}></span>
        <span>
          <b>{bossName}</b><small>{t('戰力推估')} {estimate}%</small>
          <i class="gauge red" class:ok={estimate >= 100}><i style:width="{Math.min(100, estimate)}%"></i></i>
        </span>
      </div>
      <button type="button" class="vbtn small demo" onclick={() => start(true)}>▶ {t('電腦示範')}</button>
      <button type="button" class="vbtn primary" onclick={() => start()}>{t('開始演奏')}</button>
    </div>
  {/snippet}
</ScreenFrame>

<style>
  .pick {
    flex: 1;
    display: grid;
    grid-template-columns: 40cqw 1fr;
    gap: 2.4cqw;
    min-height: 0;
  }
  .list-col {
    display: flex;
    flex-direction: column;
    gap: 0.8cqh;
    min-height: 0;
  }
  .filters {
    display: flex;
    gap: 0.3cqw;
  }
  .filters button {
    flex: 1;
    padding: 0.6cqh 0;
    border: none;
    background: #e6ebf5;
    color: var(--navy-soft);
    font-weight: 900;
    font-size: 1.9cqh;
    white-space: nowrap;
    clip-path: polygon(0.8cqh 0, 100% 0, calc(100% - 0.8cqh) 100%, 0 100%);
  }
  .filters button i {
    font-style: normal;
    opacity: 0.7;
  }
  .filters .sort {
    flex: 1.3;
    background: var(--navy);
    color: #fff;
  }
  .filters .sort.on {
    background: #c81e4a;
  }
  /* 這一首在選到的難度的等級 */
  .lvl {
    min-width: 4.4cqh;
    padding: 0.1cqh 0.6cqh;
    text-align: center;
    font-weight: 900;
    font-style: italic;
    font-size: 2.2cqh;
    background: #e6ebf5;
    color: var(--navy);
  }
  /* 每個難度的顏色：右邊的難度按鈕、全難度排序時等級前面的標示都用這個 */
  .easy {
    --lv-c: #1fb36b;
  }
  .normal {
    --lv-c: var(--accent);
  }
  .hard {
    --lv-c: #e08a12;
  }
  .expert {
    --lv-c: #c81e4a;
  }
  /* 全難度排序時，等級前面標難度 */
  .lvl small {
    font-size: 1.3cqh;
    margin-right: 0.4cqh;
    letter-spacing: 0;
    color: var(--lv-c);
  }
  .song.sel .lvl {
    background: #fff;
    color: var(--accent);
  }
  .filters button.on {
    background: var(--accent);
    color: #fff;
  }
  .songs {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden auto;
    background: rgba(255, 255, 255, 0.85);
    border: var(--line) solid var(--sky-line);
  }
  .song {
    display: grid;
    grid-template-columns: 4cqw 11cqh 1fr auto auto auto;
    align-items: center;
    gap: 1cqw;
    padding: 0.8cqh 1.2cqw;
    border: none;
    border-bottom: var(--line) solid var(--sky-line);
    background: transparent;
    text-align: left;
    color: var(--navy);
    flex: none;
    min-height: 8.6cqh;
  }
  .song:hover {
    background: #eef3ff;
  }
  .song.sel {
    background: var(--accent);
    color: #fff;
  }
  .no {
    font-weight: 900;
    font-style: italic;
    font-size: 2.4cqh;
    text-align: center;
  }
  .thumb {
    width: 11cqh;
    height: 6.6cqh;
    object-fit: cover;
    display: block;
  }
  .names {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .names b {
    font-size: 2.6cqh;
  }
  .names small {
    font-weight: 700;
    font-size: 1.6cqh;
    opacity: 0.75;
  }
  .mark {
    display: flex;
    gap: 0.4cqw;
  }
  .mark i {
    font-style: italic;
    font-weight: 900;
    font-size: 1.6cqh;
    padding: 0 0.8cqh;
    background: var(--navy);
    color: var(--gold);
  }
  /* Full Combo（藍）、All Perfect（金） */
  .mark .clear.fc {
    background: #2fc6ff;
    color: var(--navy);
  }
  .mark .clear.ap {
    background: linear-gradient(90deg, #ffb81c, #ffd84a);
    color: var(--navy);
  }
  .mark .down {
    background: var(--red);
    color: #fff;
  }
  .bpm {
    display: flex;
    align-items: center;
    gap: 0.6cqh;
    font-weight: 800;
    font-style: italic;
    font-size: 2cqh;
    opacity: 0.85;
  }
  .eq {
    width: 2.6cqh;
    height: 2cqh;
    background: repeating-linear-gradient(90deg, currentColor 0 0.35cqh, transparent 0.35cqh 0.65cqh);
    clip-path: polygon(0 60%, 15% 30%, 30% 70%, 45% 10%, 60% 50%, 75% 20%, 90% 60%, 100% 40%, 100% 100%, 0 100%);
  }

  .detail {
    display: grid;
    grid-template-columns: 40cqh 1fr;
    gap: 2.4cqw;
    align-items: start;
    min-height: 0;
  }
  .cover {
    position: relative;
    height: 42cqh;
    background: #fff;
    padding: 0.8cqh;
    box-shadow: var(--soft-shadow);
  }
  .cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  /* 對手角色：紅色的光 */
  .boss-art.rival {
    filter: drop-shadow(0 0 1cqh rgba(255, 60, 90, 0.85));
  }
  .boss-art {
    position: absolute;
    right: -3cqh;
    bottom: -2cqh;
    width: 28cqh;
    height: 28cqh;
    background-repeat: no-repeat;
    transform: scaleX(-1);
    filter: drop-shadow(0 0.6cqh 1cqh rgba(0, 0, 0, 0.35));
  }
  .info {
    display: flex;
    flex-direction: column;
    gap: 0.6cqh;
  }
  /* 收錄自哪一款遊戲：那款遊戲的 Logo */
  .from {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2cqh;
    margin-bottom: 0.6cqh;
  }
  .from span {
    font-weight: 900;
    font-size: 1.6cqh;
    letter-spacing: 0.2em;
    color: var(--muted);
  }
  .from img {
    height: 11cqh;
    max-width: 100%;
    object-fit: contain;
    filter: drop-shadow(0 0.4cqh 0.6cqh rgba(16, 40, 110, 0.2));
    animation: logo-in 0.25s ease-out;
  }
  /* 本作的原創曲：用字排的 Logo */
  .own-logo {
    display: block;
    width: 30cqh;
    animation: logo-in 0.25s ease-out;
  }
  @keyframes logo-in {
    from {
      opacity: 0;
      translate: 2cqw 0;
    }
  }
  h3 {
    margin: 0;
    font-size: 6.4cqh;
    color: var(--navy);
  }
  .boss,
  .meta {
    margin: 0;
    font-weight: 800;
    font-size: 2.1cqh;
  }
  .boss {
    color: var(--red);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: 1.2cqh;
    color: var(--navy);
  }
  .meta i {
    width: 0.2cqh;
    height: 2.2cqh;
    background: var(--sky-line);
  }
  .levels {
    display: flex;
    gap: 0.4cqw;
    margin: 1.4cqh 0;
  }
  .lv {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1cqh;
    padding: 1cqh 0;
    border: none;
    background: #e6ebf5;
    color: var(--navy-soft);
    font-weight: 900;
    font-size: 1.6cqh;
    letter-spacing: 0.04em;
    gap: 0.6cqh;
  }
  .lv b {
    font-size: 2.4cqh;
    font-style: italic;
    color: var(--lv-c);
  }
  .lv {
    box-shadow: inset 0 -0.4cqh 0 var(--lv-c);
  }
  .lv.on {
    background: var(--lv-c);
    color: #fff;
  }
  .lv.on b {
    color: #fff;
  }
  .label {
    font-weight: 900;
    font-size: 1.9cqh;
    letter-spacing: 0.15em;
    color: var(--navy-soft);
  }
  .best {
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 1.4cqw;
    font-size: 6cqh;
    font-weight: 900;
    font-style: italic;
    letter-spacing: 0.04em;
    color: var(--navy);
  }
  .best .rank {
    font-size: 3.4cqh;
    color: var(--gold-deep);
  }
  .best .fc.ap {
    background: linear-gradient(90deg, #ffb81c, #ffd84a);
    color: var(--navy);
  }
  .best .fc {
    font-size: 1.8cqh;
    padding: 0.2cqh 1cqh;
    background: var(--accent);
    color: #fff;
  }
  .notes {
    font-weight: 800;
    font-size: 1.9cqh;
    color: var(--muted);
  }

  /* 底部一條 */
  .bar {
    grid-column: 2 / -1;
    display: flex;
    align-items: center;
    gap: 1.6cqw;
    justify-content: flex-end;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 1cqw;
    padding-right: 1.4cqw;
    border-right: var(--line) solid var(--sky-line);
  }
  .who img,
  .boss-face {
    width: 7cqh;
    height: 7cqh;
    object-fit: cover;
    object-position: center 15%;
    background-color: #e6ebf5;
  }
  .boss-face {
    background-repeat: no-repeat;
    transform: scaleX(-1);
  }
  .who > span {
    display: grid;
    grid-template-columns: auto auto;
    column-gap: 1cqh;
    align-items: baseline;
  }
  .who b {
    font-size: 2.4cqh;
  }
  .who small {
    font-weight: 800;
    font-size: 1.8cqh;
    color: var(--navy-soft);
  }
  .gauge {
    grid-column: 1 / -1;
    width: 13cqw;
    height: 0.9cqh;
    margin-top: 0.4cqh;
    background: #e6ebf5;
    clip-path: polygon(0.4cqh 0, 100% 0, calc(100% - 0.4cqh) 100%, 0 100%);
  }
  .gauge i {
    display: block;
    height: 100%;
    background: var(--accent);
  }
  .gauge.red i {
    background: var(--red);
  }
  .gauge.red.ok i {
    background: var(--ok);
  }
  .demo {
    min-height: 7cqh;
  }
</style>
