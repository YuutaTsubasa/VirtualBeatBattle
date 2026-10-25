<script>
  // 「虛擬音鬥樂」標誌。有正式的 Logo 圖（ui/logo.webp，美術交件後）就用圖，沒有就用字排
  // （art-work/rhythm-ui-concept-v1 的方向）：粗斜體深色字、左右兩道藍色電波、底下寬字距的英文。
  import { asset } from '../art-style.svelte.js';
  import { t } from '../i18n.svelte.js';
  let { size = 'small' } = $props();
  const src = $derived(asset('ui/logo.webp'));
</script>

{#if src}
  <img class="logo {size}" {src} alt={t('虛擬音鬥樂')} draggable="false" />
{:else}
  <div class="logo text {size}" role="img" aria-label={t('虛擬音鬥樂')}>
    <div class="word">
      <i class="bolt" aria-hidden="true"></i>
      <span>虛擬音鬥樂</span>
      <svg class="wave" viewBox="0 0 60 30" aria-hidden="true"><path d="M0 15 H14 L19 4 L26 26 L32 8 L37 18 H60" /></svg>
    </div>
    <span class="en">VIRTUAL BEAT BATTLE</span>
  </div>
{/if}

<style>
  .logo {
    display: block;
    width: 100%;
    height: auto;
  }
  .text {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.2cqw;
    user-select: none;
  }
  .word {
    display: flex;
    align-items: center;
    gap: 2cqw;
    font-weight: 900;
    font-style: italic;
    line-height: 1;
    color: var(--navy);
    font-size: 15cqw;
    letter-spacing: -0.02em;
    white-space: nowrap;
    text-shadow: 0.8cqw 0.8cqw 0 rgba(20, 80, 245, 0.18);
  }
  .bolt {
    width: 5cqw;
    height: 16cqw;
    flex: none;
    background: var(--accent);
    clip-path: polygon(55% 0, 72% 0, 45% 48%, 78% 48%, 30% 100%, 12% 100%, 40% 56%, 8% 56%);
  }
  .wave {
    width: 9cqw;
    flex: none;
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linejoin: round;
  }
  .en {
    margin-left: 10cqw;
    font-size: 4.2cqw;
    font-weight: 900;
    font-style: italic;
    letter-spacing: 0.5em;
    color: var(--navy);
  }
</style>
