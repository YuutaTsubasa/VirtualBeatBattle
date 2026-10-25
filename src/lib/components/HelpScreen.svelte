<script>
  // 操作說明：鍵盤／手把／觸控對照表與小技巧
  import { asset } from '../art-style.svelte.js';
  import ScreenFrame from './ScreenFrame.svelte';
  import { t } from '../i18n.svelte.js';
  import BackButton from './BackButton.svelte';
  import ControlHint from './ControlHint.svelte';

  let { onback } = $props();
  const ROWS = [
    ['左手三條', 'S D F', 'A W E', '←／LB、↑／↓、→', '點左邊三條'],
    ['右手三條', 'J K L', '← ↓ →', '□／X、△／Y、○／B／RB', '點右邊三條'],
    ['長押', '按住到尾巴', '按住到尾巴', '按住到尾巴', '手指不要放開'],
    ['暫停', 'Esc', 'Esc', 'Start', '右上暫停鈕'],
  ];
</script>

<ScreenFrame title={t('操作說明')} en="HOW TO PLAY" subtitle={t('鍵盤・手把・觸控都能玩')}>
  <div class="panel keys-panel">
    <div class="panel-head">{t('操作方式')}</div>
    <div class="panel-body">
      <table>
        <thead>
          <tr>
            <th></th>
            <th><img src="{asset('ui/icons/keyboard.webp')}" alt="" />{t('鍵盤')}</th>
            <th><img src="{asset('ui/icons/keyboard.webp')}" alt="" />{t('另一組')}</th>
            <th><img src="{asset('ui/icons/gamepad.webp')}" alt="" />{t('手把')}</th>
            <th><img src="{asset('ui/icons/touch.webp')}" alt="" />{t('觸控')}</th>
          </tr>
        </thead>
        <tbody>
          {#each ROWS as [label, ...cells] (label)}
            <tr>
              <th>{t(label)}</th>
              {#each cells as c, i (i)}<td>{t(c)}</td>{/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>

  <div class="panel tips-panel">
    <div class="panel-head">{t('小技巧')}</div>
    <div class="panel-body">
      <ul>
        <li><b>{t('六條軌道')}</b>{t('：音符落到判定線時按下。左邊三條給左手、右邊三條給右手。')}</li>
        <li><b>{t('打中就是攻擊')}</b>{t('：每打中一顆，角色就揍魔王一下（Perfect 最痛、連擊越多越痛）。Miss 會被魔王反擊扣體力。')}</li>
        <li><b>{t('分身')}</b>{t('：金框的音符是左右同時押，角色會分出半透明的分身去打另一邊。')}</li>
        <li><b>{t('地雷')}</b>{t('：紅色刺球是魔王的攻擊，不要按！')}</li>
        <li><b>{t('練等級')}</b>{t('：打一首就拿經驗值，等級越高攻擊力越高。剛開始全 Perfect 也只能打掉魔王七成五，練幾級或打得更準才打得倒。')}</li>
        <li><b>{t('技術分')}</b>{t('：只看判定準不準（滿分 1,000,000），跟等級無關；連線比的是這個。')}</li>
        <li><b>{t('連線')}</b>{t('：最多十二人打同一首。兩個人左右並排，三個人以上旁邊顯示大家的小卡片。')}</li>
        <li>{t('太早或太晚可以到「設定」調判定校正；音符太快、太慢調音符速度。')}</li>
        <li>{t('第一次打倒魔王，會有隱藏角色加入。')}</li>
      </ul>
    </div>
  </div>

  {#snippet foot()}
    <BackButton onclick={onback} />
    <span></span>
    <ControlHint />
  {/snippet}
</ScreenFrame>

<style>
  .keys-panel {
    flex: 1.35;
  }
  .tips-panel {
    flex: 1.15;
  }
  /* 字多的語言（英文）塞不下時可以捲動，不要超出框 */
  .tips-panel .panel-body {
    overflow-y: auto;
    min-height: 0;
  }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 0.8cqh;
    font-size: 2.4cqh;
    font-weight: 800;
  }
  thead th {
    font-size: 2.3cqh;
    white-space: nowrap;
  }
  thead img {
    display: block;
    width: 6cqh;
    margin: 0 auto 0.4cqh;
  }
  tbody th {
    background: var(--navy);
    color: var(--on-dark);
    padding: 1cqh 2.4cqh 1cqh 1.6cqh;
    white-space: nowrap;
    clip-path: polygon(0 0, 100% 0, calc(100% - 1cqh) 100%, 0 100%);
  }
  tbody td {
    background: var(--paper-white);
    border-top: 0.3cqh solid var(--navy);
    border-bottom: 0.3cqh solid var(--navy);
    text-align: center;
    padding: 1cqh 0.6cqh;
  }
  ul {
    margin: 0;
    padding-left: 2.6cqh;
    font-size: 2.5cqh;
    font-weight: 700;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    gap: 0.9cqh;
  }
  :global(html[lang='ja']) ul {
    font-size: 2.3cqh;
    line-height: 1.45;
    gap: 0.6cqh;
  }
  /* 英文字比較長：字小一點才塞得進同一個框 */
  :global(html[lang='en']) ul {
    font-size: 2cqh;
    line-height: 1.35;
    gap: 0.5cqh;
  }

  /* 直式：按鍵表在上、小技巧在下（捲動） */
  @container stage (aspect-ratio < 1) {
    .keys-panel {
      flex: none;
    }
    .tips-panel {
      flex: 1;
      min-height: 0;
    }
    table {
      font-size: 1.6cqh;
      border-spacing: 0 0.5cqh;
    }
    thead th {
      font-size: 1.4cqh;
      white-space: normal;
    }
    thead img {
      width: 3.6cqh;
    }
    tbody th {
      padding: 0.6cqh 1.6cqh 0.6cqh 1cqh;
      white-space: normal;
    }
    tbody td {
      padding: 0.6cqh 0.4cqh;
    }
    ul,
    :global(html[lang='ja']) ul,
    :global(html[lang='en']) ul {
      font-size: 1.7cqh;
      line-height: 1.45;
      gap: 0.6cqh;
      padding-left: 2cqh;
    }
  }
</style>
