<script>
  // 樂手集合（art-work/rhythm-ui-concept-v1 的 02 左上）：左邊 4×3 座位卡（編號、頭像、名字、狀態），
  // 右邊房號與人數、這一首（封面、曲名、魔王、難度）、大廳聊天；房主按「開始演奏」。
  import { tick } from 'svelte';
  import { net, inTauri, hostCmd, leave, send, serverUrls, setCharacter, toast, load } from '../net.svelte.js';
  import { WEB_URL, shareLink } from '../site.js';
  import { CHARACTERS, getCharacter } from '../game/characters.js';
  import { DIFFICULTIES, SLOT_COLORS } from '../game/constants.js';
  import { SHOWN_TRACKS as TRACKS, LEVELS, gameOf, backgroundOf, bossOf } from '../game/tracks.js';
  import { WORLDS } from '../game/stages.js';
  import { asset } from '../art-style.svelte.js';
  import { play } from '../game/audio.js';
  import { t, displayName, serverText } from '../i18n.svelte.js';
  import ScreenFrame from './ScreenFrame.svelte';
  import BackButton from './BackButton.svelte';
  import CharacterGrid from './CharacterGrid.svelte';
  import Stepper from './Stepper.svelte';

  const room = $derived(net.room);
  const songOptions = TRACKS.map((tr) => ({ value: tr.id, label: `${t(tr.title)} / ${t(gameOf(tr.game).short)}` }));
  const levelOptions = LEVELS.map((l) => ({ value: l.id, label: l.name }));
  const track = $derived(TRACKS.find((tr) => tr.id === room.settings.song) ?? TRACKS[0]);
  const filled = $derived(room.seats.filter(Boolean).length);
  const difficultyOptions = Object.entries(DIFFICULTIES).map(([k, label]) => ({ value: k, label: t(label) }));
  const isHost = $derived(net.isHost);
  const urls = $derived(serverUrls());
  let urlIdx = $state(0);
  const address = $derived(urls[urlIdx] ?? urls[0] ?? '');
  // 線上房間的分享連結（…#join/房號）。桌面 App 沒設定網頁版網址時只給房號。
  const webBase = WEB_URL || (!inTauri && location.protocol.startsWith('http') ? location.origin + location.pathname : '');
  const link = $derived(shareLink(net.code, webBase));

  let charDialog;
  let dialogCursor = $state(0);
  let chatText = $state('');
  let chatBox = $state();

  const myCharacter = $derived(net.seat != null ? room?.seats[net.seat]?.character : null);

  // 房間預設的曲子（Rust 那邊是收錄的第一首）不在清單裡：房主換成清單的第一首
  $effect(() => {
    if (isHost && room && !TRACKS.some((tr) => tr.id === room.settings.song)) updateSettings({ song: TRACKS[0].id });
  });

  $effect(() => {
    room?.chat.length;
    tick().then(() => chatBox && (chatBox.scrollTop = chatBox.scrollHeight));
  });

  function roleOf(i) {
    const tags = [];
    if (i === room.host_seat) tags.push(t('房主'));
    if (i === net.seat) tags.push(t('你'));
    return tags.join(' · ');
  }

  function statusOf(seat) {
    if (seat.kind === 'bot') return t('電腦對手・{level}', { level: t(DIFFICULTIES[seat.difficulty]) });
    return seat.connected ? t('已連線') : t('斷線中');
  }

  function updateSettings(patch) {
    hostCmd('settings', { settings: { ...room.settings, ...patch } });
  }

  function sit() {
    play('select');
    send({ type: 'sit', name: load('vbb_name', '') || t('玩家'), character: load('vbb_character') });
  }

  function openCharacters() {
    dialogCursor = Math.max(0, CHARACTERS.findIndex((c) => c.id === myCharacter));
    charDialog.showModal();
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('已複製'), 'ok');
    } catch {
      toast(t('複製失敗，請手動選取'));
    }
  }

  function sendChat(event) {
    event.preventDefault();
    if (!chatText.trim()) return;
    send({ type: 'chat', text: chatText });
    chatText = '';
  }
</script>

<ScreenFrame title={t('樂手集合')} en="SESSION LOBBY">
  <div class="seats">
    {#each room.seats as seat, i (i)}
      <div class="panel seat" class:gold-frame={i === net.seat} class:empty={!seat} style="--c: {SLOT_COLORS[i]}">
        <span class="no">{String(i + 1).padStart(2, '0')}</span>
        {#if seat}
          {@const c = getCharacter(seat.character)}
          <div class="pic"><img src={i === net.seat ? c.portraits.happy : c.portraits.normal} alt="" /></div>
          <div class="info">
            <b class="who" title={displayName(seat.name)}>{seat.kind === 'bot' ? c.name : displayName(seat.name)}</b>
            {#if seat.kind === 'bot'}
              <span class="status bot">{t('電腦')}</span>
            {:else}
              <span class="status" class:on={seat.connected}>{seat.connected ? t('已連線') : t('斷線中')}</span>
            {/if}
            {#if roleOf(i)}<span class="role">{roleOf(i)}</span>{/if}
            <div class="seat-actions">
              {#if i === net.seat}
                <button type="button" class="vbtn small gold" onclick={openCharacters}>{t('更換角色')}</button>
              {:else if isHost && room.host_seat !== i}
                <button type="button" class="vbtn small" onclick={() => hostCmd('remove', { seat: i })}>{t('移除')}</button>
              {/if}
            </div>
          </div>
        {:else}
          <div class="pic plus" aria-hidden="true"></div>
          <div class="info">
            <b class="who">{t('等待入席')}</b>
            
            <div class="seat-actions">
              {#if net.seat == null}
                <button type="button" class="vbtn small gold" onclick={sit}>{t('入席')}</button>
              {/if}
              {#if isHost}
                <button type="button" class="vbtn small outline" onclick={() => hostCmd('add_bot', { seat: i, difficulty: room.settings.difficulty })}>{t('加入電腦')}</button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <aside class="side">
    <section class="panel">
      <div class="panel-head left">{isHost ? t('邀請朋友') : t('連線資訊')}</div>
      <div class="panel-body">
        {#if net.code}
          <div class="code-row">
            <span class="code-label">{t('房號')}</span>
            <code class="room-code">{net.code}</code>
            <span class="count"><b>{String(filled).padStart(2, '0')}</b> / 12</span>
          </div>
          <div class="copy-buttons">
            <button type="button" class="vbtn small gold" onclick={() => copy(net.code)}>{t('複製房號')}</button>
            {#if link}<button type="button" class="vbtn small" onclick={() => copy(link)}>{t('複製邀請連結')}</button>{/if}
          </div>
          {#if net.signalDown}
            <div class="signal-down"><i>i</i><div><b>{t('暫時無法邀請新玩家')}</b><small>{t('房內玩家不受影響，新玩家請稍後再加入')}</small></div></div>
          {:else}
            <p class="small">{isHost ? t('請保持房主分頁開啟') : t('已用 WebRTC 直接連到房主。')}</p>
          {/if}
        {:else}
          {#if urls.length > 1}
            <div class="tabs">
              {#each urls as u, i (u)}
                <button type="button" class:sel={i === urlIdx} onclick={() => (urlIdx = i)}>{u.replace(/^https?:\/\//, '')}</button>
              {/each}
            </div>
          {/if}
          <div class="copy-row">
            <code>{address}</code>
            <button type="button" class="vbtn small gold" onclick={() => copy(address)}>{t('複製')}</button>
          </div>
          <p class="small">
            {#if isHost}{t('朋友可用 App 或瀏覽器加入。區網可直接連線；跨網路需要開放這個埠或用通道。')}{:else}{t('已連線到房主。')}{/if}
          </p>
        {/if}
      </div>
    </section>

    <section class="panel song">
      <div class="song-top">
        <img src={asset(backgroundOf(track))} alt="" />
        <div class="song-info">
          <b>{t(track.title)}</b>
          <small>BOSS {bossOf(track, WORLDS).rival ? t(bossOf(track, WORLDS).name) + t('（對手）') : t(bossOf(track, WORLDS).name)}</small>
          <span class="chips"><i class="on">{(room.settings.level ?? '').toUpperCase()}</i><i>6 KEY</i></span>
        </div>
      </div>
      <div class="panel-body rules">
        <span>{t('曲子')}</span>
        <Stepper options={songOptions} value={room.settings.song} disabled={!isHost} onchange={(v) => updateSettings({ song: v })} />
        <span>{t('難度')}</span>
        <Stepper options={levelOptions} value={room.settings.level} disabled={!isHost} onchange={(v) => updateSettings({ level: v })} />
        <span>{t('電腦強度')}</span>
        <Stepper options={difficultyOptions} value={room.settings.difficulty} disabled={!isHost} onchange={(v) => updateSettings({ difficulty: v })} />
      </div>
    </section>

    <section class="panel chat">
      <div class="panel-head left">{t('大廳聊天')}</div>
      <div class="panel-body">
        <ol bind:this={chatBox}>
          {#each room.chat as line, i (i)}
            {#if line.sys}
              <li class="sys">{t('系統')}：{serverText(line.text)}</li>
            {:else}
              <li><b class:mine={line.seat === net.seat && line.seat != null}>{displayName(line.name)}</b>：{line.text}</li>
            {/if}
          {/each}
        </ol>
        <form onsubmit={sendChat}>
          <input bind:value={chatText} placeholder={t('說點什麼…')} maxlength="300" />
          <button type="submit" class="vbtn small dark" disabled={!chatText.trim()}>{t('送出')}</button>
        </form>
      </div>
    </section>
  </aside>

  {#snippet foot()}
    <BackButton label={t('離開房間')} onclick={leave} />
    <div class="hint-bar"><i class="bang">!</i>{isHost ? t('以技術分排名') : t('等待房主開始…')}</div>
    {#if isHost}
      <button type="button" class="vbtn primary" onclick={() => hostCmd('start')}>{t('開始演奏')}</button>
    {:else}
      <span class="spinner"></span>
    {/if}
  {/snippet}
</ScreenFrame>

<dialog class="char-dialog" bind:this={charDialog}>
  <div class="panel">
    <div class="panel-head">{t('更換角色')}</div>
    <div class="panel-body">
      <CharacterGrid
        bind:cursor={dialogCursor}
        selected={myCharacter}
        showLocked={false}
        onpick={(c) => {
          setCharacter(c.id);
          charDialog.close();
        }}
      />
      <div class="dialog-actions"><button type="button" class="vbtn small" onclick={() => charDialog.close()}>{t('取消')}</button></div>
    </div>
  </div>
</dialog>

<style>
  .seats {
    flex: 1.7;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 1.2cqh 0.8cqw;
    min-width: 0;
    min-height: 0;
  }
  /* 座位卡：上面是頭像（該座位的代表色底），下面名字與狀態，左上角是編號 */
  .seat {
    flex-direction: column;
    padding: 0;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }
  .seat.gold-frame {
    border-color: var(--accent);
  }
  .no {
    position: absolute;
    left: 0.8cqh;
    top: 0.4cqh;
    z-index: 2;
    color: var(--navy);
    font-size: 2.8cqh;
    font-weight: 900;
    font-style: italic;
    line-height: 1.1;
    text-shadow: 0 0 0.6cqh #fff, 0 0 0.6cqh #fff;
  }
  .gold-frame .no {
    color: #fff;
    text-shadow: none;
    background: var(--accent);
    padding: 0 1.4cqh 0 0.8cqh;
    left: 0;
    top: 0;
    clip-path: polygon(0 0, 100% 0, calc(100% - 0.8cqh) 100%, 0 100%);
  }
  .pic {
    position: relative;
    flex: 1;
    min-height: 0;
    background: linear-gradient(160deg, color-mix(in srgb, var(--c) 20%, #fff), #eef3ff);
    overflow: hidden;
  }
  .pic img {
    position: absolute;
    left: 50%;
    top: 0;
    width: 100%;
    height: 130%;
    object-fit: cover;
    object-position: center 12%;
    translate: -50% 0;
  }
  .pic.plus {
    background: none;
  }
  .pic.plus::before,
  .pic.plus::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 55%;
    translate: -50% -50%;
    width: 3cqh;
    height: 0.3cqh;
    background: var(--muted);
  }
  .pic.plus::after {
    width: 0.3cqh;
    height: 3cqh;
  }
  .info {
    flex: none;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.2cqh 0.8cqh;
    padding: 0.5cqh 1cqh 0.6cqh;
    border-top: var(--line) solid var(--sky-line);
    background: #fff;
  }
  .who {
    max-width: 100%;
    font-size: 2.2cqh;
    font-weight: 900;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .empty .who {
    color: var(--muted);
    font-weight: 800;
  }
  .role {
    background: var(--accent);
    color: #fff;
    font-weight: 900;
    font-size: 1.4cqh;
    padding: 0 0.8cqh;
  }
  .status {
    font-size: 1.5cqh;
    font-weight: 900;
    color: var(--muted);
  }
  .status.on {
    color: var(--ok);
  }
  .status.bot {
    background: #e6ebf5;
    color: var(--navy-soft);
    padding: 0 0.8cqh;
  }
  .seat-actions {
    flex-basis: 100%;
    align-self: stretch;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5cqh;
  }
  .seat-actions :global(.vbtn.small) {
    font-size: 1.7cqh;
    padding: 0.3cqh 1cqh;
    min-height: 0;
  }
  .seat-actions:empty {
    border: 0;
  }
  .outline {
    --fg: var(--teal);
    border-color: var(--teal);
    box-shadow: 0.4cqh 0.4cqh 0 var(--teal);
  }
  .dark {
    --face: var(--navy);
    --fg: var(--on-dark);
  }

  .side {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.8cqh;
    min-height: 0;
    min-width: 0;
    padding-top: 0.8cqh;
  }
  .side .panel-body {
    padding: 1.4cqh 1.6cqh 1cqh;
    gap: 0.8cqh;
  }
  .side .panel-head {
    font-size: 2.6cqh;
  }
  .code-row {
    display: flex;
    gap: 1.4cqh;
    align-items: center;
  }
  .code-label {
    font-weight: 900;
    font-size: 2.4cqh;
  }
  .room-code {
    flex: 1;
    text-align: center;
    font-family: inherit;
    font-size: 5.4cqh;
    font-weight: 900;
    letter-spacing: 0.25em;
    padding: 0.2cqh 1cqh;
    border: var(--line) solid var(--navy);
    background: var(--paper-white);
    user-select: text;
  }
  .copy-buttons {
    display: flex;
    gap: 1cqw;
  }
  .copy-buttons .vbtn {
    flex: 1;
    min-width: 0;
    padding-inline: 1cqh;
  }
  .copy-row {
    display: flex;
    gap: 1cqh;
    align-items: center;
  }
  .copy-row code {
    flex: 1;
    min-width: 0;
    background: var(--paper-white);
    border: 0.3cqh solid var(--navy);
    padding: 0.5cqh 1cqh;
    font-size: 2.2cqh;
    font-weight: 700;
    overflow-x: auto;
    white-space: nowrap;
    user-select: text;
  }
  .signal-down {
    display: flex;
    gap: 1.2cqh;
    align-items: center;
    border: 0.3cqh solid var(--navy);
    border-left: 1cqh solid var(--gold);
    padding: 0.8cqh 1.2cqh;
  }
  .signal-down i {
    flex: none;
    width: 4cqh;
    height: 4cqh;
    border-radius: 50%;
    background: var(--gold);
    display: grid;
    place-items: center;
    font-style: normal;
    font-weight: 900;
    font-size: 2.6cqh;
  }
  .signal-down b {
    display: block;
    font-size: 2.2cqh;
  }
  .signal-down small {
    font-size: 1.8cqh;
    font-weight: 700;
  }
  .tabs {
    display: flex;
    gap: 0.6cqh;
    flex-wrap: wrap;
  }
  .tabs button {
    border: 0.25cqh solid var(--navy);
    background: var(--paper-white);
    font-weight: 800;
    font-size: 1.8cqh;
    padding: 0.2cqh 1cqh;
  }
  .tabs .sel {
    background: var(--teal);
    color: var(--on-dark);
  }
  .small {
    margin: 0;
    text-align: center;
    font-size: 1.9cqh;
    font-weight: 700;
  }
  .rules {
    display: grid !important;
    grid-template-columns: max-content 1fr;
    gap: 0.4cqh 1.2cqw !important;
    align-items: center;
    font-weight: 900;
    font-size: 1.9cqh;
    padding-top: 0 !important;
  }
  .chat {
    flex: 1;
    min-height: 15cqh;
  }
  .rules :global(.stepper) {
    min-height: 4.2cqh;
    font-size: 2cqh;
  }
  .chat ol {
    flex: 1;
    min-height: 0;
    list-style: none;
    margin: 0;
    padding: 0.6cqh 1cqh;
    overflow-y: auto;
    font-size: 2cqh;
    line-height: 1.5;
    background: var(--paper-white);
    border: 0.25cqh solid var(--navy);
  }
  .chat .sys {
    color: var(--muted);
  }
  .chat .mine {
    color: var(--accent);
  }
  .chat form {
    display: flex;
    gap: 0.8cqh;
  }
  .chat input {
    flex: 1;
    min-width: 0;
    font-size: 2.1cqh;
  }
  .bang {
    width: 3cqh;
    height: 3cqh;
    border-radius: 50%;
    background: var(--navy);
    color: var(--on-dark);
    display: grid;
    place-items: center;
    font-style: normal;
    font-weight: 900;
    flex: none;
  }
  .spinner {
    width: 6cqh;
    height: 6cqh;
    border: 0.8cqh solid var(--cream-deep);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .char-dialog {
    border: none;
    background: none;
    padding: 0;
    width: 76cqw;
    max-width: 92vw;
  }
  .char-dialog::backdrop {
    background: rgba(22, 24, 29, 0.62);
  }
  .char-dialog .panel-body {
    min-height: 40cqh;
    padding-top: 2.4cqh;
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
  }
  .count {
    margin-left: auto;
    font-weight: 900;
    font-style: italic;
    font-size: 2.2cqh;
    color: var(--navy-soft);
  }
  .count b {
    font-size: 3.4cqh;
    color: var(--navy);
  }
  .song {
    overflow: hidden;
  }
  .song-top {
    display: flex;
    gap: 1cqw;
    padding: 1cqh;
  }
  .song-top img {
    width: 13cqh;
    height: 8cqh;
    object-fit: cover;
  }
  .song-info {
    display: flex;
    flex-direction: column;
    gap: 0.3cqh;
    min-width: 0;
  }
  .song-info b {
    font-size: 3cqh;
    font-style: italic;
  }
  .song-info small {
    font-weight: 800;
    font-size: 1.6cqh;
    color: var(--red);
  }
  .chips {
    display: flex;
    gap: 0.4cqw;
  }
  .chips i {
    font-style: normal;
    font-weight: 900;
    font-size: 1.6cqh;
    padding: 0.2cqh 1.4cqh;
    background: #e6ebf5;
    color: var(--navy-soft);
  }
  .chips i.on {
    background: var(--accent);
    color: #fff;
  }
</style>
