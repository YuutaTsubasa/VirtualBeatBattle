//! 房間：最多十二個座位（真人或電腦對手）、觀眾、聊天、開始／再一首／回大廳。
//! 座位、房主、聊天這些共通的部分在 VirtualCore 的 virtual-room（`Lobby`），這裡只放這款的比賽。
//! 不碰網路，伺服器（VirtualCore 的 virtual-lan）或線上房主（crates/beat-wasm）每 1/60 秒呼叫 `tick()`。
//!
//! 節奏遊戲每個人打的都是同一份譜，彼此不會互相影響，所以曲子不在這裡打：
//! 每個人在自己的電腦上照自己的音樂時鐘判定（網路慢也不會影響手感），每秒幾次回報「分數、連擊、對魔王的傷害、體力」，
//! 房間收齊了再轉給大家（兩個人就左右並排，三個人以上旁邊排一列小小的）。比的是技術分。
//! 電腦對手由房間自己打（照影格換算成曲子的時間）。

use crate::ai::{Bot, Difficulty};
use crate::characters::{is_character, random_character};
use crate::play::Play;
use crate::songs::{is_song, song, songs, Level};
use rand::rngs::SmallRng;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::ops::{Deref, DerefMut};
use virtual_room::{Game, Lobby, RoomGame};

pub use virtual_room::{Seat, SeatKind};

pub const MAX_PLAYERS: usize = 12;
/// 開始前的倒數（影格）；倒數結束的那一刻就是曲子的 0 毫秒
pub const COUNTDOWN: u32 = 180;
/// 曲子結束後最多再等幾格（有人的分頁卡住、回報沒到）
const END_GRACE: u32 = 6 * 60;
/// 比賽影格每幾格送一次（60 / 4 = 每秒 15 次）
const FRAME_EVERY: u32 = 4;

/// 影格 → 曲子的毫秒
pub fn song_ms(t: u32) -> i32 {
    ((t as i64 - COUNTDOWN as i64) * 1000 / 60) as i32
}

/// 玩家回報的進度（真人自己回報，電腦對手由房間算）
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct Progress {
    pub score: u32,
    pub combo: u32,
    pub max_combo: u32,
    /// Perfect、Great、Good、Miss
    pub counts: [u32; 4],
    pub dmg: u64,
    pub boss_max: u64,
    pub hp: i32,
    pub hp_max: i32,
    pub down: bool,
    pub killed: bool,
    /// 最近一次判定（P/G/D/M）與軌道（小畫面的動作用）
    pub j: String,
    pub lane: Option<usize>,
    /// 正在按的軌道（位元）與最近漏掉的音符（別人的小畫面用）
    pub keys: u8,
    pub miss: Vec<usize>,
    /// 角色等級（自己電腦上養的）
    pub lv: u32,
    pub rank: String,
    /// 打完了
    pub fin: bool,
    /// 棄權（斷線、離開）
    pub out: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// 電腦對手的強度
    pub difficulty: Difficulty,
    /// 曲子（= 魔王）
    pub song: String,
    /// 譜面難度
    pub level: Level,
}

impl Default for Settings {
    fn default() -> Self {
        Settings { difficulty: Difficulty::Normal, song: songs()[0].id.clone(), level: Level::Normal }
    }
}

struct Entry {
    seat: usize,
    bot: Option<(Play, Bot)>,
    p: Progress,
}

impl Entry {
    fn done(&self) -> bool {
        self.p.fin || self.p.out
    }
}

pub struct Race {
    pub song: String,
    pub level: Level,
    pub seed: u64,
    /// 開始後第幾格（含倒數）
    pub t: u32,
    entries: Vec<Entry>,
    /// 名次（比賽結束後才有）
    pub results: Option<Vec<Value>>,
}

/// 這款的房間規則
pub struct Beat;

impl Game for Beat {
    type Settings = Settings;
    type SeatState = ();
    const SEATS: usize = MAX_PLAYERS;

    fn joined_text(name: &str, seat: usize) -> String {
        format!("{} 坐到了 {}P", name, seat + 1)
    }
    fn is_character(id: &str) -> bool {
        is_character(id)
    }
    fn random_character(rng: &mut SmallRng, avoid: &[&str]) -> &'static str {
        random_character(rng, avoid)
    }
    /// 不認得的曲子換回預設曲
    fn clamp_settings(settings: Settings) -> Settings {
        if is_song(&settings.song) {
            settings
        } else {
            Settings { song: Settings::default().song, ..settings }
        }
    }
    fn seat_difficulty(settings: &Settings) -> Difficulty {
        settings.difficulty
    }
}

pub struct Room {
    pub lobby: Lobby<Beat>,
    pub race: Option<Race>,
    /// 這一格比賽剛結束（大廳資訊要更新）
    ended_now: bool,
}

impl Default for Room {
    fn default() -> Self {
        Self::new(Settings::default())
    }
}

// 座位、聊天、入席這些直接用大廳的（room.join(…)、room.seats…）
impl Deref for Room {
    type Target = Lobby<Beat>;
    fn deref(&self) -> &Lobby<Beat> {
        &self.lobby
    }
}

impl DerefMut for Room {
    fn deref_mut(&mut self) -> &mut Lobby<Beat> {
        &mut self.lobby
    }
}

impl Room {
    pub fn new(settings: Settings) -> Self {
        Room { lobby: Lobby::new(settings), race: None, ended_now: false }
    }

    /// 比賽中的這個座位算棄權；有改到就回傳 true
    fn retire(&mut self, seat: usize) -> bool {
        let Some(race) = self.race.as_mut() else { return false };
        match race.entries.iter_mut().find(|e| e.seat == seat && e.bot.is_none()) {
            Some(e) if !e.done() => {
                e.p.out = true;
                true
            }
            _ => false,
        }
    }

    /// 真人回報進度
    pub fn report(&mut self, seat: usize, p: Progress) {
        let Some(race) = self.race.as_mut() else { return };
        let Some(e) = race.entries.iter_mut().find(|e| e.seat == seat && e.bot.is_none()) else { return };
        // 已經結束的就不能再改（例如棄權之後晚到的封包）
        if e.done() {
            return;
        }
        e.p = p;
    }
}

impl RoomGame for Room {
    type Rules = Beat;

    fn lobby(&self) -> &Lobby<Beat> {
        &self.lobby
    }
    fn lobby_mut(&mut self) -> &mut Lobby<Beat> {
        &mut self.lobby
    }

    /// 開始：有人的座位都上場
    fn start(&mut self) -> Result<(), String> {
        let (song_id, level) = (self.lobby.settings.song.clone(), self.lobby.settings.level);
        let seed: u64 = self.lobby.rng.gen();
        let mut entries = Vec::new();
        for (i, s) in self.lobby.seats.iter().enumerate() {
            let Some(s) = s else { continue };
            let bot = (s.kind == SeatKind::Bot).then(|| {
                let play = Play::new(&song_id, level, &s.character, crate::ai::level(s.difficulty));
                let bot = Bot::new(&play, s.difficulty, seed ^ (i as u64 + 1) * 7919);
                (play, bot)
            });
            let mut p = Progress { hp: 100, hp_max: 100, lv: 1, ..Progress::default() };
            if let Some((play, _)) = &bot {
                p = progress_of(play);
            }
            entries.push(Entry { seat: i, bot, p });
        }
        if entries.is_empty() {
            return Err("沒有人上場".into());
        }
        self.race = Some(Race { song: song_id, level, seed, t: 0, entries, results: None });
        self.lobby.playing = true;
        self.lobby.sys("魔王出現了！準備……");
        Ok(())
    }

    fn reset_to_lobby(&mut self) {
        self.race = None;
        self.lobby.playing = false;
    }

    /// 真人回報的進度（`progress` 訊息）
    fn input(&mut self, seat: usize, msg: &Value) {
        if let Ok(p) = serde_json::from_value::<Progress>(msg.clone()) {
            self.report(seat, p);
        }
    }

    fn input_type() -> &'static str {
        "progress"
    }

    /// 斷線：比賽中就算棄權（各自在自己的電腦上打，電腦接不了手）
    fn disconnect(&mut self, seat: usize) {
        let Some(s) = self.lobby.seats[seat].as_mut() else { return };
        s.connected = false;
        let name = s.name.clone();
        if self.retire(seat) {
            self.lobby.sys(format!("{} 斷線了，這一首先算棄權", name));
        }
    }

    /// 離開座位（玩家自己離開或房主移除）。比賽中就算棄權，座位直接空出來。
    fn remove_seat(&mut self, seat: usize) -> Result<(), String> {
        if self.lobby.seats.get(seat).and_then(|s| s.as_ref()).is_none() {
            return Err("這個座位沒有人".into());
        }
        self.retire(seat);
        if let Some(race) = self.race.as_mut() {
            race.entries.retain(|e| e.seat != seat);
        }
        self.lobby.vacate(seat).map(|_| ())
    }

    /// 前進一個影格。要送比賽影格的時候回傳 true。
    fn tick(&mut self) -> bool {
        let Some(race) = self.race.as_mut() else { return false };
        race.t += 1;
        if race.results.is_none() {
            let ms = song_ms(race.t);
            for e in race.entries.iter_mut() {
                let Some((play, bot)) = e.bot.as_mut() else { continue };
                if play.ended {
                    continue;
                }
                bot.step(play, ms);
                play.events.clear();
                e.p = progress_of(play);
            }
            let length = song(&race.song).length_ms;
            let all_done = race.entries.iter().all(|e| e.done());
            let late = ms > length + (END_GRACE as i32 * 1000 / 60);
            if all_done || late {
                let results = rank(race, &self.lobby.seats);
                let winner = results.first().and_then(|r| r["name"].as_str()).unwrap_or("").to_string();
                race.results = Some(results);
                self.ended_now = true;
                self.lobby.sys(format!("曲子結束！第一名：{}", winner));
            }
        }
        self.race.as_ref().is_some_and(|r| r.t % FRAME_EVERY == 0 || r.t == 1)
    }

    /// 比賽影格：大家的進度
    fn frame(&self) -> Option<Value> {
        let race = self.race.as_ref()?;
        let players: Vec<Value> = race
            .entries
            .iter()
            .map(|e| {
                let s = self.lobby.seats[e.seat].as_ref();
                json!({
                    "seat": e.seat,
                    "name": s.map(|s| s.name.as_str()).unwrap_or(""),
                    "character": s.map(|s| s.character.as_str()).unwrap_or("xiaocui"),
                    "bot": e.bot.is_some(),
                    "p": e.p,
                })
            })
            .collect();
        Some(json!({
            "phase": if race.results.is_some() { "results" } else if race.t < COUNTDOWN { "countdown" } else { "playing" },
            "t": race.t,
            "seed": race.seed.to_string(),
            "song": race.song,
            "level": race.level,
            "players": players,
            "results": race.results,
        }))
    }

    fn just_ended(&mut self) -> bool {
        std::mem::take(&mut self.ended_now)
    }
}

/// 玩家的進度（電腦對手由房間算；真人的客戶端用同一個函式回報）
pub fn progress_of(play: &Play) -> Progress {
    Progress {
        score: play.score(),
        combo: play.combo,
        max_combo: play.max_combo,
        counts: play.counts,
        dmg: play.dmg,
        boss_max: play.boss_max,
        hp: play.hp,
        hp_max: play.hp_max,
        down: play.down,
        killed: play.killed,
        j: String::new(),
        lane: None,
        keys: play.keys(),
        miss: play.recent_miss.clone(),
        lv: play.char_level,
        rank: play.rank().to_string(),
        fin: play.ended,
        out: false,
    }
}

/// 名次（比賽結束時）：技術分高的贏；一樣的話對魔王傷害高的在前面
fn rank(race: &Race, seats: &[Option<Seat<()>>]) -> Vec<Value> {
    let mut order: Vec<&Entry> = race.entries.iter().collect();
    order.sort_by_key(|e| (e.p.out, std::cmp::Reverse(e.p.score), std::cmp::Reverse(e.p.dmg)));
    order
        .iter()
        .enumerate()
        .map(|(i, e)| {
            let s = seats[e.seat].as_ref();
            json!({
                "rank": i + 1,
                "seat": e.seat,
                "name": s.map(|s| s.name.as_str()).unwrap_or(""),
                "character": s.map(|s| s.character.as_str()).unwrap_or("xiaocui"),
                "bot": e.bot.is_some(),
                "out": e.p.out,
                "p": e.p,
            })
        })
        .collect()
}
