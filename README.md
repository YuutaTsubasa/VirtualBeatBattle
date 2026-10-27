# 🎵 虛擬音鬥樂 Virtual Beat Battle

6 鍵下落式節奏遊戲，主角是[虛擬台麻館](https://github.com/YuutaTsubasa/TaiwanMahjong)的角色們：小翠、月華、阿明、糖糖、小春、蘭姐、蒼牙、金爺、雷歐、阿烈，還有隱藏角色阿翼。跟[虛擬排球王](https://github.com/YuutaTsubasa/VirtualVolleyball)、[虛擬闖天下](https://github.com/YuutaTsubasa/VirtualQuest)、[虛擬跑跑樂](https://github.com/YuutaTsubasa/VirtualRunners)同一套做法：Tauri v2 + Svelte 5，畫面用 Canvas，遊戲引擎用 Rust（網頁版編成 WebAssembly）。

## 玩法

- **原創曲 3 首**（`src/lib/audio/library/original.js`，旋律用 `scripts/compose-mml.py` 產生）：霓虹頻率（EDM 150）、超速心跳（Hardcore 180）、終焉頻率（Speedcore 魔王曲 200），十六分音符的旋律，譜面等級到 19～21。
- **收錄系列四款遊戲的曲子共 38 首**：虛擬台麻館 15（含 11 位角色的主題曲）、虛擬排球王 4、虛擬闖天下 10、虛擬跑跑樂 9（`src/lib/audio/library/` 照搬各遊戲的曲子）。選曲畫面每首底下寫「來自哪一款遊戲」、右邊放那款遊戲的 Logo（`public/games/`），也可以依遊戲篩選。
- **每一首歌都是一隻魔王**（魔王沿用闖天下的六大關，`src/lib/game/tracks.js` 決定哪一首是哪一隻）。音符是魔王丟過來的攻擊，角色站在判定線上：**打中就是反擊**，Miss 或按到地雷（紅色刺球）就被魔王打。
- **分身**：左右兩邊同時押的音符（金框）會讓角色分出半透明的分身去打另一邊。
- **傷害** = 攻擊力 × 判定倍率（Perfect 1.0／Great 0.7／Good 0.3）× 連擊加成（每 50 連擊 +5%，最多 +30%）。
- **魔王的血量** = 初始等級全 Perfect 打得出的傷害 ÷ 0.75，所以一開始全 Perfect 也只能打掉七成五。
- **經驗值**：每打中一顆就有（Perfect 3、Great 2、Good 1），打倒魔王再 ×1.5；經驗值餵給打的那個角色，升一級攻擊力 +7%（最高 30 級）。
- **技術分**（0～1,000,000，SSS～D）只看判定準不準，跟等級無關；連線比的是這個。
- **體力**：Miss 扣 4、地雷扣 10，每打中一顆回 0.4。歸零不會中斷曲子，只是戰鬥輸了、之後沒有傷害（技術分照算）。
- 四種難度（EASY／NORMAL／HARD／EXPERT），HARD 以上有地雷；EXPERT 每拍都可以同時押，鼓點、Hi-hat、伴奏都會補進來。
- 自己的軌道是斜的（像 CHUNITHM／DEEMO 往遠處收窄），連線時別人的小畫面是直的。
- 選曲列表會標 Full Combo（FC）與 All Perfect（AP）。

### 譜面

譜面是從 PC-98 曲子**自動排出來的**（`src/lib/game/chartgen.js`）：旋律的每個音一顆音符，音往上走手指往右、往下走往左；長音變長押；小鼓的重拍在另一隻手補一顆（同時押）；HARD 再用鼓點補空檔、放地雷。曲子會整首重複到大約一分半，第二、四輪左右鏡像。
改了曲子或產生器要重跑 `npm run charts`（寫進 `crates/beat-core/charts.json`，Rust 引擎直接讀；`npm test` 會檢查有沒有忘記）。

### 連線（像 DJMAX）

最多 **12 人**打同一首，房主可以加電腦對手。每個人**在自己的電腦上判定**（照自己的音樂時鐘，網路慢也不影響手感），每秒回報 15 次分數、連擊、對魔王的傷害、體力；倒數照房主的時鐘對齊。

- **2 人**：左右並排（自己在左），魔王在中間上方、各自一條血條。
- **3～12 人**：自己的軌道偏左，右邊是大家的**迷你畫面**（像 DJMAX 線上的觀戰框）：名牌（頭像、名字、名次）、RATE、BREAK（Miss 數）、縮小的六條軌道（同一份譜面，對方按的鍵會亮、漏掉的音符會繼續往下掉）、分數與對魔王的傷害。2～4 人兩欄、5～9 人三欄、10 人以上四欄。
- 斷線＝這一首棄權，重連拿回座位。名次照技術分；經驗值與最佳成績各自記在自己的電腦。

## 怎麼玩

| | 鍵盤 | 另一組 | 手把 | 觸控 |
| --- | --- | --- | --- | --- |
| 左手三條 | S D F | A W E | ←／LB、↑／↓、→ | 點左邊三條 |
| 右手三條 | J K L | ← ↓ → | □／X、△／Y、○／B／RB | 點右邊三條 |
| 暫停 | Esc | Esc | Start | 右上暫停鈕 |

設定裡可以調**音符速度**與**判定校正**（藍牙耳機通常要 +100ms 以上）。

## 角色的小能力（`crates/beat-core/src/characters.rs`）

| 角色 | 能力 |
| --- | --- |
| 小翠 | Good 也打得出 Great 的傷害 |
| 月華 | 體力 130 |
| 阿明 | 連擊加成最多 +50% |
| 糖糖 | 每 50 連擊回 8 點體力 |
| 小春 | Perfect 傷害 +15% |
| 蘭姐 | 魔王的反擊只痛 65% |
| 蒼牙 | 同時押（分身）傷害 +40% |
| 金爺 | 經驗值 +30% |
| 雷歐 | 長押放開那一擊兩倍 |
| 阿烈 | 攻擊 +10%、體力 85 |
| 阿翼（隱藏，第一次打倒魔王加入） | Miss 時 35% 擋下反擊 |

## 開發

需求：Node 18+、Rust 1.89+、`rustup target add wasm32-unknown-unknown`。

```bash
npm install
```

網頁版（http://localhost:1424）：

```bash
npm run dev
```

桌面 App：

```bash
npm run tauri dev
```

不開視窗的區網伺服器（先 `npm run build`），會印出網址與「房主金鑰」：

```bash
npm run server -- --port 7822 --dist dist
```

測試（JS 的漏翻、譜面是不是最新＋Rust 的判定、魔王血量、電腦對手、12 人房間）：

```bash
npm test
```

## 連線

房間與訊息的處理（`crates/beat-core/src/protocol.rs`）同一份 Rust 程式給區網伺服器（Tauri 內建）與線上房間（WASM，在房主瀏覽器的 Web Worker 裡）用。房間不判定大家的曲子，只做：大廳、聊天、開始（對時）、跑電腦對手、收集每個人的進度並每秒廣播 15 次、曲子結束排名。線上房間用 WebRTC，可靠通道走大廳與指令，不可靠通道走進度與比賽影格。

斷線＝這一首棄權（判定在自己的電腦上，接不回來），重連會拿回座位、下一首照常。

### 配對服務（Cloudflare Workers）

程式在 [VirtualCore](https://github.com/YuutaTsubasa/VirtualCore) 的 `workers/signal/`（Virtual 系列五款共用），本作部署的名字是 `virtual-beat-battle-signal`，**還沒部署**（`src/lib/site.js` 的預設值已經指向它）。
配對服務連不上時，介面會自動藏起線上房間。部署（或改了程式重新部署）：

```bash
# 在 VirtualCore 的資料夾
npm --prefix workers/signal run deploy:beat
```

用量：比賽本身是 P2P、不經過這裡，只有加入房間時轉送幾則連線資訊（一次加入大約 5 個請求），
房間開著時 WebSocket 會休眠不計費。免費方案超過每日額度只會暫時連不上、不會收費；同一個 Cloudflare 帳號的幾個遊戲共用額度。

本機測試（VirtualCore clone 在旁邊的 `../VirtualCore`）：`npm --prefix ../VirtualCore/workers/signal run dev`（http://localhost:8787），在 `.env.development.local` 寫 `VITE_SIGNAL_SERVER=http://localhost:8787`。

區網房間預設通訊埠 **7822**（台麻 7777、排球 7788，可以同時開）。

## 程式結構

```
crates/beat-core/       遊戲引擎（Rust）
  charts.json              譜面（npm run charts 產生）
  src/songs.rs             曲子與譜面的資料、splitmix 亂數
  src/play.rs              一個玩家打一首：判定（±42/84/125ms）、連擊、技術分、傷害、魔王血量、體力、經驗值
  src/ai.rs                電腦玩家：開場決定每顆早晚多少、漏不漏，照時間按（跟真人同一套判定）
  src/room.rs              房間：十二個座位、電腦對手、收進度、排名
  src/protocol.rs          連線訊息（區網伺服器與線上房間共用）
  src/characters.rs        角色的小能力
crates/beat-wasm/       WebAssembly：自己的那一首（LocalPlay）與線上房主（HostRoom）
src-tauri/               Tauri v2 App＋區網伺服器（axum，/ws）
scripts/gen-charts.mjs   產生譜面
src/
  App.svelte               畫面切換（標題→選角→選魔王→打歌→結算；連線：大廳→比賽→名次）
  lib/engine.js            主迴圈：音樂的時鐘＝遊戲的時鐘、按鍵用事件的時間、回報進度
  lib/game/chartgen.js     譜面產生器
  lib/game/render.js       Canvas：背景、魔王、軌道、音符、角色與分身、特效、單人／並排／小卡片三種版面
  lib/game/input.js        六條軌道的輸入（鍵盤、手把、觸控）
  lib/game/progress.js     角色等級與經驗值、最佳成績（localStorage）
  lib/components/SongSelect.svelte  選魔王
```

### 跟 VirtualCore 共用的部分

[VirtualCore](https://github.com/YuutaTsubasa/VirtualCore) 是 Virtual 系列五款共用的程式，`package.json` 用 git tag 引用（`virtual-core`）：

- `virtual-core/audio/synth.js`、`audio/music.js`：PC-98 FM 音源與曲子播放器（`play` 的 `at`／`repeat` 讓音樂跟譜面對齊；`compile` 給譜面產生器）。本作的 `src/lib/audio/music.js` 只合併曲目表再轉出它們
- `virtual-core/net/p2p.js`、`net/site.js`：線上房間的 WebRTC 傳輸、房號與分享連結（本作的網址在 `src/lib/site.js`）
- `workers/signal/`：配對服務
- `.github/workflows/build-apps.yml`、`pages.yml`：這個 repo 的兩個 workflow 只是呼叫它們

本機要同時改 VirtualCore 時：`npm install ../VirtualCore` 暫時換成本機版本（不要 commit 這個改動）。

## 美術

- 角色半身像沿用虛擬台麻館的；角色動作圖、魔王、背景沿用虛擬跑跑樂（虛擬闖天下）的圖，六種畫面風格都有。
- 打擊用 punch1／punch2／kick、長押用 special、被打用 hurt。節奏遊戲專用的格子（左打、右打、橫掃、長押中、長押放）、音符與判定線的圖、正式 Logo、標題圖還沒有，先用程式畫或借相近的格子。
- Logo 目前是字排的，正式 Logo 交件後自動換。
