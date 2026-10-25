//! 房間：最多十二個座位（真人或電腦對手）、觀眾、聊天、開始／再一首／回大廳。
//! 不碰網路，伺服器（src-tauri/src/server.rs）或線上房主（crates/beat-wasm）每 1/60 秒呼叫 `tick()`。
//!
//! 節奏遊戲每個人打的都是同一份譜，彼此不會互相影響，所以曲子不在這裡打：
//! 每個人在自己的電腦上照自己的音樂時鐘判定（網路慢也不會影響手感），每秒幾次回報「分數、連擊、對魔王的傷害、體力」，
//! 房間收齊了再轉給大家（兩個人就左右並排，三個人以上旁邊排一列小小的）。比的是技術分。
//! 電腦對手由房間自己打（照影格換算成曲子的時間）。

use crate::ai::{Bot, Difficulty};
use crate::characters::{is_character, random_character};
use crate::play::Play;
use crate::songs::{is_song, song, songs, Level};
use rand::distributions::Alphanumeric;
use rand::rngs::SmallRng;
use rand::{Rng, SeedableRng};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

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

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SeatKind {
    Human,
    Bot,
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

pub struct Seat {
    pub name: String,
    pub character: String,
    pub kind: SeatKind,
    pub difficulty: Difficulty,
    pub token: String,
    pub connected: bool,
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

#[derive(Clone, Debug, Serialize)]
struct ChatLine {
    seat: Option<usize>,
    name: String,
    text: String,
    sys: bool,
}

const MAX_CHAT: usize = 60;

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

pub struct Room {
    pub seats: [Option<Seat>; MAX_PLAYERS],
    pub host_seat: Option<usize>,
    pub settings: Settings,
    pub race: Option<Race>,
    chat: Vec<ChatLine>,
    rng: SmallRng,
    /// 這一格比賽剛結束（大廳資訊要更新）
    pub ended_now: bool,
}

impl Default for Room {
    fn default() -> Self {
        Self::new(Settings::default())
    }
}

impl Room {
    pub fn new(settings: Settings) -> Self {
        Room {
            seats: Default::default(),
            host_seat: None,
            settings,
            race: None,
            chat: Vec::new(),
            rng: SmallRng::from_entropy(),
            ended_now: false,
        }
    }

    pub fn playing(&self) -> bool {
        self.race.is_some()
    }

    fn sys(&mut self, text: String) {
        self.chat.push(ChatLine { seat: None, name: String::new(), text, sys: true });
        if self.chat.len() > MAX_CHAT {
            self.chat.remove(0);
        }
    }

    pub fn push_chat(&mut self, seat: Option<usize>, text: &str) {
        let text: String = text.trim().chars().take(300).collect();
        if text.is_empty() {
            return;
        }
        let name = seat.and_then(|s| self.seats[s].as_ref()).map(|s| s.name.clone()).unwrap_or_else(|| "觀眾".into());
        self.chat.push(ChatLine { seat, name, text, sys: false });
        if self.chat.len() > MAX_CHAT {
            self.chat.remove(0);
        }
    }

    fn pick_character(&mut self, wanted: Option<&str>) -> String {
        match wanted {
            Some(c) if is_character(c) => c.to_string(),
            _ => random_character(&mut self.rng, &[]).to_string(),
        }
    }

    /// 真人入席，回傳（座位, 重新連線用的 token）。比賽中不能入席（改成觀戰）。
    pub fn join(&mut self, name: &str, character: Option<&str>) -> Result<(usize, String), String> {
        if self.playing() {
            return Err("比賽進行中".into());
        }
        let seat = self.seats.iter().position(|s| s.is_none()).ok_or("座位已滿")?;
        let name: String = name.trim().chars().take(16).collect();
        let name = if name.is_empty() { format!("玩家{}", seat + 1) } else { name };
        let token: String = (&mut self.rng).sample_iter(&Alphanumeric).take(24).map(char::from).collect();
        let character = self.pick_character(character);
        self.sys(format!("{} 坐到了 {}P", name, seat + 1));
        self.seats[seat] = Some(Seat { name, character, kind: SeatKind::Human, difficulty: self.settings.difficulty, token: token.clone(), connected: false });
        Ok((seat, token))
    }

    pub fn seat_of_token(&self, token: &str) -> Option<usize> {
        if token.is_empty() {
            return None;
        }
        self.seats.iter().position(|s| s.as_ref().is_some_and(|s| s.kind == SeatKind::Human && s.token == token))
    }

    pub fn connect(&mut self, seat: usize) {
        if let Some(s) = self.seats[seat].as_mut() {
            s.connected = true;
        }
    }

    /// 斷線：比賽中就算棄權（曲子在自己的電腦上打，接不回來）
    pub fn disconnect(&mut self, seat: usize) {
        let Some(s) = self.seats[seat].as_mut() else { return };
        s.connected = false;
        let name = s.name.clone();
        if self.retire(seat) {
            self.sys(format!("{} 斷線了，這一首先算棄權", name));
        }
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

    pub fn add_bot(&mut self, seat: Option<usize>, difficulty: Difficulty) -> Result<usize, String> {
        if self.playing() {
            return Err("比賽進行中".into());
        }
        let seat = match seat {
            Some(s) if s < MAX_PLAYERS && self.seats[s].is_none() => s,
            Some(_) => return Err("這個座位有人了".into()),
            None => self.seats.iter().position(|s| s.is_none()).ok_or("座位已滿")?,
        };
        let taken: Vec<String> = self.seats.iter().flatten().map(|s| s.character.clone()).collect();
        let taken: Vec<&str> = taken.iter().map(|s| s.as_str()).collect();
        let character = random_character(&mut self.rng, &taken).to_string();
        self.seats[seat] = Some(Seat {
            name: format!("電腦（{}）", difficulty.label()),
            character,
            kind: SeatKind::Bot,
            difficulty,
            token: String::new(),
            connected: true,
        });
        Ok(seat)
    }

    /// 離開座位（玩家自己離開或房主移除）。比賽中就算棄權。
    pub fn remove_seat(&mut self, seat: usize) -> Result<(), String> {
        let Some(s) = self.seats.get(seat).and_then(|s| s.as_ref()) else {
            return Err("這個座位沒有人".into());
        };
        let name = s.name.clone();
        self.retire(seat);
        if let Some(race) = self.race.as_mut() {
            race.entries.retain(|e| e.seat != seat);
        }
        self.seats[seat] = None;
        if self.host_seat == Some(seat) {
            self.host_seat = None;
        }
        self.sys(format!("{} 離開了座位", name));
        Ok(())
    }

    pub fn set_character(&mut self, seat: usize, id: &str) -> Result<(), String> {
        if self.playing() {
            return Err("比賽進行中不能換角色".into());
        }
        if !is_character(id) {
            return Err("沒有這個角色".into());
        }
        let s = self.seats[seat].as_mut().ok_or("你沒有座位")?;
        s.character = id.to_string();
        Ok(())
    }

    pub fn update_settings(&mut self, settings: Settings) {
        let song = if is_song(&settings.song) { settings.song } else { self.settings.song.clone() };
        self.settings = Settings { song, ..settings };
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

    /// 開始：有人的座位都上場
    pub fn start(&mut self) -> Result<(), String> {
        let (song_id, level) = (self.settings.song.clone(), self.settings.level);
        let seed: u64 = self.rng.gen();
        let mut entries = Vec::new();
        for (i, s) in self.seats.iter().enumerate() {
            let Some(s) = s else { continue };
            let bot = (s.kind == SeatKind::Bot).then(|| {
                let play = Play::new(&song_id, level, &s.character, s.difficulty.level());
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
        self.sys("魔王出現了！準備……".into());
        Ok(())
    }

    pub fn reset_to_lobby(&mut self) {
        self.race = None;
    }

    /// 前進一個影格。要送比賽影格的時候回傳 true。
    pub fn tick(&mut self) -> bool {
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
                let results = rank(race, &self.seats);
                let winner = results.first().and_then(|r| r["name"].as_str()).unwrap_or("").to_string();
                race.results = Some(results);
                self.ended_now = true;
                self.sys(format!("曲子結束！第一名：{}", winner));
            }
        }
        self.race.as_ref().is_some_and(|r| r.t % FRAME_EVERY == 0 || r.t == 1)
    }

    /// 大廳／房間資訊（有變動時送）
    pub fn view(&self, you: Option<usize>) -> Value {
        let seats: Vec<Value> = self
            .seats
            .iter()
            .map(|s| {
                s.as_ref().map_or(Value::Null, |s| {
                    json!({
                        "name": s.name,
                        "character": s.character,
                        "kind": s.kind,
                        "difficulty": s.difficulty,
                        "connected": s.connected,
                    })
                })
            })
            .collect();
        json!({
            "phase": if self.playing() { "playing" } else { "lobby" },
            "seats": seats,
            "host_seat": self.host_seat,
            "you": you,
            "settings": self.settings,
            "chat": self.chat,
        })
    }

    /// 比賽影格：大家的進度
    pub fn frame(&self) -> Option<Value> {
        let race = self.race.as_ref()?;
        let players: Vec<Value> = race
            .entries
            .iter()
            .map(|e| {
                let s = self.seats[e.seat].as_ref();
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
fn rank(race: &Race, seats: &[Option<Seat>; MAX_PLAYERS]) -> Vec<Value> {
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
