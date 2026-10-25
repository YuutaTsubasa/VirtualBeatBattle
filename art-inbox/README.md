# 美術收件匣（給 ChatGPT／Codex）：虛擬音鬥樂

6 鍵下落式節奏遊戲，主角是虛擬台麻館的 11 位角色：每一首歌都是一隻魔王，軌道一路通到魔王腳下，角色站在判定線上把音符打回去；
曲子有原創曲，也收錄了台麻館、排球王、闖天下、跑跑樂的曲子。介面照 `art-work/rhythm-ui-concept-v1/` 的概念圖（Blue Frequency）。
角色半身像、動作圖、闖天下的六大關背景與魔王**沿用其他專案已經交的圖**，這裡只畫音鬥樂才有的東西（見 `requests/`）。

Claude Code 在背景監看這個資料夾。**放進新檔案、而且兩分鐘內沒再變動**，Claude 就會醒來處理：接進遊戲、檢查畫面、在本機 commit。

**開始工作前請先看 `requests/`**，那裡是 Claude 寫給你的請求（要畫什麼、尺寸、對位規則）。

## 怎麼交件

1. 做好的圖放到這裡，二選一：
   - 壓縮檔：`art-inbox/<主題>.zip`（例如 `anime90-trial.zip`）
   - 資料夾：`art-inbox/<主題>/`（**先在別處做好再整個搬進來**，免得做到一半就被讀走）
2. 放好後在 `art-inbox/messages/` 寫一則留言，檔名 `時間-主題.md`（例如 `2026-10-24-0900-anime90-trial.md`），寫：
   - 這包是什麼、有幾張、哪些還沒做
   - 請求裡要你「回報」的實測數字（腳底位置、手的位置、地平線高度…），也可以放在 `layout-metrics.json`
   - 有沒有要 Claude 決定的事

只寫留言、不放檔案也可以，Claude 一樣會讀。

## 風格 ID（跟 TaiwanMahjong、VirtualVolleyball 一樣）

| ID | 名稱 |
| --- | --- |
| `anime90` | 90 年代（**先做這個**） |
| `pc98` | PC-98 |
| `msdos` | MS-DOS |
| `taiwan-print` | 台式印刷 |
| `gameboy` | Game Boy |
| `modern-paint` | 動漫電影 |

其他五種要等 90 年代版全部接好、使用者看過再做。

## 交件的資料夾結構

```
characters/<角色>/sprites/<動作>.png       512×512 透明、腳底在 (256, 496)；音鬥樂的動作是背面的 back-*（見請求）
bosses/<魔王>/<動作>.png                    768×768 透明、面向右、腳底在 (384, 744)
environment/<曲子 id>.png                   1920×1080，魔王的腳底在 (960, 400)，中間下方會被軌道蓋住
covers/<曲子 id>.png                        1024×1024 曲目封面，不要文字
ui/logo.png、ui/title-scene.png
layout-metrics.json、README、prompts（有的話）
```

- 角色 ID：`xiaocui` `yuehua` `aming` `tangtang` `xiaochun` `lanjie` `cangya` `jinye` `leo` `alie` `ayi`
- 魔王 ID（新的）：`conductor`（終焉指揮者）`neon-dj`（霓虹 DJ）`overdrive`（超載機兵）`jankui`（雀鬼）`blocker`（鐵壁攔網王）
- 曲子 ID（原創）：`og-edm`（霓虹頻率）`og-hardcore`（超速心跳）`og-speedcore`（終焉頻率）
- **角色半身像不用畫**：直接沿用虛擬台麻館的（已經接進來了，衣服就是麻將館那套）。動作圖的衣服要跟半身像一致。
- 像素風格請用**整數倍放大**交件，Claude 會用最近鄰縮放。

## Claude 的回覆與請求

- `art-inbox/requests/`：Claude 寫給你的請求。做完的請求請在留言裡註明檔名。
- `art-inbox/replies/`：Claude 處理完每一包的結果（接了什麼、缺什麼、要修什麼）。

## 等 Claude 的訊息（監聽）

```powershell
powershell -ExecutionPolicy Bypass -File art-inbox\wait-for-claude.ps1 -TimeoutMinutes 60
```

腳本會一直等到 `requests/` 或 `replies/` 出現新的 `.md`，把內容印出來後結束；處理完再執行一次繼續等。
