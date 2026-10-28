//! 把遊戲引擎包成 WebAssembly，在瀏覽器裡跑：
//! - `LocalPlay`：自己打一首曲子（單機、連線時也是自己的那一首在自己的電腦上判定），時間由 JS 的音樂時鐘給
//! - `HostRoom`：線上房間的房主（瀏覽器就是伺服器），在 Web Worker 裡跑（見 src/lib/local/host-worker.js）
//!
//! LocalPlay 的用法（見 src/lib/engine.js）：
//!   const play = new LocalPlay('city', 'normal', 'xiaocui', 5);
//!   const chart = JSON.parse(play.chart());   // 譜面（開場拿一次）
//!   play.press(lane, ms); play.release(lane, ms); play.update(ms);
//!   const view = JSON.parse(play.state());    // 分數、連擊、魔王血量、這一格的事件
//!   const s = play.statuses();                // 每顆音符的狀態（一個字一顆）
//!   const p = play.progress();                // 連線時回報給房主的進度（JSON 文字）

use beat_core::ai::{Bot, Difficulty};
use beat_core::play::Play;
use beat_core::room::{progress_of, Room};
use beat_core::songs::Level;
use serde_json::Value;
use virtual_room::host;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct LocalPlay {
    play: Play,
    bot: Option<Bot>,
    /// 最近一次判定與軌道（連線回報用，小畫面的動作）
    last: (String, Option<usize>),
}

#[wasm_bindgen]
impl LocalPlay {
    /// level：easy | normal | hard；lv：角色等級
    #[wasm_bindgen(constructor)]
    pub fn new(song: &str, level: &str, character: &str, lv: u32) -> LocalPlay {
        let level: Level = serde_json::from_value(Value::String(level.into())).unwrap_or_default();
        LocalPlay { play: Play::new(song, level, character, lv), bot: None, last: (String::new(), None) }
    }

    /// 交給電腦打（示範用）：difficulty = easy | normal | hard
    #[wasm_bindgen(js_name = setAi)]
    pub fn set_ai(&mut self, difficulty: &str) {
        let d: Difficulty = serde_json::from_value(Value::String(difficulty.into())).unwrap_or_default();
        self.bot = Some(Bot::new(&self.play, d, js_seed()));
    }

    pub fn press(&mut self, lane: usize, ms: i32) {
        if self.bot.is_none() {
            self.play.press(lane, ms);
        }
    }

    pub fn release(&mut self, lane: usize, ms: i32) {
        if self.bot.is_none() {
            self.play.release(lane, ms);
        }
    }

    pub fn update(&mut self, ms: i32) {
        match self.bot.as_mut() {
            Some(bot) => bot.step(&mut self.play, ms),
            None => self.play.update(ms),
        }
    }

    pub fn chart(&self) -> String {
        self.play.chart_json().to_string()
    }

    /// 這一格的狀態與事件（拿完事件就清掉）
    pub fn state(&mut self) -> String {
        let v = self.play.view();
        if let Some(e) = v["events"].as_array().and_then(|es| es.iter().rev().find(|e| e["type"] == "judge")) {
            self.last = (e["j"].as_str().unwrap_or("").to_string(), e["lane"].as_u64().map(|l| l as usize));
        }
        v.to_string()
    }

    pub fn statuses(&self) -> String {
        self.play.statuses()
    }

    pub fn done(&self) -> bool {
        self.play.ended
    }

    /// 連線時回報給房主的進度
    pub fn progress(&self) -> String {
        let mut p = progress_of(&self.play);
        p.j = self.last.0.clone();
        p.lane = self.last.1;
        serde_json::to_string(&p).unwrap_or_default()
    }
}

/// 線上房間：跟區網伺服器（VirtualCore 的 virtual-lan）一樣的房間與訊息，只是不碰網路。
/// 連線用數字 id（0 是房主自己），JS 把收到的 JSON 交給 `message()`，
/// 每格呼叫 `tick()` 拿影格，再用 `drain()` 拿要送給各連線的訊息。
/// 內容在 VirtualCore 的 virtual-room（`host::HostRoom`），這裡只是給 JS 用的外殼。
#[wasm_bindgen]
pub struct HostRoom(host::HostRoom<Room>);

#[wasm_bindgen]
impl HostRoom {
    #[wasm_bindgen(constructor)]
    pub fn new(host_key: &str) -> HostRoom {
        HostRoom(host::HostRoom::new(Room::default(), host_key))
    }

    pub fn connect(&mut self, id: u32) {
        self.0.connect(id);
    }

    /// 連線中斷：比賽中算棄權，拿 token 重新連上就拿回座位
    pub fn disconnect(&mut self, id: u32) {
        self.0.disconnect(id);
    }

    /// 收到 id 傳來的一則訊息（JSON 文字）
    pub fn message(&mut self, id: u32, text: &str) {
        self.0.message(id, text);
    }

    /// 前進一格；比賽中回傳這一格的比賽狀態（JSON 文字），否則 undefined
    pub fn tick(&mut self) -> Option<String> {
        self.0.tick()
    }

    /// 取出要送的訊息：JSON 陣列 [{ to: 連線 id, msg }]
    pub fn drain(&mut self) -> String {
        self.0.drain()
    }
}

fn js_seed() -> u64 {
    (js_random() * 9.0e15) as u64
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = Math, js_name = random)]
    fn js_random() -> f64;
}
