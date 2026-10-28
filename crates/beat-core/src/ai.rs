//! 電腦玩家：開場先決定每一顆音符要早／晚按多少、會不會漏掉，之後照時間呼叫 `Play::press`／`release`，
//! 所以判定、傷害都跟真人走同一套。地雷一律忍住不按。

use crate::play::Play;
use crate::songs::{Kind, Rng};

/// 電腦的強度：Virtual 系列共用（virtual-room），各款自己決定每種強度的參數（見 skill）
pub use virtual_room::Difficulty;

/// （按的時間誤差的標準差 ms、漏掉的機率、角色等級）
fn skill(difficulty: Difficulty) -> (f32, f32, u32) {
    match difficulty {
        Difficulty::Easy => (60.0, 0.07, 3),
        Difficulty::Normal => (38.0, 0.025, 8),
        Difficulty::Hard => (20.0, 0.006, 14),
    }
}

/// 電腦這種強度用的角色等級
pub fn level(difficulty: Difficulty) -> u32 {
    skill(difficulty).2
}

pub struct Bot {
    /// （時間, 軌道, 按下=true／放開=false），依時間排好
    plan: Vec<(i32, usize, bool)>,
    next: usize,
}

impl Bot {
    pub fn new(play: &Play, d: Difficulty, seed: u64) -> Bot {
        let (sigma, miss, _) = skill(d);
        let mut rng = Rng::new(seed);
        let mut plan = Vec::new();
        for n in play.song.chart(play.level).notes.iter().filter(|n| n.kind == Kind::Tap) {
            if rng.chance(miss) {
                continue;
            }
            // 常態分布的近似：三個均勻亂數相加
            let g = (rng.unit() + rng.unit() + rng.unit() - 1.5) * 2.0;
            let off = (g * sigma) as i32;
            let at = n.t + off;
            let up = if n.len > 0 { n.t + n.len + (rng.unit() * 30.0) as i32 } else { at + 45 };
            plan.push((at, n.lane, true));
            plan.push((up, n.lane, false));
        }
        plan.sort_by_key(|p| (p.0, !p.2 as u8));
        Bot { plan, next: 0 }
    }

    /// 把時間 t 以前該按的都按掉
    pub fn step(&mut self, play: &mut Play, t: i32) {
        while self.next < self.plan.len() && self.plan[self.next].0 <= t {
            let (at, lane, down) = self.plan[self.next];
            if down {
                play.press(lane, at);
            } else {
                play.release(lane, at);
            }
            self.next += 1;
        }
        play.update(t);
    }
}
