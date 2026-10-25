"""原創曲的旋律產生器：把「每小節一個和弦＋16 格的節奏型」寫成 MML（每個音都寫八度，每小節剛好 4 拍）。
用法：python scripts/compose-mml.py，把印出來的 MML 貼進 src/lib/audio/library/original.js 的主旋律（方波那一軌是高一個八度的同一段）。
寫新曲子：在下面的 SONGS 加一首（和弦進行＋每小節的節奏型），之後要細修可以直接改 original.js 裡的 MML。

節奏型的字：0～7 = 和弦音的階梯（0 根音、1 三度、2 五度、3 高八度根音…，往下用 a b c = -1 -2 -3）、
'-' = 延長前一個音、'.' = 休止。
"""
import sys

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
TYPES = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'sus4': [0, 5, 7], 'dim': [0, 3, 6]}
NAMES = ['c', 'c+', 'd', 'e-', 'e', 'f', 'f+', 'g', 'a-', 'a', 'b-', 'b']


def chord(name):
    root = NOTE[name[0]]
    rest = name[1:]
    if rest[:1] == '#':
        root += 1
        rest = rest[1:]
    elif rest[:1] == 'b':
        root -= 1
        rest = rest[1:]
    return root % 12, TYPES[rest]


def ladder(name, base_oct):
    """和弦音往上排：index 0 = base_oct 八度的根音"""
    root, iv = chord(name)
    root_midi = 12 * (base_oct + 1) + root
    tones = []
    for octv in range(-1, 4):
        for i in iv[:3]:
            tones.append(root_midi + 12 * octv + i)
    zero = 3  # 第 0 個 = base 八度的根音（前面有一組低八度）
    return tones, zero


DUR = {1: '16', 2: '8', 3: '8.', 4: '4', 6: '4.', 8: '2', 12: '2.', 16: '1'}


def dur_text(n):
    parts = []
    while n > 0:
        for k in (16, 12, 8, 6, 4, 3, 2, 1):
            if k <= n:
                parts.append(DUR[k])
                n -= k
                break
    return parts


def note_text(midi, steps):
    octave = midi // 12 - 1
    name = NAMES[midi % 12]
    parts = dur_text(steps)
    s = f'o{octave} {name}{parts[0]}'
    for p in parts[1:]:
        s += f'&{p}'
    return s


def rest_text(steps):
    return ' '.join(f'r{p}' for p in dur_text(steps))


def bar(chord_name, pattern, base_oct):
    assert len(pattern) == 16, pattern
    tones, zero = ladder(chord_name, base_oct)
    out = []
    i = 0
    while i < 16:
        ch = pattern[i]
        n = 1
        while i + n < 16 and pattern[i + n] == '-':
            n += 1
        if ch == '.':
            # 連續的休止合在一起
            while i + n < 16 and pattern[i + n] == '.':
                n += 1
            out.append(rest_text(n))
        elif ch == '-':
            out.append(rest_text(n))  # 小節開頭的延長：當休止
        else:
            idx = int(ch) if ch.isdigit() else -('abc'.index(ch) + 1)
            out.append(note_text(tones[zero + idx], n))
        i += n
    return ' '.join(out)


def song(prog, patterns, base_oct=5):
    chords = prog.split()
    assert len(chords) == len(patterns), (len(chords), len(patterns))
    bars = [bar(c, p, base_oct) for c, p in zip(chords, patterns)]
    lines = []
    for k in range(0, len(bars), 4):
        lines.append(' | '.join(bars[k:k + 4]))
    return ' |\n              '.join(lines)


SONGS = {
    # EDM（150）：F 小調，前 8 小節是八分音符的主題，後 8 小節是 Drop（十六分音符的 supersaw 琶音）
    'edm': dict(
        prog='Fm Db Ab Eb Fm Db Ab Eb Fm Db Ab Eb Bbm Gb Eb Eb',
        base=5,
        pats=[
            '0-2-3-2-4-3-2-1-',
            '1-2-3-4-3-2-1-0-',
            '0-2-3-4-5-4-3-2-',
            '1-3-4-3-2-1-0---',
            '0234320234565432',
            '1343101343565431',
            '0234320234565432',
            '4-3-2-1-0-b-0---',
            '0.30.320.34.3201',
            '1.31.431.43.4310',
            '0.30.320.34.3201',
            '3.43.543.54.5432',
            '0234543202345654',
            '1345431013454321',
            '0234565432345654',
            '3-------2---1---',
        ],
    ),
    # Hardcore（180）：A 小調，跳音很多的十六分音符、兩手交錯
    'hardcore': dict(
        prog='Am F C G Am F G E Am F C G Dm F E E',
        base=5,
        pats=[
            '0303242303242313',
            '0303242303242313',
            '0303242303454323',
            '1424313214243131',
            '0303242303242313',
            '0303242303242313',
            '1424353214243535',
            '2-1-0-b-0-1-2---',
            '0303454345456545',
            '0303454345456545',
            '0303454345456545',
            '1414535414545654',
            '0303454345456545',
            '0303454345456545',
            '2525424321b0b012',
            '0-------3---2-1-',
        ],
    ),
    # Speedcore 魔王曲（200）：D 小調混一點弗里吉安（Eb），顫音與快速上下行
    'speedcore': dict(
        prog='Dm Bb C A Dm Bb Gm A Dm Eb Dm Eb C Bb A A',
        base=5,
        pats=[
            '0303030345454545',
            '0303030345454545',
            '0303030345454545',
            '1313131324242424',
            '0123432101234321',
            '0123432101234321',
            '0123432101234321',
            '54321043210-----',
            '0303454303454303',
            '0303454303454303',
            '0303454303454303',
            '0303454303454303',
            '0123454321012345',
            '5432101234543210',
            '0123454321012345',
            '5-4-3-2-1-------',
        ],
    ),
}

for key, s in SONGS.items():
    print(f'=== {key}')
    print(song(s['prog'], s['pats'], s['base']))
