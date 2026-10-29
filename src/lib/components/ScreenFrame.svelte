<script>
  // 選單畫面的共用版型（art-work/rhythm-ui-concept-v1）：左上粗斜體大標題＋藍色電波＋英文小字，
  // 右邊淡淡的大英文浮水印（SONG SELECT…）與齒輪；中間內容；底部（返回／提示／主要按鈕）。
  import SettingsButton from './SettingsButton.svelte';

  // en：英文小字與浮水印（SONG SELECT、SESSION LOBBY…）；subtitle：標題旁邊一行說明
  let { title, en = '', subtitle = '', children, foot } = $props();

  // 標題太長（英文、日文）時縮小字級：中文字約 1 字寬，英數約 0.6（字級在 CSS 用 --title-w 算）
  const titleWidth = $derived.by(() => {
    let w = 0;
    for (const ch of title) w += /[　-鿿＀-￯]/.test(ch) ? 1 : 0.6;
    return Math.max(w, 1).toFixed(2);
  });
</script>

<section class="screen framed">
  <div class="paper-bg"></div>
  {#if en}<div class="watermark" aria-hidden="true">{en}</div>{/if}
  <div class="frame">
    <header class="frame-head">
      <div class="title-box">
        <h2 class="pop-title pop-text" style:--title-w={titleWidth}>
          <i class="bolt" aria-hidden="true"></i>{title}<i class="bolt right" aria-hidden="true"></i>
        </h2>
        {#if en}<span class="en-sub">{en}</span>{/if}
      </div>
      {#if subtitle}<p class="sub">{subtitle}</p>{/if}
      <div class="corner">
        <SettingsButton />
      </div>
    </header>
    <div class="frame-main">{@render children()}</div>
    {#if foot}<footer class="frame-foot">{@render foot()}</footer>{/if}
  </div>
</section>

<style>
  .framed {
    justify-content: stretch;
  }
  .watermark {
    position: absolute;
    right: 3cqw;
    top: 1.4cqh;
    font-size: 13cqh;
    font-weight: 900;
    font-style: italic;
    letter-spacing: 0.04em;
    color: transparent;
    -webkit-text-stroke: 0.25cqh color-mix(in srgb, var(--accent) 13%, transparent);
    white-space: nowrap;
    pointer-events: none;
  }
  .frame-head {
    position: relative;
    display: flex;
    align-items: center;
    gap: 2.4cqw;
    min-width: 0;
  }
  .title-box {
    display: flex;
    flex-direction: column;
    gap: 0.4cqh;
  }
  .pop-title {
    position: relative;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 1cqh;
    white-space: nowrap;
    color: var(--navy);
    font-size: min(9cqh, calc(34cqw / var(--title-w)));
  }
  /* 藍色的電波（標題左右的閃電斜線） */
  .bolt {
    width: 3.4cqh;
    height: 7cqh;
    background: var(--accent);
    clip-path: polygon(55% 0, 70% 0, 45% 48%, 75% 48%, 30% 100%, 15% 100%, 40% 55%, 10% 55%);
  }
  .bolt.right {
    width: 2.4cqh;
    height: 4.6cqh;
    opacity: 0.8;
  }
  .en-sub {
    margin-left: 4.4cqh;
    color: var(--navy);
  }
  .sub {
    position: relative;
    margin: 0;
    align-self: flex-end;
    margin-bottom: 1.4cqh;
    font-size: 2.2cqh;
    font-weight: 800;
    letter-spacing: 0.08em;
    white-space: nowrap;
    color: var(--accent);
    padding: 0.3cqh 2.4cqh;
    border-left: 0.6cqh solid var(--accent);
    background: color-mix(in srgb, var(--paper-white) 85%, transparent);
  }
  .corner {
    position: relative;
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 1.6cqw;
  }

  /* 直式：標題小一點，說明另起一行 */
  @container stage (aspect-ratio < 1) {
    .watermark {
      font-size: 6cqh;
      top: 9cqh;
      right: 4cqw;
    }
    .frame-head {
      flex-wrap: wrap;
      row-gap: 0.6cqh;
    }
    .pop-title {
      font-size: min(5.6cqh, calc(66cqw / var(--title-w)));
    }
    .bolt {
      width: 2.4cqh;
      height: 5cqh;
    }
    .bolt.right {
      width: 1.6cqh;
      height: 3cqh;
    }
    .en-sub {
      margin-left: 3.2cqh;
    }
    .sub {
      order: 3;
      flex-basis: 100%;
      align-self: auto;
      margin: 0;
      font-size: 1.7cqh;
      white-space: normal;
      padding: 0.3cqh 1.6cqh;
    }
  }
</style>
