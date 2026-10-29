# VirtualBeatBattle b1 原圖交接

2026-10-30。內建 image_gen 生成，共 16 張 PNG，兩畫風各八張，逐張以 view_image 檢視。未用 Python，未裁切、縮放或量化，僅複製生成 PNG。未改 repo、未做 git 操作。

參考：public/ui、covers、games 對應原圖；各畫風 characters/xiaocui/normal.webp、games/volleyball-court.webp；VirtualRunners 同畫風 ui/logo.webp、title-scene.webp。指定 styles/stages 目錄不存在。games 原圖無魔王，保留空舞台；魔王只在封面。

品質：全部生成成功。兩張 Logo 保留五字橫排、英文副標與透明背景；鬥字採原圖方框式造型，接入前複核小尺寸辨識。taiwan-print 三張舞台較原作明亮、網點較強，若須嚴格維持夜景明度建議優先重畫；接入時確認音符對比。modern-paint 目前無必須重畫項目。各圖保留工具原始尺寸，交 Claude 用 Pillow 整理。

## taiwan-print/ui/logo.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Create one transparent PNG game logo for VirtualBeatBattle. Input 1 is the exact composition and lettering target: keep bold slanted five Traditional Chinese characters 虛擬音鬥樂 in one horizontal row, with small VIRTUAL BEAT BATTLE beneath, rhythmic waveform bolts at both sides. Input 2 is STYLE ONLY from sister game, do not copy its words. Restyle target in taiwan-print: thick dark navy ink outlines, cream edging, cyan and warm orange/red accents, tactile vintage Taiwan screenprint paper grain and halftone ink dots, flat ink shapes. Exact text 虛擬音鬥樂 and VIRTUAL BEAT BATTLE. Wide 2.5:1 composition, all elements fully inside with generous transparent margins, heavy readable lettering. Truly transparent background, no backdrop, no watermark, no ground shadow.
```

## taiwan-print/ui/title-scene.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve its subject identities, arrangement, camera, scale and environment. Other images are STYLE ONLY, do not import their scenery. Wide 16:9 title illustration: preserve the green twin-tailed girl with pink bows, teal eyes and white/teal sailor uniform with pink neck bow, occupying right half, reaching an open hand toward viewer, smiling. Preserve floating white futuristic spire islands with orbital rings among bright white clouds and blue sky on left, airy negative space left. Style: Taiwan vintage color screenprint illustration, thick dark navy ink contours, flat layered vivid cobalt/cyan, warm cream highlights and coral ink accents, visible fine paper grain, stippled halftone shading and slightly imperfect ink registration, exactly match supplied style references. Not pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Maintain original composition faithfully; change rendering medium only.
```

## taiwan-print/covers/og-edm.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Square cover: preserve low-angle white/navy angular neon DJ robot, cyan circular chest speaker, headphones and magenta equalizer visor, two enormous black vinyl-record forearm shields with cyan rims and pink centers, nearer shield fills lower left, neon cyan/magenta futuristic skyline and diagonal lasers. Style: Taiwan vintage color screenprint illustration, thick dark navy ink contours, flat layered vivid cobalt/cyan, warm cream highlights and coral ink accents, visible fine paper grain, stippled halftone shading and slightly imperfect ink registration, exactly match supplied style references. Not pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only.
```

## taiwan-print/covers/og-hardcore.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Square cover: preserve massive orange-red and charcoal armored overload mech lunging forward, huge right foreground clenched fist, orange circular chest reactor, twin flaming shoulder exhausts, striped cream armor panels, industrial speaker-lined tunnel, orange energy rings and rubble. Style: Taiwan vintage color screenprint illustration, thick dark navy ink contours, flat layered vivid cobalt/cyan, warm cream highlights and coral ink accents, visible fine paper grain, stippled halftone shading and slightly imperfect ink registration, exactly match supplied style references. Not pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only.
```

## taiwan-print/covers/og-speedcore.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Square cover: preserve elegant silver swept-hair masked male conductor in black flowing tailcoat with red lining, red waistcoat and white cravat, gloved hands conducting with thin baton, three-quarter low angle, spires floating in storm clouds, red/blue concentric waveform sky rings and curling luminous musical staffs. Style: Taiwan vintage color screenprint illustration, thick dark navy ink contours, flat layered vivid cobalt/cyan, warm cream highlights and coral ink accents, visible fine paper grain, stippled halftone shading and slightly imperfect ink registration, exactly match supplied style references. Not pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only.
```

## taiwan-print/games/og-edm.png

檢視：較原圖明亮，若須嚴格保持夜景明度則建議重畫。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Wide 16:9 empty gameplay arena, NO robot/characters. Preserve symmetrical broad dark rooftop platform in foreground, central rear steps, speakers and truss rails on both sides, dense futuristic skyline with equalizer light panels, purple night clouds and crossed cyan/magenta laser lines. Keep bottom half quiet and dark for gameplay. Style: Taiwan vintage color screenprint illustration, thick dark navy ink contours, flat layered vivid cobalt/cyan, warm cream highlights and coral ink accents, visible fine paper grain, stippled halftone shading and slightly imperfect ink registration, exactly match supplied style references. Not pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only.
```

## taiwan-print/games/og-hardcore.png

檢視：較原圖明亮，若須嚴格保持夜景明度則建議重畫。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Wide 16:9 empty gameplay arena, NO mech/characters. Preserve symmetrical cavernous industrial tunnel, orange/red energy rings around bright central rear reactor, speaker stacks along both walls, steel ribs overhead, rear stairs, vast unobstructed dark metal floor in bottom half. Style: Taiwan vintage color screenprint illustration, thick dark navy ink contours, flat layered vivid cobalt/cyan, warm cream highlights and coral ink accents, visible fine paper grain, stippled halftone shading and slightly imperfect ink registration, exactly match supplied style references. Not pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only.
```

## taiwan-print/games/og-speedcore.png

檢視：較原圖明亮，若須嚴格保持夜景明度則建議重畫。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Wide 16:9 empty gameplay arena, NO conductor/characters. Preserve symmetrical broad dark floating platform with rails and rear stairs, tall central needle spire, surrounding needle towers amid white clouds, threatening navy storm sky and enormous concentric red/blue waveform rings overhead, quiet dark bottom half. Style: Taiwan vintage color screenprint illustration, thick dark navy ink contours, flat layered vivid cobalt/cyan, warm cream highlights and coral ink accents, visible fine paper grain, stippled halftone shading and slightly imperfect ink registration, exactly match supplied style references. Not pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only.
```

## modern-paint/ui/logo.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Create one transparent PNG game logo for VirtualBeatBattle. Input 1 is exact composition/lettering target: preserve bold slanted Traditional Chinese 虛擬音鬥樂 in one horizontal row, small VIRTUAL BEAT BATTLE underneath, waveform lightning accents left and right. Input 2 is STYLE ONLY from sister game: copy painterly materials, NOT its words. Style modern-paint: very heavy dark navy outlines and cream edging, cyan/blue and orange illuminated painted lettering with visible elegant brush strokes, dimensional hand-painted highlights like supplied reference. Exact text 虛擬音鬥樂 (five characters: 虛 擬 音 鬥 樂), VIRTUAL BEAT BATTLE. Keep all details fully inside image with generous transparent margins, wide 2.5:1. Truly transparent background. No watermark, no backdrop or cast shadow.
```

## modern-paint/ui/title-scene.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery or extra characters. Wide 16:9 title illustration: preserve the green twin-tailed girl with pink bows, teal eyes and white/teal sailor uniform with pink neck bow, occupying right half, reaching an open hand toward viewer, smiling. Preserve floating white futuristic spire islands with orbital rings among bright white clouds and blue sky on left, airy negative space left. Style: Modern hand-painted anime illustration, delicate controlled contours, visible refined gouache/oil-like brushwork, softly blended luminous color and warm rim light, rich blue/teal with warm cream highlights, atmospheric depth, exactly match supplied style references. No print halftones, no pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only.
```

## modern-paint/covers/og-edm.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Square cover: preserve low-angle white/navy angular neon DJ robot, cyan circular chest speaker, headphones and magenta equalizer visor, two enormous black vinyl-record forearm shields with cyan rims and pink centers, nearer shield fills lower left, neon cyan/magenta futuristic skyline and diagonal lasers. Style: Modern hand-painted anime illustration, delicate controlled contours, visible refined gouache/oil-like brushwork, softly blended luminous color and warm rim light, rich blue/teal with warm cream highlights, atmospheric depth, exactly match supplied style references. No print halftones, no pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only.
```

## modern-paint/covers/og-hardcore.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Square cover: preserve massive orange-red and charcoal armored overload mech lunging forward, huge right foreground clenched fist, orange circular chest reactor, twin flaming shoulder exhausts, striped cream armor panels, industrial speaker-lined tunnel, orange energy rings and rubble. Style: Modern hand-painted anime illustration, delicate controlled contours, visible refined gouache/oil-like brushwork, softly blended luminous color and warm rim light, rich blue/teal with warm cream highlights, atmospheric depth, exactly match supplied style references. No print halftones, no pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only.
```

## modern-paint/covers/og-speedcore.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Square cover: preserve elegant silver swept-hair masked male conductor in black flowing tailcoat with red lining, red waistcoat and white cravat, gloved hands conducting with thin baton, three-quarter low angle, spires floating in storm clouds, red/blue concentric waveform sky rings and curling luminous musical staffs. Style: Modern hand-painted anime illustration, delicate controlled contours, visible refined gouache/oil-like brushwork, softly blended luminous color and warm rim light, rich blue/teal with warm cream highlights, atmospheric depth, exactly match supplied style references. No print halftones, no pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only.
```

## modern-paint/games/og-edm.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Wide 16:9 empty gameplay arena, NO robot/characters. Preserve symmetrical broad dark rooftop platform in foreground, central rear steps, speakers and truss rails on both sides, dense futuristic skyline with equalizer light panels, purple night clouds and crossed cyan/magenta laser lines. Keep bottom half quiet and dark for gameplay. Style: Modern hand-painted anime illustration, delicate controlled contours, visible refined gouache/oil-like brushwork, softly blended luminous color and warm rim light, rich blue/teal with warm cream highlights, atmospheric depth, exactly match supplied style references. No print halftones, no pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only. Preserve original dark foreground values despite brighter style references.
```

## modern-paint/games/og-hardcore.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Wide 16:9 empty gameplay arena, NO mech/characters. Preserve symmetrical cavernous industrial tunnel, orange/red energy rings around bright central rear reactor, speaker stacks along both walls, steel ribs overhead, rear stairs, vast unobstructed dark metal floor in bottom half. Style: Modern hand-painted anime illustration, delicate controlled contours, visible refined gouache/oil-like brushwork, softly blended luminous color and warm rim light, rich blue/teal with warm cream highlights, atmospheric depth, exactly match supplied style references. No print halftones, no pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only. Preserve original dark foreground values despite brighter style references.
```

## modern-paint/games/og-speedcore.png

檢視：可交接，無必須重畫項目。

完整提示詞：

```text
Use case: style-transfer. Produce exactly ONE finished raw PNG asset for VirtualBeatBattle. First image is content/composition target: preserve subject identity, arrangement, camera, scale, environment. Others are STYLE ONLY; do not import their scenery. Wide 16:9 empty gameplay arena, NO conductor/characters. Preserve symmetrical broad dark floating platform with rails and rear stairs, tall central needle spire, surrounding needle towers amid white clouds, threatening navy storm sky and enormous concentric red/blue waveform rings overhead, quiet dark bottom half. Style: Modern hand-painted anime illustration, delicate controlled contours, visible refined gouache/oil-like brushwork, softly blended luminous color and warm rim light, rich blue/teal with warm cream highlights, atmospheric depth, exactly match supplied style references. No print halftones, no pixel art, no glossy 3D. No text, letters, title, watermark, UI, border, or added cast shadows on ground. Change rendering medium only. Preserve original dark foreground values despite brighter style references.
```


