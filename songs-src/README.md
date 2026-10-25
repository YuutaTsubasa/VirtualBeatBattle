# 音檔曲子（Suno 之類）的放法

一首一個資料夾：`songs-src/<曲子 id>/`（id 用小寫英文與 `-`，例如 `suno-neon-rain`）。放好之後跑：

```bash
npm run import-song <曲子 id>
```

就會：把音檔轉成網頁用的 MP3（`public/audio/<id>.mp3`，192kbps、響度 -14 LUFS）、從 MIDI 排出四個難度的譜面、加進選曲畫面的「原創」。
音檔、分軌、MIDI 不會進 git（太大），進 git 的是 `song.json`、轉好的 MP3 和譜面。

## 要放什麼

| 檔案 | 說明 |
| --- | --- |
| 整首的音檔 | Suno 下載的 **WAV**（比較好）或 MP3 |
| 旋律的 MIDI | **一定要有**：譜面主要照旋律排。主唱或主旋律那一軌的 MIDI |
| 貝斯的 MIDI | 有的話 EXPERT 會把貝斯也排進去 |
| 鼓的 MIDI | 有的話困難以上的鼓點照它補；沒有就用最基本的四拍 |
| `song.json` | 見下面 |

**MIDI 怎麼來**：Suno 有分軌（Stems）與 MIDI 的下載就直接用。如果只有分軌的音檔，可以用 [Basic Pitch](https://basicpitch.spotify.com/)（Spotify 的免費網頁工具）把**旋律那一軌**、**貝斯那一軌**各自轉成 MIDI。
整首混在一起的音檔直接轉 MIDI 會很亂，一定要先分軌。鼓用 Basic Pitch 轉出來不準，沒有鼓的 MIDI 也沒關係。

## song.json

```json
{
  "title": "霓虹之雨",
  "bpm": 150,
  "offsetMs": 0,
  "audio": "song.wav",
  "parts": {
    "melody": "lead.mid",
    "bass": "bass.mid",
    "drums": "drums.mid"
  },
  "world": 0,
  "credit": "Suno（Pro）"
}
```

- `bpm`：**一定要準**（譜面靠它對齊拍子）。Suno 的提示詞裡寫了 BPM 的話就用那個；不確定就跟 Claude 說，可以從音檔估。
- `offsetMs`：音檔裡**第 1 拍**在第幾毫秒。從頭就是第 1 拍就寫 0；有前奏、或音檔開頭有空白，就寫第一個重拍的時間（Claude 可以幫忙找）。
- `parts.bass`、`parts.drums` 可以省略；`parts.melody` 可以是好幾個檔案的陣列（例如主唱＋主旋律合在一起）。
- `world`：魔王與背景用哪一大關（0 白色都市、1 草原森林、2 水下世界、3 冰山、4 火炎礦坑、5 邪惡城堡）。之後有專屬的魔王、背景可以再加 `boss`、`bg`；要讓角色當對手（像台麻館的主題曲）就加 `"rival": { "id": "lanjie", "name": "蘭姐" }`。
- `original`：這首是哪一首 PC-98 收錄曲的新版（例如 `"mj-title"`），選曲畫面會有「原曲」按鈕可以切過去聽、玩原本的版本。
- 授權：Suno 免費方案生成的曲子不能商用；要上架的話請用付費方案生成。`credit` 會記下來。

## 對齊不準的時候

Suno 的分軌 MIDI 加 `"tempoMap": true`（照 MIDI 的速度表對齊，速度會飄也沒關係）。MIDI 跟音檔差一點點的話（Claude 會先用鼓的分軌量）：
- `offsetBeats`：MIDI 的音整體偏離它自己的拍子格（例如 `-0.035`）
- `midiShiftMs`：音檔的聲音比 MIDI 早（負）或晚（正）幾毫秒（例如 `-33`）

玩的時候如果覺得音符整體太早或太晚，調 `offsetMs`（太早就加大、太晚就減小），再跑一次 `npm run import-song`。
