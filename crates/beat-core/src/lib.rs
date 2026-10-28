//! 虛擬音鬥樂的遊戲引擎。
//! - `songs`：曲子與譜面（charts.json，由前端的產生器從 PC-98 曲子排出來）
//! - `play`：一個玩家打一首曲子（判定、連擊、技術分、魔王戰、經驗值）
//! - `ai`：電腦玩家（跟真人用同一套判定）
//! - `room`：連線房間（最多十二人同場比分、電腦對手、聊天）
//! - `protocol`：連線訊息的處理（區網伺服器與線上房間共用）
//! - `characters`：角色的小能力

pub mod ai;
pub mod characters;
pub mod play;
pub mod protocol;
pub mod room;
pub mod songs;

#[cfg(test)]
mod tests {
    use crate::ai::{Bot, Difficulty};
    use crate::play::{boss_hp, Play, GOOD};
    use virtual_room::RoomGame;
    use crate::room::{song_ms, Room, Settings, COUNTDOWN};
    use crate::songs::{songs, Kind, Level};

    /// 照譜面的時間剛好按
    fn perfect_play(song: &str, level: Level, character: &str, lv: u32) -> Play {
        let mut p = Play::new(song, level, character, lv);
        let mut acts: Vec<(i32, usize, bool)> = Vec::new();
        for n in p.song.chart(level).notes.iter().filter(|n| n.kind == Kind::Tap) {
            acts.push((n.t, n.lane, true));
            acts.push((if n.len > 0 { n.end() } else { n.t + 30 }, n.lane, false));
        }
        acts.sort_by_key(|a| (a.0, !a.2 as u8));
        for (t, lane, down) in acts {
            if down {
                p.press(lane, t);
            } else {
                p.release(lane, t);
            }
        }
        p.update(p.song.length_ms + 1000);
        p
    }

    /// 每份譜面都讀得到、長押裡面不會再疊音符、照時間按就是全 Perfect
    #[test]
    fn every_chart_loads_and_is_playable() {
        assert_eq!(songs().len(), 48);
        for s in songs() {
            for level in [Level::Easy, Level::Normal, Level::Hard, Level::Expert] {
                let notes = &s.chart(level).notes;
                // 慢歌（例如月華的主題曲 92 BPM）的簡單譜面大約九十幾顆
                assert!(notes.len() > 60, "{} {:?} 音符太少", s.id, level);
                for (i, n) in notes.iter().enumerate() {
                    for m in &notes[i + 1..] {
                        if m.lane == n.lane && n.len > 0 {
                            assert!(m.t > n.end(), "{} {:?}：{}ms 的長押裡面還有音符", s.id, level, n.t);
                        }
                    }
                }
                let p = perfect_play(&s.id, level, "xiaocui", 1);
                assert!(p.ended);
                assert_eq!(p.score(), 1_000_000, "{} {:?}", s.id, level);
                assert_eq!(p.counts[0], p.max_combo);
                assert_eq!(p.rank(), "SSS");
            }
        }
    }

    /// 初始等級全 Perfect 打不倒魔王（大約七成五），練到夠高的等級就打得倒
    #[test]
    fn boss_needs_levels() {
        let p = perfect_play("vr-city", Level::Normal, "yuehua", 1);
        let ratio = p.dmg as f64 / p.boss_max as f64;
        assert!((0.7..0.8).contains(&ratio), "初始等級全 Perfect 打掉 {:.2}", ratio);
        assert!(!p.killed);
        let strong = perfect_play("vr-city", Level::Normal, "yuehua", 6);
        assert!(strong.killed, "等級 6 全 Perfect 應該打得倒");
        assert_eq!(boss_hp("vr-city", Level::Normal), p.boss_max);
    }

    #[test]
    fn judgments_and_mines() {
        let notes = Play::new("vr-forest", Level::Hard, "xiaocui", 1).song.chart(Level::Hard).notes.clone();
        let first = *notes.iter().find(|n| n.kind == Kind::Tap && n.len == 0).unwrap();
        // 晚 60ms：Great
        let mut p = Play::new("vr-forest", Level::Hard, "xiaocui", 1);
        p.press(first.lane, first.t + 60);
        assert_eq!(p.view()["events"][0]["j"], "G");
        // 地雷：按下去會受傷
        let mine = *notes.iter().find(|n| n.kind == Kind::Mine).expect("困難譜面要有地雷");
        let mut q = Play::new("vr-forest", Level::Hard, "xiaocui", 1);
        q.update(mine.t - 200);
        q.events.clear();
        q.press(mine.lane, mine.t);
        assert!(q.view()["events"].as_array().unwrap().iter().any(|e| e["type"] == "mine"), "踩到地雷");
        // 不按：錯過的音符變 Miss、被反擊
        let mut r = Play::new("vr-forest", Level::Hard, "lanjie", 1);
        r.update(first.t + GOOD + 5);
        let expect: u32 = notes.iter().filter(|n| n.kind == Kind::Tap && n.t <= first.t).map(|n| if n.len > 0 { 2 } else { 1 }).sum();
        assert_eq!(r.counts[3], expect);
        assert!(r.view()["events"].as_array().unwrap().iter().any(|e| e["type"] == "hurt"));
    }

    /// 體力歸零不會中斷曲子，只是之後沒有傷害
    #[test]
    fn running_out_of_hp_does_not_stop_the_song() {
        let mut p = Play::new("vr-mine", Level::Hard, "alie", 1);
        p.update(p.song.length_ms + 500);
        assert!(p.down && p.ended);
        assert_eq!(p.hp, 0);
        assert_eq!(p.dmg, 0);
    }

    #[test]
    fn bots_play_like_their_difficulty() {
        let mut scores = Vec::new();
        for d in [Difficulty::Easy, Difficulty::Normal, Difficulty::Hard] {
            let mut p = Play::new("vr-ice", Level::Normal, "aming", crate::ai::level(d));
            let mut bot = Bot::new(&p, d, 7);
            let mut t = -3000;
            while !p.ended {
                t += 16;
                bot.step(&mut p, t);
            }
            assert!(!p.down, "{:?} 的電腦（大約九成準）不應該體力歸零", d);
            scores.push(p.score());
        }
        assert!(scores[0] < scores[1] && scores[1] < scores[2], "{:?}", scores);
        assert!(scores[2] > 940_000, "困難的電腦應該有 S：{:?}", scores);
    }

    #[test]
    fn room_with_twelve_seats() {
        let mut room = Room::new(Settings { difficulty: Difficulty::Hard, level: Level::Easy, ..Settings::default() });
        let (seat, token) = room.join("悠太", Some("ayi")).unwrap();
        room.connect(seat);
        for _ in 0..11 {
            room.add_bot(None, Difficulty::Hard).unwrap();
        }
        assert!(room.add_bot(None, Difficulty::Hard).is_err(), "十二個座位滿了");
        assert_eq!(room.seat_of_token(&token), Some(seat));
        room.start().unwrap();
        assert!(room.join("晚到的人", None).is_err());
        room.disconnect(seat);
        let mut frames = 0;
        while room.race.as_ref().unwrap().results.is_none() && frames < 60 * 60 * 4 {
            room.tick();
            frames += 1;
        }
        let frame = room.frame().unwrap();
        assert_eq!(frame["phase"], "results");
        let results = frame["results"].as_array().unwrap();
        assert_eq!(results.len(), 12);
        assert_eq!(results.last().unwrap()["seat"], 0, "棄權的排最後");
        assert!(results[0]["p"]["score"].as_u64().unwrap() > 900_000);
        assert_eq!(song_ms(COUNTDOWN), 0);
        room.reset_to_lobby();
        assert_eq!(room.view(Some(0))["phase"], "lobby");
    }

    #[test]
    fn protocol_host_and_guest() {
        use crate::protocol::{drop_conn, handle, room_message, Conn};
        use serde_json::json;
        let mut room = Room::default();
        let (mut host, mut guest) = (Conn::default(), Conn::default());
        let (r, changed) = handle(&mut room, "key", &mut host, &json!({"type": "hello", "name": "房主", "host_key": "key"}));
        assert!(changed && host.is_host && host.seat == Some(0));
        assert_eq!(r[0]["type"], "welcome");
        let (r, _) = handle(&mut room, "key", &mut guest, &json!({"type": "hello", "name": "客人", "host_key": "wrong"}));
        let token = r[0]["token"].as_str().unwrap().to_string();
        assert!(!guest.is_host && guest.seat == Some(1));
        let (r, _) = handle(&mut room, "key", &mut guest, &json!({"type": "host", "cmd": "start"}));
        assert_eq!(r[0]["type"], "error");
        handle(&mut room, "key", &mut host, &json!({"type": "host", "cmd": "add_bot", "seat": 11}));
        assert!(room.seats[11].is_some());
        handle(&mut room, "key", &mut host, &json!({"type": "host", "cmd": "settings", "settings": {"song": "vr-sea", "level": "hard"}}));
        assert_eq!(room.settings.song, "vr-sea");
        handle(&mut room, "key", &mut host, &json!({"type": "host", "cmd": "start"}));
        assert!(room.playing());
        handle(&mut room, "key", &mut guest, &json!({"type": "progress", "score": 123456, "combo": 41, "dmg": 999}));
        room.tick();
        assert_eq!(room.frame().unwrap()["players"][1]["p"]["combo"], 41);
        assert!(drop_conn(&mut room, &mut guest));
        // 比賽中斷線算棄權，不換成電腦
        assert_eq!(room.seats[1].as_ref().unwrap().kind, crate::room::SeatKind::Human);
        assert_eq!(room.frame().unwrap()["players"][1]["p"]["out"], true);
        // 比賽中房主移除座位：座位直接空出來，也不在場上了
        let (_, changed) = handle(&mut room, "key", &mut host, &json!({"type": "host", "cmd": "remove", "seat": 11}));
        assert!(changed && room.seats[11].is_none());
        assert!(room.frame().unwrap()["players"].as_array().unwrap().iter().all(|p| p["seat"] != 11));
        // 不認得的曲子換回預設曲
        handle(&mut room, "key", &mut host, &json!({"type": "host", "cmd": "settings", "settings": {"song": "沒有這首"}}));
        assert!(crate::songs::is_song(&room.settings.song));
        let mut back = Conn::default();
        handle(&mut room, "key", &mut back, &json!({"type": "hello", "token": token}));
        assert_eq!(back.seat, Some(1));
        assert_eq!(room_message(&room, &back)["state"]["you"], 1);
    }
}
