<script>
  // 標題畫面（art-work/rhythm-ui-concept-v1 的左上）：左邊 Logo、大大的藍色「單人演奏」、開設／加入房間兩張卡、
  // 操作說明與設定兩個小連結；右邊斜切的天空都市，角色伸手出來，一句手寫的標語。
  // 有正式的標題主視覺（ui/title-scene）就用插圖，沒有就用白色都市的背景＋角色半身像。
  import { onMount } from 'svelte';
  import { asset } from '../art-style.svelte.js';
  import { getCharacter } from '../game/characters.js';
  import { play } from '../game/audio.js';
  import { ui } from '../ui.svelte.js';
  import { t } from '../i18n.svelte.js';
  import Logo from './Logo.svelte';
  import ControlHint from './ControlHint.svelte';

  // items：[單人演奏, 開設房間, 加入房間, 操作說明, 設定]
  let { items } = $props();

  const scene = $derived(asset('ui/title-scene.webp'));
  const hero = getCharacter('xiaocui');
  const EN = ['SOLO PLAY', 'CREATE ROOM', 'JOIN ROOM'];

  let nav;
  onMount(() => nav.querySelector('button')?.focus({ preventScroll: true }));

  function choose(item) {
    play('select');
    item.action();
  }
  const moved = () => (ui.input === 'key' || ui.input === 'pad') && play('move');
</script>

{#snippet icon(kind)}
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {#if kind === 1}
      <!-- 一群人 -->
      <circle cx="8" cy="8" r="3" /><circle cx="16.5" cy="8.5" r="2.5" />
      <path d="M2 19c0-3.3 2.7-6 6-6s6 2.7 6 6zM13.5 19c.2-2.2-.6-3.8-1.6-5 .9-.6 2-1 3.1-1 2.8 0 5 2.2 5 5v1z" />
    {:else}
      <!-- 一個人＋加號 -->
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2 20c0-3.6 3.1-6.4 7-6.4 1.4 0 2.7.4 3.8 1-1 1.1-1.6 2.6-1.6 4.2V20z" />
      <path d="M17 13v3h-3v2h3v3h2v-3h3v-2h-3v-3z" />
    {/if}
  </svg>
{/snippet}

<section class="screen title">
  <div class="paper-bg"></div>
  <div class="art">
    {#if scene}
      <img class="scene-img" src={scene} alt="" />
    {:else}
      <img class="scene-img" src={asset('stages/city-1/far.webp')} alt="" />
      <img class="hero" src={hero.portraits.happy} alt="" />
    {/if}
    <p class="tagline">{t('用音樂')}<br />{t('讓世界再次共鳴')}</p>
  </div>

  <div class="side">
    <div class="logo-box"><Logo size="big" /></div>

    <nav class="menu" bind:this={nav}>
      <button type="button" class="solo" onfocus={moved} onclick={() => choose(items[0])}>
        <span class="play"></span>
        <span class="label"><b>{items[0].label}</b><small class="en-sub">{EN[0]}</small></span>
        <span class="eq" aria-hidden="true">{#each [3, 5, 4, 7, 6, 9, 5, 8, 6, 10, 7] as h, i (i)}<i style:height="{h * 10}%"></i>{/each}</span>
      </button>
      <div class="rooms">
        {#each items.slice(1, 3) as item, i (item.label)}
          <button type="button" class="room" onfocus={moved} onclick={() => choose(item)}>
            <span class="ic">{@render icon(i + 1)}</span>
            <span class="label"><b>{item.label}</b><small class="en-sub">{EN[i + 1]}</small></span>
          </button>
        {/each}
      </div>
      <div class="tools">
        {#each items.slice(3) as item, i (item.label)}
          <button type="button" class="tool" onfocus={moved} onclick={() => choose(item)}>
            <span class="tool-ic">{i === 0 ? '?' : '⚙'}</span>{item.label}
          </button>
        {/each}
      </div>
    </nav>
  </div>
  <div class="foot"><ControlHint /></div>
</section>

<style>
  .title {
    justify-content: flex-start;
    align-items: stretch;
    background: var(--paper-white);
  }
  /* 右邊斜切的插圖區 */
  .art {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 62cqw;
    clip-path: polygon(22% 0, 100% 0, 100% 100%, 0 100%);
    overflow: hidden;
    background: linear-gradient(180deg, var(--sky), var(--sky-light));
  }
  .scene-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .hero {
    position: absolute;
    right: 2cqw;
    bottom: 0;
    height: 84cqh;
    filter: drop-shadow(0 1cqh 2cqh color-mix(in srgb, var(--navy) 35%, transparent));
  }
  .tagline {
    position: absolute;
    left: 24%;
    bottom: 8cqh;
    margin: 0;
    font-family: 'Klee One', 'Yu Gothic', var(--font);
    font-style: italic;
    font-weight: 700;
    font-size: 3.8cqh;
    line-height: 1.5;
    color: var(--accent);
    text-shadow: 0 0 1cqh var(--paper-white), 0 0 2cqh var(--paper-white);
    rotate: -8deg;
  }
  /* 白色的那一邊：從右往左淡出到插圖上 */
  .side {
    position: relative;
    width: 50cqw;
    height: 100%;
    padding: 6cqh 0 0 4cqw;
  }
  .logo-box {
    width: 40cqw;
  }
  .menu {
    position: absolute;
    left: 4cqw;
    top: 36cqh;
    display: flex;
    flex-direction: column;
    gap: 2.6cqh;
    width: 42cqw;
  }
  .menu button {
    font: inherit;
    border: none;
    cursor: pointer;
  }
  /* 大大的藍色「單人演奏」：斜切的方塊、右下角跳動的等化器 */
  .solo {
    position: relative;
    display: flex;
    align-items: center;
    gap: 3cqw;
    height: 21cqh;
    padding: 0 4cqw 0 6cqw;
    background: linear-gradient(105deg, var(--accent) 0%, var(--accent) 70%, var(--accent2) 100%);
    color: var(--on-dark);
    clip-path: polygon(4cqh 0, 100% 0, calc(100% - 4cqh) 100%, 0 100%);
    box-shadow: inset 0 -1cqh 0 var(--accent-deep);
    transition: filter 0.1s, translate 0.1s;
  }
  .solo:hover,
  .solo:focus-visible {
    filter: brightness(1.12);
    translate: 0.6cqw 0;
  }
  .play {
    width: 0;
    height: 0;
    border-left: 6cqh solid var(--paper-white);
    border-top: 4cqh solid transparent;
    border-bottom: 4cqh solid transparent;
  }
  .label {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.1;
  }
  .solo .label b {
    font-size: 7cqh;
    font-style: italic;
    font-weight: 900;
    letter-spacing: 0.12em;
  }
  .solo .label small {
    font-size: 1.8cqh;
    margin-top: 0.6cqh;
  }
  .eq {
    position: absolute;
    right: 5cqw;
    bottom: 2cqh;
    height: 8cqh;
    display: flex;
    align-items: flex-end;
    gap: 0.5cqw;
    opacity: 0.45;
  }
  .eq i {
    width: 0.7cqw;
    background: var(--paper-white);
    animation: eq 0.9s ease-in-out infinite alternate;
  }
  .eq i:nth-child(odd) {
    animation-delay: -0.4s;
  }
  .eq i:nth-child(3n) {
    animation-delay: -0.7s;
  }
  @keyframes eq {
    to {
      scale: 1 0.4;
    }
  }
  .eq i {
    transform-origin: bottom;
  }
  .rooms {
    display: flex;
    gap: 1.4cqw;
  }
  .room {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 1.4cqw;
    height: 11cqh;
    padding: 0 2cqw 0 2.6cqw;
    background: var(--paper-white);
    color: var(--navy);
    border: var(--line) solid var(--sky-line) !important;
    clip-path: polygon(2cqh 0, 100% 0, calc(100% - 2cqh) 100%, 0 100%);
    box-shadow: inset 0 -0.5cqh 0 color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .room:hover,
  .room:focus-visible {
    background: var(--sky-light);
  }
  .room .label b {
    font-size: 3.4cqh;
    font-weight: 900;
    letter-spacing: 0.1em;
  }
  .room .label small {
    font-size: 1.3cqh;
    color: var(--muted);
  }
  .ic {
    width: 6cqh;
    height: 6cqh;
    color: var(--navy);
    flex: none;
  }
  .ic svg {
    width: 100%;
    height: 100%;
    fill: currentColor;
  }
  .tools {
    display: flex;
    gap: 3cqw;
    padding-left: 1cqw;
  }
  .tool {
    display: flex;
    align-items: center;
    gap: 1cqh;
    background: none;
    color: var(--page-ink);
    font-weight: 800 !important;
    font-size: 2.3cqh !important;
    letter-spacing: 0.1em;
    padding: 0.6cqh 0.4cqw;
  }
  .tool:hover,
  .tool:focus-visible {
    color: var(--accent);
  }
  .tool-ic {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.2cqh;
    height: 3.2cqh;
    border-radius: 50%;
    background: var(--page-ink);
    color: var(--page-ink-on);
    font-size: 2cqh;
    font-weight: 900;
  }
  .foot {
    position: absolute;
    left: 4cqw;
    bottom: 1.4cqh;
  }

  /* 直式：插圖在上面（底邊斜切），Logo 與選單在下面的白色區 */
  @container stage (aspect-ratio < 1) {
    .art {
      top: 0;
      bottom: auto;
      width: 100cqw;
      height: 47cqh;
      clip-path: polygon(0 0, 100% 0, 100% 86%, 0 100%);
    }
    .hero {
      right: 0;
      height: 46cqh;
    }
    .tagline {
      left: 6cqw;
      bottom: 8cqh;
      font-size: 2.6cqh;
    }
    .side {
      width: 100%;
      padding: 47cqh 6cqw 0;
    }
    .logo-box {
      width: 74cqw;
      margin: 0 auto;
    }
    .menu {
      left: 6cqw;
      top: 58cqh;
      width: 88cqw;
      gap: 1.8cqh;
    }
    .solo {
      height: 12cqh;
      gap: 5cqw;
      padding: 0 6cqw 0 9cqw;
      clip-path: polygon(2.4cqh 0, 100% 0, calc(100% - 2.4cqh) 100%, 0 100%);
    }
    .play {
      border-left-width: 3.6cqh;
      border-top-width: 2.4cqh;
      border-bottom-width: 2.4cqh;
    }
    .solo .label b {
      font-size: 4.4cqh;
    }
    .solo .label small {
      font-size: 1.3cqh;
    }
    .eq {
      height: 5cqh;
      gap: 1cqw;
    }
    .eq i {
      width: 1.4cqw;
    }
    .rooms {
      gap: 3cqw;
    }
    .room {
      height: 8cqh;
      gap: 2.4cqw;
      padding: 0 3cqw 0 5cqw;
      clip-path: polygon(1.4cqh 0, 100% 0, calc(100% - 1.4cqh) 100%, 0 100%);
    }
    .room .label b {
      font-size: 2.3cqh;
      letter-spacing: 0.04em;
    }
    .room .label small {
      font-size: 1cqh;
    }
    .ic {
      width: 4cqh;
      height: 4cqh;
    }
    .tools {
      gap: 8cqw;
      justify-content: center;
    }
    .tool {
      font-size: 2cqh !important;
    }
    .foot {
      left: 6cqw;
    }
  }
</style>
