//! 角色與各自的小能力。id 要跟前端 src/lib/game/characters.js 一致（那邊放名字、台詞、能力說明、圖片）。
//! 能力都是「小小的不一樣」：不會讓誰一定贏，只是打起魔王手感不同。技術分（判定準不準）不受能力影響。

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Ability {
    /// 體力上限
    pub hp: i32,
    /// 攻擊力倍率
    pub atk: f32,
    /// Perfect 的傷害倍率
    pub perfect: f32,
    /// Good 算成 Great 的傷害
    pub good_as_great: bool,
    /// 連擊加成的上限
    pub combo_cap: f32,
    /// 同時押（分身）那一下的傷害倍率
    pub chord: f32,
    /// 長押放開那一下的傷害倍率
    pub hold: f32,
    /// 受到的傷害倍率
    pub guard: f32,
    /// 每幾連擊回一點血（0 = 不會）
    pub heal_every: u32,
    /// Miss 時擋下魔王反擊的機率
    pub parry: f32,
    /// 經驗值倍率
    pub xp: f32,
}

const BASE: Ability = Ability {
    hp: 100,
    atk: 1.0,
    perfect: 1.0,
    good_as_great: false,
    combo_cap: 0.3,
    chord: 1.0,
    hold: 1.0,
    guard: 1.0,
    heal_every: 0,
    parry: 0.0,
    xp: 1.0,
};

/// (id, 隱藏角色)
pub const CHARACTERS: &[(&str, bool)] = &[
    ("xiaocui", false),
    ("yuehua", false),
    ("aming", false),
    ("tangtang", false),
    ("xiaochun", false),
    ("lanjie", false),
    ("cangya", false),
    ("jinye", false),
    ("leo", false),
    ("alie", false),
    ("ayi", true),
];

pub fn is_character(id: &str) -> bool {
    CHARACTERS.iter().any(|c| c.0 == id)
}

/// 每個角色的能力；不認得的 id 用基本值
pub fn ability_of(id: &str) -> Ability {
    match id {
        // 小翠：幸運，Good 也打得出 Great 的傷害
        "xiaocui" => Ability { good_as_great: true, ..BASE },
        // 月華：冷靜，體力 130
        "yuehua" => Ability { hp: 130, ..BASE },
        // 阿明：熱血，連擊加成最多到 +50%
        "aming" => Ability { combo_cap: 0.5, ..BASE },
        // 糖糖：元氣，每 50 連擊回 8 點血
        "tangtang" => Ability { heal_every: 50, ..BASE },
        // 小春：飛毛腿，Perfect 傷害 +15%
        "xiaochun" => Ability { perfect: 1.15, ..BASE },
        // 蘭姐：大姊頭，受到的傷害減少 35%
        "lanjie" => Ability { guard: 0.65, ..BASE },
        // 蒼牙：獵犬，同時押（分身）的傷害 +40%
        "cangya" => Ability { chord: 1.4, ..BASE },
        // 金爺：財神，經驗值 +30%
        "jinye" => Ability { xp: 1.3, ..BASE },
        // 雷歐：滑翔，長押放開的一擊傷害兩倍
        "leo" => Ability { hold: 2.0, ..BASE },
        // 阿烈：鐵頭，攻擊 +10%，但體力只有 85
        "alie" => Ability { atk: 1.1, hp: 85, ..BASE },
        // 阿翼（隱藏）：騎士盾，Miss 時有 35% 擋下反擊
        "ayi" => Ability { parry: 0.35, ..BASE },
        _ => BASE,
    }
}

/// 隨機挑一個非隱藏角色（電腦對手用），盡量不跟別人重複
pub fn random_character(rng: &mut impl rand::Rng, avoid: &[&str]) -> &'static str {
    let mut pool: Vec<&str> = CHARACTERS.iter().filter(|c| !c.1 && !avoid.contains(&c.0)).map(|c| c.0).collect();
    if pool.is_empty() {
        pool = CHARACTERS.iter().filter(|c| !c.1).map(|c| c.0).collect();
    }
    pool[rng.gen_range(0..pool.len())]
}
