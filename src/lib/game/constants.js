// 畫面與遊戲的常數（判定的範圍在 crates/beat-core/src/play.rs，房間的在 room.rs）
export const W = 960;
export const H = 540;
export const LANES = 6;
export const MAX_PLAYERS = 12;
/** 開始前的倒數（影格），倒數結束就是曲子的 0 毫秒；要跟 room.rs 的 COUNTDOWN 一樣 */
export const COUNTDOWN = 180;

export const DIFFICULTIES = { easy: '簡單', normal: '普通', hard: '困難' };

// 1P～12P 的代表色（名牌、小畫面的框）
export const SLOT_COLORS = ['#ff4d5e', '#3d8bff', '#3fc46b', '#ffc93c', '#b06bff', '#ff8a3d', '#2fd0d0', '#ff7ac8', '#9ad14b', '#5c6cff', '#ff5ab4', '#c9a86a'];

// 六條軌道的顏色：外側、中間、內側（左右對稱，像 DJMAX 的白／藍）
export const LANE_COLORS = ['#7fd8ff', '#ffffff', '#ffcf5a', '#ffcf5a', '#ffffff', '#7fd8ff'];

/** 角色等級上限、攻擊力、升級經驗：要跟 play.rs 的 atk_of_level、xp_to_next 一樣 */
export const MAX_LEVEL = 30;
export const atkOfLevel = (lv) => Math.round(100 * (1 + 0.07 * (Math.min(MAX_LEVEL, Math.max(1, lv)) - 1)));
export const xpToNext = (lv) => 120 + 60 * lv;

// 選單背景（scenery.js，沿用虛擬闖天下的背景）：地板從畫面的 340 開始
export const Z_TOP = 340;
