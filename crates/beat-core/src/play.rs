//! 一個玩家打一首曲子：判定、連擊、技術分、對魔王的傷害、自己的體力、經驗值。
//!
//! 時間一律用「從曲子開頭算的毫秒」，由呼叫的一方給（網頁用 AudioContext 的時鐘，房間的電腦對手用影格換算），
//! 所以畫面掉格也不會影響判定。按下／放開時帶著當下的時間呼叫 `press`／`release`，每個畫面影格呼叫 `update`
//! 讓錯過的音符變成 Miss。
//!
//! 戰鬥：打中音符就是反擊（傷害 = 攻擊力 × 判定倍率 × 連擊加成），Miss 或按到地雷就被魔王打。
//! 魔王的血量是「初始等級全 Perfect 大約打掉七成五」，要靠練等級（攻擊力）或打得更準才打得倒。
//! 體力歸零不會中斷曲子（照樣打完、照樣算技術分），只是這場戰鬥輸了、之後的攻擊不再有傷害。

use crate::characters::{ability_of, Ability};
use crate::songs::{song, Kind, Level, Note, Rng, Song, LANES};
use serde::Serialize;
use serde_json::{json, Value};

/// 判定範圍（毫秒，前後都算）
pub const PERFECT: i32 = 42;
pub const GREAT: i32 = 84;
pub const GOOD: i32 = 125;
/// 比 Good 還早按到：算 Miss（太早按會被吃掉）
pub const EARLY_MISS: i32 = 170;
/// 地雷的範圍
pub const MINE: i32 = 55;
/// 初始等級全 Perfect 打掉魔王血量的比例
pub const BOSS_RATIO: f64 = 0.75;
/// 魔王反擊（Miss）與地雷的傷害
const COUNTER: f64 = 4.0;
const MINE_HIT: f64 = 10.0;
/// 每打中一顆回多少體力（打得準的人不太會倒，連續漏掉一大段才會）
const REGEN: f64 = 0.4;
/// 每幾連擊多 5% 傷害
const COMBO_STEP: u32 = 50;

pub const MAX_LEVEL: u32 = 30;

/// 角色等級 → 攻擊力（每升一級 +7%）
pub fn atk_of_level(level: u32) -> f64 {
    100.0 * (1.0 + 0.07 * (level.clamp(1, MAX_LEVEL) - 1) as f64)
}

/// 升到下一級要的經驗值
pub fn xp_to_next(level: u32) -> u32 {
    120 + 60 * level
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Judge {
    #[serde(rename = "P")]
    Perfect,
    #[serde(rename = "G")]
    Great,
    #[serde(rename = "D")]
    Good,
    #[serde(rename = "M")]
    Miss,
}

impl Judge {
    fn of(offset: i32) -> Judge {
        match offset.abs() {
            d if d <= PERFECT => Judge::Perfect,
            d if d <= GREAT => Judge::Great,
            d if d <= GOOD => Judge::Good,
            _ => Judge::Miss,
        }
    }
    fn idx(self) -> usize {
        self as usize
    }
    /// 技術分的權重
    fn weight(self) -> f64 {
        match self {
            Judge::Perfect => 1.0,
            Judge::Great => 0.7,
            Judge::Good => 0.3,
            Judge::Miss => 0.0,
        }
    }
    fn ch(self) -> char {
        match self {
            Judge::Perfect => 'P',
            Judge::Great => 'G',
            Judge::Good => 'D',
            Judge::Miss => 'M',
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum St {
    Pending,
    /// 長押中（頭已經判定）
    Holding,
    Done(Judge),
    MineHit,
    MinePassed,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Part {
    Tap,
    Head,
    Tail,
}

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Event {
    /// 判定：i = 第幾顆音符、off = 早（負）晚（正）幾毫秒、dmg = 這一下的傷害、tail = 長押放開那一下
    Judge { i: usize, lane: usize, j: Judge, off: i32, dmg: u32, tail: bool, chord: bool },
    /// 長押開始
    Hold { i: usize, lane: usize },
    /// 按到地雷
    Mine { lane: usize, hurt: i32 },
    /// 被魔王反擊（Miss）
    Hurt { hurt: i32 },
    /// 擋下了反擊（阿翼）
    Parry,
    Heal { hp: i32 },
    /// 每 50 連擊
    Combo { n: u32 },
    BossDown,
    /// 自己的體力歸零（戰鬥輸了，曲子照樣打完）
    Down,
    End,
}

#[derive(Clone)]
pub struct Play {
    pub song: &'static Song,
    pub level: Level,
    pub character: String,
    notes: &'static [Note],
    st: Vec<St>,
    /// 這一顆是同時押（另一隻手那一側同一時間也有）
    chord: Vec<bool>,
    /// 第一顆還沒結束的音符
    scan: usize,
    pub t: i32,
    holding: [Option<usize>; LANES],
    pub pressed: [bool; LANES],
    pub ability: Ability,
    pub char_level: u32,
    atk: f64,
    pub combo: u32,
    pub max_combo: u32,
    /// Perfect、Great、Good、Miss 的次數
    pub counts: [u32; 4],
    /// 要判定的總次數（長押算兩次：按下與放開）
    total: u32,
    acc: f64,
    pub boss_max: u64,
    pub dmg: u64,
    /// 體力（顯示時無條件進位）
    life: f64,
    pub hp: i32,
    pub hp_max: i32,
    pub down: bool,
    pub killed: bool,
    xp: f64,
    pub events: Vec<Event>,
    pub ended: bool,
    rng: Rng,
}

impl Play {
    pub fn new(song_id: &str, level: Level, character: &str, char_level: u32) -> Play {
        let song = song(song_id);
        let notes = &song.chart(level).notes[..];
        let chord = notes
            .iter()
            .map(|n| n.kind == Kind::Tap && notes.iter().any(|m| m.kind == Kind::Tap && m.t == n.t && (m.lane < 3) != (n.lane < 3)))
            .collect();
        let total = notes.iter().filter(|n| n.kind == Kind::Tap).map(|n| if n.len > 0 { 2 } else { 1 }).sum();
        let ability = ability_of(character);
        let mut p = Play {
            song,
            level,
            character: character.to_string(),
            notes,
            st: vec![St::Pending; notes.len()],
            chord,
            scan: 0,
            t: i32::MIN / 2,
            holding: [None; LANES],
            pressed: [false; LANES],
            ability,
            char_level: char_level.clamp(1, MAX_LEVEL),
            atk: atk_of_level(char_level),
            combo: 0,
            max_combo: 0,
            counts: [0; 4],
            total,
            acc: 0.0,
            boss_max: 1,
            dmg: 0,
            life: ability.hp as f64,
            hp: ability.hp,
            hp_max: ability.hp,
            down: false,
            killed: false,
            xp: 0.0,
            events: Vec::new(),
            ended: false,
            rng: Rng::new(notes.len() as u64 * 7919 + char_level as u64),
        };
        p.boss_max = boss_hp(song_id, level);
        p
    }

    fn damage(&self, j: Judge, i: usize, part: Part) -> f64 {
        let a = &self.ability;
        let mult = match j {
            Judge::Perfect => a.perfect,
            Judge::Great => 0.7,
            Judge::Good if a.good_as_great => 0.7,
            Judge::Good => 0.3,
            Judge::Miss => 0.0,
        } as f64;
        let combo = 1.0 + ((self.combo / COMBO_STEP) as f64 * 0.05).min(a.combo_cap as f64);
        let chord = if self.chord[i] && part != Part::Tail { a.chord as f64 } else { 1.0 };
        let hold = if part == Part::Tail { a.hold as f64 } else { 1.0 };
        self.atk * a.atk as f64 * mult * combo * chord * hold
    }

    fn set_life(&mut self, life: f64) {
        self.life = life.clamp(0.0, self.hp_max as f64);
        self.hp = self.life.ceil() as i32;
    }

    fn hurt(&mut self, amount: f64) -> i32 {
        let h = amount * self.ability.guard as f64;
        if self.down {
            return 0;
        }
        self.set_life(self.life - h);
        if self.hp == 0 && !self.down {
            self.down = true;
            self.events.push(Event::Down);
        }
        h.round() as i32
    }

    fn judge(&mut self, i: usize, j: Judge, off: i32, part: Part) {
        let lane = self.notes[i].lane;
        self.counts[j.idx()] += 1;
        self.acc += j.weight();
        if j == Judge::Miss {
            self.combo = 0;
            self.events.push(Event::Judge { i, lane, j, off, dmg: 0, tail: part == Part::Tail, chord: self.chord[i] });
            if self.ability.parry > 0.0 && self.rng.chance(self.ability.parry) {
                self.events.push(Event::Parry);
            } else {
                let hurt = self.hurt(COUNTER);
                self.events.push(Event::Hurt { hurt });
            }
            return;
        }
        self.combo += 1;
        self.max_combo = self.max_combo.max(self.combo);
        if !self.down {
            self.set_life(self.life + REGEN);
        }
        let dmg = if self.down { 0.0 } else { self.damage(j, i, part) };
        let dmg = dmg.round() as u64;
        self.dmg += dmg;
        self.xp += match j {
            Judge::Perfect => 3.0,
            Judge::Great => 2.0,
            _ => 1.0,
        };
        self.events.push(Event::Judge { i, lane, j, off, dmg: dmg as u32, tail: part == Part::Tail, chord: self.chord[i] });
        if self.combo % COMBO_STEP == 0 {
            self.events.push(Event::Combo { n: self.combo });
        }
        if self.ability.heal_every > 0 && self.combo % self.ability.heal_every == 0 && !self.down && self.hp < self.hp_max {
            self.set_life(self.life + 8.0);
            self.events.push(Event::Heal { hp: 8 });
        }
        if !self.killed && self.dmg >= self.boss_max {
            self.killed = true;
            self.events.push(Event::BossDown);
        }
    }

    /// 時間往前走到 t：錯過的音符變 Miss、長押撐到最後自動成功
    pub fn update(&mut self, t: i32) {
        if t <= self.t || self.ended {
            return;
        }
        self.t = t;
        let mut i = self.scan;
        while i < self.notes.len() && self.notes[i].t - EARLY_MISS <= t {
            let n = self.notes[i];
            match self.st[i] {
                St::Pending if n.kind == Kind::Mine && t > n.t + MINE => self.st[i] = St::MinePassed,
                St::Pending if n.kind == Kind::Tap && t > n.t + GOOD => {
                    self.judge(i, Judge::Miss, GOOD + 1, if n.len > 0 { Part::Head } else { Part::Tap });
                    if n.len > 0 {
                        self.judge(i, Judge::Miss, GOOD + 1, Part::Tail);
                    }
                    self.st[i] = St::Done(Judge::Miss);
                }
                St::Holding if t >= n.end() => {
                    self.holding[n.lane] = None;
                    self.judge(i, Judge::Perfect, 0, Part::Tail);
                    self.st[i] = St::Done(Judge::Perfect);
                }
                _ => {}
            }
            i += 1;
        }
        while self.scan < self.notes.len() && matches!(self.st[self.scan], St::Done(_) | St::MineHit | St::MinePassed) {
            self.scan += 1;
        }
        if self.scan >= self.notes.len() && t >= self.song.length_ms {
            self.ended = true;
            self.events.push(Event::End);
        }
    }

    pub fn press(&mut self, lane: usize, t: i32) {
        if lane >= LANES || self.ended {
            return;
        }
        self.update(t);
        self.pressed[lane] = true;
        // 這一軌最近的一顆還沒打的音符（地雷另外找）
        let mut best: Option<(usize, i32)> = None;
        let mut mine: Option<usize> = None;
        let mut i = self.scan;
        while i < self.notes.len() && self.notes[i].t - EARLY_MISS <= t {
            let n = self.notes[i];
            if n.lane == lane && self.st[i] == St::Pending {
                let off = t - n.t;
                match n.kind {
                    Kind::Tap if off >= -EARLY_MISS && off <= GOOD => {
                        if best.is_none_or(|(_, o)| off.abs() < o.abs()) {
                            best = Some((i, off));
                        }
                    }
                    Kind::Mine if off.abs() <= MINE => mine = mine.or(Some(i)),
                    _ => {}
                }
            }
            i += 1;
        }
        if let Some((i, off)) = best {
            let n = self.notes[i];
            let j = Judge::of(off);
            if n.len > 0 {
                self.judge(i, j, off, Part::Head);
                if j == Judge::Miss {
                    self.judge(i, Judge::Miss, off, Part::Tail);
                    self.st[i] = St::Done(Judge::Miss);
                } else {
                    self.st[i] = St::Holding;
                    self.holding[lane] = Some(i);
                    self.events.push(Event::Hold { i, lane });
                }
            } else {
                self.judge(i, j, off, Part::Tap);
                self.st[i] = St::Done(j);
            }
        } else if let Some(i) = mine {
            self.st[i] = St::MineHit;
            self.combo = 0;
            let hurt = self.hurt(MINE_HIT);
            self.events.push(Event::Mine { lane, hurt });
        }
    }

    pub fn release(&mut self, lane: usize, t: i32) {
        if lane >= LANES {
            return;
        }
        self.update(t);
        self.pressed[lane] = false;
        if let Some(i) = self.holding[lane].take() {
            let end = self.notes[i].end();
            // 放開得比結束早一點點也算成功
            let j = if t >= end - GOOD { Judge::Perfect } else { Judge::Miss };
            self.judge(i, j, t - end, Part::Tail);
            self.st[i] = St::Done(j);
        }
    }

    /// 技術分（0～1,000,000），只看判定準不準
    pub fn score(&self) -> u32 {
        (self.acc / self.total.max(1) as f64 * 1_000_000.0).round() as u32
    }

    /// 這一場拿到的經驗值（打倒魔王多 50%）
    pub fn xp(&self) -> u32 {
        let bonus = if self.killed { 1.5 } else { 1.0 };
        (self.xp * self.ability.xp as f64 * bonus).round() as u32
    }

    /// 評價：SSS ～ D
    pub fn rank(&self) -> &'static str {
        match self.score() {
            s if s >= 990_000 => "SSS",
            s if s >= 970_000 => "SS",
            s if s >= 940_000 => "S",
            s if s >= 880_000 => "A",
            s if s >= 800_000 => "B",
            s if s >= 700_000 => "C",
            _ => "D",
        }
    }

    pub fn full_combo(&self) -> bool {
        self.counts[3] == 0
    }

    /// 每顆音符的狀態（畫面用）：0 還沒打、h 長押中、P/G/D/M 判定、x 踩到地雷、m 地雷過去了
    pub fn statuses(&self) -> String {
        self.st
            .iter()
            .map(|s| match s {
                St::Pending => '0',
                St::Holding => 'h',
                St::Done(j) => j.ch(),
                St::MineHit => 'x',
                St::MinePassed => 'm',
            })
            .collect()
    }

    /// 譜面（畫面用，開場拿一次）
    pub fn chart_json(&self) -> Value {
        let notes: Vec<Value> = self.notes.iter().zip(&self.chord).map(|(n, c)| json!([n.t, n.lane, n.len, if n.kind == Kind::Mine { 1 } else { 0 }, *c as u8])).collect();
        json!({ "song": self.song.id, "bpm": self.song.bpm, "length_ms": self.song.length_ms, "level": self.level, "rating": self.song.chart(self.level).rating, "notes": notes })
    }

    /// 目前的狀態（畫面用，每格拿一次；拿完就清掉事件）
    pub fn view(&mut self) -> Value {
        let v = json!({
            "t": self.t,
            "score": self.score(),
            "combo": self.combo,
            "max_combo": self.max_combo,
            "counts": self.counts,
            "total": self.total,
            "hp": self.hp,
            "hp_max": self.hp_max,
            "down": self.down,
            "dmg": self.dmg,
            "boss_max": self.boss_max,
            "killed": self.killed,
            "xp": self.xp(),
            "rank": self.rank(),
            "fc": self.full_combo(),
            "pressed": self.pressed,
            "holding": self.holding,
            "ended": self.ended,
            "events": self.events,
        });
        self.events.clear();
        v
    }
}

/// 魔王的血量：初始等級（攻擊 100）、沒有能力的角色全 Perfect 打出的傷害 ÷ 0.75
pub fn boss_hp(song_id: &str, level: Level) -> u64 {
    let notes = &song(song_id).chart(level).notes;
    let mut hits: Vec<(i32, bool)> = Vec::new();
    for n in notes.iter().filter(|n| n.kind == Kind::Tap) {
        let chord = notes.iter().any(|m| m.kind == Kind::Tap && m.t == n.t && (m.lane < 3) != (n.lane < 3));
        hits.push((n.t, chord));
        if n.len > 0 {
            hits.push((n.end(), false));
        }
    }
    hits.sort_by_key(|h| h.0);
    let mut total = 0.0;
    for (k, _) in hits.iter().enumerate() {
        let combo = (k + 1) as u32;
        total += 100.0 * (1.0 + ((combo / COMBO_STEP) as f64 * 0.05).min(0.3));
    }
    (total / BOSS_RATIO).round() as u64
}
