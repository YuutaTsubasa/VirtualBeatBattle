//! 曲子與譜面。譜面由前端的產生器（src/lib/game/chartgen.js）從 PC-98 曲子自動排出來，
//! `npm run charts` 寫成 charts.json，這裡用 include_str! 讀進來：單機判定、電腦對手、區網伺服器都用同一份。

use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

pub const LANES: usize = 6;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Level {
    Easy,
    #[default]
    Normal,
    Hard,
    Expert,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    Tap,
    /// 地雷：魔王的攻擊，按到會受傷
    Mine,
}

#[derive(Clone, Copy, Debug)]
pub struct Note {
    /// 判定時間（從曲子開頭算的毫秒）
    pub t: i32,
    pub lane: usize,
    /// 長押的長度（0 = 單點）
    pub len: i32,
    pub kind: Kind,
}

impl Note {
    pub fn end(&self) -> i32 {
        self.t + self.len
    }
}

pub struct Chart {
    pub rating: u32,
    pub notes: Vec<Note>,
}

pub struct Song {
    pub id: String,
    pub bpm: f32,
    pub length_ms: i32,
    pub easy: Chart,
    pub normal: Chart,
    pub hard: Chart,
    pub expert: Chart,
}

impl Song {
    pub fn chart(&self, level: Level) -> &Chart {
        match level {
            Level::Easy => &self.easy,
            Level::Normal => &self.normal,
            Level::Hard => &self.hard,
            Level::Expert => &self.expert,
        }
    }
}

#[derive(Deserialize)]
struct RawChart {
    rating: u32,
    notes: Vec<(i32, usize, i32, u8)>,
}

#[derive(Deserialize)]
struct RawSong {
    id: String,
    bpm: f32,
    length_ms: i32,
    charts: RawCharts,
}

#[derive(Deserialize)]
struct RawCharts {
    easy: RawChart,
    normal: RawChart,
    hard: RawChart,
    expert: RawChart,
}

#[derive(Deserialize)]
struct RawFile {
    songs: Vec<RawSong>,
}

fn chart_of(raw: RawChart) -> Chart {
    let notes = raw
        .notes
        .into_iter()
        .map(|(t, lane, len, kind)| Note { t, lane: lane.min(LANES - 1), len, kind: if kind == 1 { Kind::Mine } else { Kind::Tap } })
        .collect();
    Chart { rating: raw.rating, notes }
}

/// 全部曲子（第一次用到時解析 charts.json）
pub fn songs() -> &'static [Song] {
    static SONGS: OnceLock<Vec<Song>> = OnceLock::new();
    SONGS.get_or_init(|| {
        let raw: RawFile = serde_json::from_str(include_str!("../charts.json")).expect("charts.json 格式不對，重跑 npm run charts");
        raw.songs
            .into_iter()
            .map(|s| Song { id: s.id, bpm: s.bpm, length_ms: s.length_ms, easy: chart_of(s.charts.easy), normal: chart_of(s.charts.normal), hard: chart_of(s.charts.hard), expert: chart_of(s.charts.expert) })
            .collect()
    })
}

/// 用 id 找曲子；找不到就給第一首
pub fn song(id: &str) -> &'static Song {
    let all = songs();
    all.iter().find(|s| s.id == id).unwrap_or(&all[0])
}

pub fn is_song(id: &str) -> bool {
    songs().iter().any(|s| s.id == id)
}

/// 很小的亂數產生器（splitmix64）：同一個種子在原生與 WASM 都產生一樣的數字
#[derive(Clone)]
pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Self {
        Rng(seed ^ 0x9E37_79B9_7F4A_7C15)
    }
    pub fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }
    /// 0.0..1.0
    pub fn unit(&mut self) -> f32 {
        (self.next() >> 40) as f32 / (1u64 << 24) as f32
    }
    pub fn chance(&mut self, p: f32) -> bool {
        self.unit() < p
    }
}
