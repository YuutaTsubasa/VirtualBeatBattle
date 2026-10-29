# VirtualBeatBattle B2 原圖交件

2026-10-30。使用內建 imagegen 生成，共 24 張 PNG（每種畫風 8 張）。只複製工具原圖，沒有 Python、裁切、縮放、量化或其他圖像後製。未修改 repo，未執行 git。

## 檢查與限制

- 21 張非 Logo 圖已逐張看圖，人物／魔王／空場內容及主要構圖可用。
- 三張 Logo 需重畫：第四字「鬥」被生成成接近「門」的錯字。各追加一次字形修正仍失敗，而且改動了原裝飾位置，因此交件保留首輪較符合原構圖版本，不能當作文字正確的正式 Logo。
- 全部提示詞都要求硬像素、無漸層與反鋸齒，但工具原圖仍可能存在中間色及細微軟化。尤其 Game Boy 可見額外綠色過渡；未宣稱已通過精確四色驗證。後續依使用者安排由 Claude/Pillow 整理尺寸、錨點與色盤；若嚴格要求原圖即四色，Game Boy 這批仍需重畫。
- 三張 games 原圖本來是沒有魔王的空場，因此這批同樣沒有添加魔王。
- Game Boy stages 目錄無可讀圖；已看同風格角色、games 麻將背景、姊妹作 Logo 與標題圖。PC-98、MS-DOS 另看 city-1/far。
- 所有 Logo 均以 transparent_background=true 生成並原樣保留 alpha；其餘為完整不透明背景。

## pc98/ui/logo.png

檢查：需重畫；「鬥」字錯誤。保留首輪同構圖版本。

提示詞：

```text
Use case: style-transfer. Redraw image 1, the VirtualBeatBattle logo, in authentic PC-98 pixel art. Preserve exact composition, very bold slanted Chinese text 虛擬音鬥樂 and small subtitle VIRTUAL BEAT BATTLE, waveform ornaments and lightning. Image 2 is style reference only: match its crisp stepped pixel outlines and limited flat colors, not its words or icons. About 16 colors, dark indigo/purple outlines, warm cream gold highlights, teal accents. Clearly visible large square pixel grid, flat colors and ordered dithering only, no gradients, no antialiasing, no blur. Wide 1400:560 composition, all artwork fully inside canvas with padding. True transparent background, no ground shadow, no watermark.
```

額外重畫提示詞（未採用；字形仍不正確且構圖漂移）：

```text
Create a corrected VirtualBeatBattle logo as pixel art. The exact Traditional Chinese title is 虛擬音鬥樂. FIVE characters in one bold slanted horizontal row: 虛 / 擬 / 音 / 鬥 / 樂. CRITICAL fourth character 鬥 U+9B25: draw two opposing upright hooked fighting shapes, with inward horizontal bars at different heights and open space between; it has NO horizontal roof bridging the two sides. Do not draw 門, 閗, 闘, or 斗. Prioritize legible correct typography over stylization. Under it centered smaller uppercase VIRTUAL BEAT BATTLE. Waveform lightning ornaments on both sides, no other icons. Same wide horizontal layout and heavy strokes as a 1990s rhythm battle game logo, generous transparent padding all around. Authentic PC-98 pixel art, about 16 colors, dark indigo and purple outlines, warm cream peach gold highlights, muted teal, ordered dithering. Match reference pixel grid and shading. Reference is style only and has unrelated text; do not copy its words. Large hard square pixels, crisp stepped edges, flat colors, no gradients or antialiasing, no blur, no shadow, no watermark. TRUE transparent background. Wide 1400:560 composition.
```

## pc98/ui/title-scene.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle ui/title-scene. Redraw image 1 with exactly the same content and composition, changing only rendering into pc98 pixel art. Other input images are STYLE references only; do not import their subjects. Authentic PC-98 pixel art, about 16 colors, dark indigo and purple outlines, warm cream peach gold highlights, muted teal, ordered dithering. Match reference pixel grid and shading. Keep same green twin-tail schoolgirl Xiaocui on right, pink hair bows, teal sailor uniform, smiling and reaching open hand toward viewer. Keep floating white spire cities, orbital bridges, clouds and blue sky, empty scenery on left. Same pose, framing and perspective. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/ui/title-scene.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/pc98/characters/xiaocui/normal.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/../VirtualRunners/public/styles/pc98/ui/title-scene.webp

## pc98/covers/og-edm.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle covers/og-edm. Redraw image 1 with exactly the same content and composition, changing only rendering into pc98 pixel art. Other input images are STYLE references only; do not import their subjects. Authentic PC-98 pixel art, about 16 colors, dark indigo and purple outlines, warm cream peach gold highlights, muted teal, ordered dithering. Match reference pixel grid and shading. Keep identical boss design, pose, framing and environment from image 1. Square 1:1 album illustration. No lettering. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/covers/og-edm.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/pc98/games/mahjong-parlor.webp

## pc98/covers/og-hardcore.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle covers/og-hardcore. Redraw image 1 with exactly the same content and composition, changing only rendering into pc98 pixel art. Other input images are STYLE references only; do not import their subjects. Authentic PC-98 pixel art, about 16 colors, dark indigo and purple outlines, warm cream peach gold highlights, muted teal, ordered dithering. Match reference pixel grid and shading. Keep identical boss design, pose, framing and environment from image 1. Square 1:1 album illustration. No lettering. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/covers/og-hardcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/pc98/games/mahjong-parlor.webp

## pc98/covers/og-speedcore.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle covers/og-speedcore. Redraw image 1 with exactly the same content and composition, changing only rendering into pc98 pixel art. Other input images are STYLE references only; do not import their subjects. Authentic PC-98 pixel art, about 16 colors, dark indigo and purple outlines, warm cream peach gold highlights, muted teal, ordered dithering. Match reference pixel grid and shading. Keep identical boss design, pose, framing and environment from image 1. Square 1:1 album illustration. No lettering. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/covers/og-speedcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/pc98/games/mahjong-parlor.webp

## pc98/games/og-edm.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle games/og-edm. Redraw image 1 with exactly the same content and composition, changing only rendering into pc98 pixel art. Other input images are STYLE references only; do not import their subjects. Authentic PC-98 pixel art, about 16 colors, dark indigo and purple outlines, warm cream peach gold highlights, muted teal, ordered dithering. Match reference pixel grid and shading. Preserve empty battle arena exactly: same horizon height, centered distant steps, wide open dark foreground, side rails and architecture, same perspective and scene objects. Do not add any boss or character. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/games/og-edm.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/pc98/games/mahjong-parlor.webp

## pc98/games/og-hardcore.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle games/og-hardcore. Redraw image 1 with exactly the same content and composition, changing only rendering into pc98 pixel art. Other input images are STYLE references only; do not import their subjects. Authentic PC-98 pixel art, about 16 colors, dark indigo and purple outlines, warm cream peach gold highlights, muted teal, ordered dithering. Match reference pixel grid and shading. Preserve empty battle arena exactly: same horizon height, centered distant steps, wide open dark foreground, side rails and architecture, same perspective and scene objects. Do not add any boss or character. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/games/og-hardcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/pc98/games/mahjong-parlor.webp

## pc98/games/og-speedcore.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle games/og-speedcore. Redraw image 1 with exactly the same content and composition, changing only rendering into pc98 pixel art. Other input images are STYLE references only; do not import their subjects. Authentic PC-98 pixel art, about 16 colors, dark indigo and purple outlines, warm cream peach gold highlights, muted teal, ordered dithering. Match reference pixel grid and shading. Preserve empty battle arena exactly: same horizon height, centered distant steps, wide open dark foreground, side rails and architecture, same perspective and scene objects. Do not add any boss or character. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/games/og-speedcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/pc98/games/mahjong-parlor.webp

## msdos/ui/logo.png

檢查：需重畫；「鬥」字錯誤。保留首輪同構圖版本。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle ui/logo. Redraw image 1 with exactly the same content and composition, changing only rendering into msdos pixel art. Other input images are STYLE references only; do not import their subjects. Authentic MS-DOS EGA 16-color pixel art. Use ONLY #000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA #555555 #5555FF #55FF55 #55FFFF #FF5555 #FF55FF #FFFF55 #FFFFFF. Bold black stepped outlines, flat color blocks, sparse ordered dithering. Preserve original layout: single line of FIVE exact bold slanted Traditional Chinese glyphs 「虛」「擬」「音」「鬥」「樂」, including the complex fourth glyph 鬥 (NOT 門). Subtitle exactly VIRTUAL BEAT BATTLE. Keep flanking waveform lightning ornaments. Bold thick readable strokes; entire logo inside frame with padding. True transparent background. Wide 1400:560 aspect. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No additional text.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/ui/logo.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/../VirtualRunners/public/styles/msdos/ui/logo.webp

額外重畫提示詞（未採用；字形仍不正確且構圖漂移）：

```text
Create a corrected VirtualBeatBattle logo as pixel art. The exact Traditional Chinese title is 虛擬音鬥樂. FIVE characters in one bold slanted horizontal row: 虛 / 擬 / 音 / 鬥 / 樂. CRITICAL fourth character 鬥 U+9B25: draw two opposing upright hooked fighting shapes, with inward horizontal bars at different heights and open space between; it has NO horizontal roof bridging the two sides. Do not draw 門, 閗, 闘, or 斗. Prioritize legible correct typography over stylization. Under it centered smaller uppercase VIRTUAL BEAT BATTLE. Waveform lightning ornaments on both sides, no other icons. Same wide horizontal layout and heavy strokes as a 1990s rhythm battle game logo, generous transparent padding all around. Authentic MS-DOS EGA 16-color pixel art. Use ONLY #000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA #555555 #5555FF #55FF55 #55FFFF #FF5555 #FF55FF #FFFF55 #FFFFFF. Bold black stepped outlines, flat color blocks, sparse ordered dithering. Reference is style only and has unrelated text; do not copy its words. Large hard square pixels, crisp stepped edges, flat colors, no gradients or antialiasing, no blur, no shadow, no watermark. TRUE transparent background. Wide 1400:560 composition.
```

## msdos/ui/title-scene.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle ui/title-scene. Redraw image 1 with exactly the same content and composition, changing only rendering into msdos pixel art. Other input images are STYLE references only; do not import their subjects. Authentic MS-DOS EGA 16-color pixel art. Use ONLY #000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA #555555 #5555FF #55FF55 #55FFFF #FF5555 #FF55FF #FFFF55 #FFFFFF. Bold black stepped outlines, flat color blocks, sparse ordered dithering. Keep same green twin-tail schoolgirl Xiaocui on right, pink hair bows, teal sailor uniform, smiling and reaching open hand toward viewer. Keep floating white spire cities, orbital bridges, clouds and blue sky, empty scenery on left. Same pose, framing and perspective. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/ui/title-scene.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/msdos/characters/xiaocui/normal.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/../VirtualRunners/public/styles/msdos/ui/title-scene.webp

## msdos/covers/og-edm.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle covers/og-edm. Redraw image 1 with exactly the same content and composition, changing only rendering into msdos pixel art. Other input images are STYLE references only; do not import their subjects. Authentic MS-DOS EGA 16-color pixel art. Use ONLY #000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA #555555 #5555FF #55FF55 #55FFFF #FF5555 #FF55FF #FFFF55 #FFFFFF. Bold black stepped outlines, flat color blocks, sparse ordered dithering. Keep identical boss design, pose, framing and environment from image 1. Square 1:1 album illustration. No lettering. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/covers/og-edm.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/msdos/games/mahjong-parlor.webp

## msdos/covers/og-hardcore.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle covers/og-hardcore. Redraw image 1 with exactly the same content and composition, changing only rendering into msdos pixel art. Other input images are STYLE references only; do not import their subjects. Authentic MS-DOS EGA 16-color pixel art. Use ONLY #000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA #555555 #5555FF #55FF55 #55FFFF #FF5555 #FF55FF #FFFF55 #FFFFFF. Bold black stepped outlines, flat color blocks, sparse ordered dithering. Keep identical boss design, pose, framing and environment from image 1. Square 1:1 album illustration. No lettering. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/covers/og-hardcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/msdos/games/mahjong-parlor.webp

## msdos/covers/og-speedcore.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle covers/og-speedcore. Redraw image 1 with exactly the same content and composition, changing only rendering into msdos pixel art. Other input images are STYLE references only; do not import their subjects. Authentic MS-DOS EGA 16-color pixel art. Use ONLY #000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA #555555 #5555FF #55FF55 #55FFFF #FF5555 #FF55FF #FFFF55 #FFFFFF. Bold black stepped outlines, flat color blocks, sparse ordered dithering. Keep identical boss design, pose, framing and environment from image 1. Square 1:1 album illustration. No lettering. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/covers/og-speedcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/msdos/games/mahjong-parlor.webp

## msdos/games/og-edm.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle games/og-edm. Redraw image 1 with exactly the same content and composition, changing only rendering into msdos pixel art. Other input images are STYLE references only; do not import their subjects. Authentic MS-DOS EGA 16-color pixel art. Use ONLY #000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA #555555 #5555FF #55FF55 #55FFFF #FF5555 #FF55FF #FFFF55 #FFFFFF. Bold black stepped outlines, flat color blocks, sparse ordered dithering. Preserve empty battle arena exactly: same horizon height, centered distant steps, wide open dark foreground, side rails and architecture, same perspective and scene objects. Do not add any boss or character. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/games/og-edm.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/msdos/games/mahjong-parlor.webp

## msdos/games/og-hardcore.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle games/og-hardcore. Redraw image 1 with exactly the same content and composition, changing only rendering into msdos pixel art. Other input images are STYLE references only; do not import their subjects. Authentic MS-DOS EGA 16-color pixel art. Use ONLY #000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA #555555 #5555FF #55FF55 #55FFFF #FF5555 #FF55FF #FFFF55 #FFFFFF. Bold black stepped outlines, flat color blocks, sparse ordered dithering. Preserve empty battle arena exactly: same horizon height, centered distant steps, wide open dark foreground, side rails and architecture, same perspective and scene objects. Do not add any boss or character. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/games/og-hardcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/msdos/games/mahjong-parlor.webp

## msdos/games/og-speedcore.png

檢查：構圖可用，無需因內容重畫；後續整理色盤及尺寸。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle games/og-speedcore. Redraw image 1 with exactly the same content and composition, changing only rendering into msdos pixel art. Other input images are STYLE references only; do not import their subjects. Authentic MS-DOS EGA 16-color pixel art. Use ONLY #000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA #555555 #5555FF #55FF55 #55FFFF #FF5555 #FF55FF #FFFF55 #FFFFFF. Bold black stepped outlines, flat color blocks, sparse ordered dithering. Preserve empty battle arena exactly: same horizon height, centered distant steps, wide open dark foreground, side rails and architecture, same perspective and scene objects. Do not add any boss or character. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/games/og-speedcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/msdos/games/mahjong-parlor.webp

## gameboy/ui/logo.png

檢查：需重畫；「鬥」字錯誤。保留首輪同構圖版本。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle ui/logo. Redraw image 1 with exactly the same content and composition, changing only rendering into gameboy pixel art. Other input images are STYLE references only; do not import their subjects. Authentic original Game Boy pixel art. Use ONLY four opaque colors #0F380F #306230 #8BAC0F #9BBC0F. Clear silhouette, stepped outlines, ordered dithering for tone. No other colors. Preserve original layout: single line of FIVE exact bold slanted Traditional Chinese glyphs 「虛」「擬」「音」「鬥」「樂」, including the complex fourth glyph 鬥 (NOT 門). Subtitle exactly VIRTUAL BEAT BATTLE. Keep flanking waveform lightning ornaments. Bold thick readable strokes; entire logo inside frame with padding. True transparent background. Wide 1400:560 aspect. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No additional text.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/ui/logo.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/../VirtualRunners/public/styles/gameboy/ui/logo.webp

額外重畫提示詞（未採用；字形仍不正確且構圖漂移）：

```text
Create a corrected VirtualBeatBattle logo as pixel art. The exact Traditional Chinese title is 虛擬音鬥樂. FIVE characters in one bold slanted horizontal row: 虛 / 擬 / 音 / 鬥 / 樂. CRITICAL fourth character 鬥 U+9B25: draw two opposing upright hooked fighting shapes, with inward horizontal bars at different heights and open space between; it has NO horizontal roof bridging the two sides. Do not draw 門, 閗, 闘, or 斗. Prioritize legible correct typography over stylization. Under it centered smaller uppercase VIRTUAL BEAT BATTLE. Waveform lightning ornaments on both sides, no other icons. Same wide horizontal layout and heavy strokes as a 1990s rhythm battle game logo, generous transparent padding all around. Authentic original Game Boy pixel art. Use ONLY four opaque colors #0F380F #306230 #8BAC0F #9BBC0F. Clear silhouette, stepped outlines, ordered dithering for tone. No other colors. Reference is style only and has unrelated text; do not copy its words. Large hard square pixels, crisp stepped edges, flat colors, no gradients or antialiasing, no blur, no shadow, no watermark. TRUE transparent background. Wide 1400:560 composition.
```

## gameboy/ui/title-scene.png

檢查：構圖可用；不滿意處為額外綠色過渡／局部軟化，嚴格四色原圖需重畫。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle ui/title-scene. Redraw image 1 with exactly the same content and composition, changing only rendering into gameboy pixel art. Other input images are STYLE references only; do not import their subjects. Authentic original Game Boy pixel art. Use ONLY four opaque colors #0F380F #306230 #8BAC0F #9BBC0F. Clear silhouette, stepped outlines, ordered dithering for tone. No other colors. Keep same green twin-tail schoolgirl Xiaocui on right, pink hair bows, teal sailor uniform, smiling and reaching open hand toward viewer. Keep floating white spire cities, orbital bridges, clouds and blue sky, empty scenery on left. Same pose, framing and perspective. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/ui/title-scene.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/gameboy/characters/xiaocui/normal.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/../VirtualRunners/public/styles/gameboy/ui/title-scene.webp

## gameboy/covers/og-edm.png

檢查：構圖可用；不滿意處為額外綠色過渡／局部軟化，嚴格四色原圖需重畫。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle covers/og-edm. Redraw image 1 with exactly the same content and composition, changing only rendering into gameboy pixel art. Other input images are STYLE references only; do not import their subjects. Authentic original Game Boy pixel art. Use ONLY four opaque colors #0F380F #306230 #8BAC0F #9BBC0F. Clear silhouette, stepped outlines, ordered dithering for tone. No other colors. Keep identical boss design, pose, framing and environment from image 1. Square 1:1 album illustration. No lettering. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/covers/og-edm.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/gameboy/games/mahjong-parlor.webp

## gameboy/covers/og-hardcore.png

檢查：構圖可用；不滿意處為額外綠色過渡／局部軟化，嚴格四色原圖需重畫。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle covers/og-hardcore. Redraw image 1 with exactly the same content and composition, changing only rendering into gameboy pixel art. Other input images are STYLE references only; do not import their subjects. Authentic original Game Boy pixel art. Use ONLY four opaque colors #0F380F #306230 #8BAC0F #9BBC0F. Clear silhouette, stepped outlines, ordered dithering for tone. No other colors. Keep identical boss design, pose, framing and environment from image 1. Square 1:1 album illustration. No lettering. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/covers/og-hardcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/gameboy/games/mahjong-parlor.webp

## gameboy/covers/og-speedcore.png

檢查：構圖可用；不滿意處為額外綠色過渡／局部軟化，嚴格四色原圖需重畫。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle covers/og-speedcore. Redraw image 1 with exactly the same content and composition, changing only rendering into gameboy pixel art. Other input images are STYLE references only; do not import their subjects. Authentic original Game Boy pixel art. Use ONLY four opaque colors #0F380F #306230 #8BAC0F #9BBC0F. Clear silhouette, stepped outlines, ordered dithering for tone. No other colors. Keep identical boss design, pose, framing and environment from image 1. Square 1:1 album illustration. No lettering. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/covers/og-speedcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/gameboy/games/mahjong-parlor.webp

## gameboy/games/og-edm.png

檢查：構圖可用；不滿意處為額外綠色過渡／局部軟化，嚴格四色原圖需重畫。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle games/og-edm. Redraw image 1 with exactly the same content and composition, changing only rendering into gameboy pixel art. Other input images are STYLE references only; do not import their subjects. Authentic original Game Boy pixel art. Use ONLY four opaque colors #0F380F #306230 #8BAC0F #9BBC0F. Clear silhouette, stepped outlines, ordered dithering for tone. No other colors. Preserve empty battle arena exactly: same horizon height, centered distant steps, wide open dark foreground, side rails and architecture, same perspective and scene objects. Do not add any boss or character. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/games/og-edm.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/gameboy/games/mahjong-parlor.webp

## gameboy/games/og-hardcore.png

檢查：構圖可用；不滿意處為額外綠色過渡／局部軟化，嚴格四色原圖需重畫。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle games/og-hardcore. Redraw image 1 with exactly the same content and composition, changing only rendering into gameboy pixel art. Other input images are STYLE references only; do not import their subjects. Authentic original Game Boy pixel art. Use ONLY four opaque colors #0F380F #306230 #8BAC0F #9BBC0F. Clear silhouette, stepped outlines, ordered dithering for tone. No other colors. Preserve empty battle arena exactly: same horizon height, centered distant steps, wide open dark foreground, side rails and architecture, same perspective and scene objects. Do not add any boss or character. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/games/og-hardcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/gameboy/games/mahjong-parlor.webp

## gameboy/games/og-speedcore.png

檢查：構圖可用；不滿意處為額外綠色過渡／局部軟化，嚴格四色原圖需重畫。

提示詞：

```text
Use case: style-transfer. Asset: VirtualBeatBattle games/og-speedcore. Redraw image 1 with exactly the same content and composition, changing only rendering into gameboy pixel art. Other input images are STYLE references only; do not import their subjects. Authentic original Game Boy pixel art. Use ONLY four opaque colors #0F380F #306230 #8BAC0F #9BBC0F. Clear silhouette, stepped outlines, ordered dithering for tone. No other colors. Preserve empty battle arena exactly: same horizon height, centered distant steps, wide open dark foreground, side rails and architecture, same perspective and scene objects. Do not add any boss or character. Wide 16:9. Draw directly as pixel art with clearly visible large square pixels, consistent grid, hard stepped edges, flat limited colors. No gradients, no antialiasing, no smooth painting, no blur, no watermark, no UI, no ground cast shadows. No text or symbols that resemble lettering.
```

輸入參考：
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/games/og-speedcore.webp
- C:/Users/Shadow/Data/10_Projects/Virtual/VirtualBeatBattle/public/styles/gameboy/games/mahjong-parlor.webp


