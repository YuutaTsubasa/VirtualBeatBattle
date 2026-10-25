// 節奏遊戲的個人設定（存在這台電腦）：音符速度、判定時間的校正
const KEY = 'vbb_options';

function load() {
  try {
    return { speed: 5, offset: 0, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { speed: 5, offset: 0 };
  }
}

export const options = $state(load());

export function setOption(key, value) {
  options[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(options));
  } catch {
    // 存不了就算了
  }
}

/** 音符從畫面頂端落到判定線要幾毫秒（速度 1～10） */
export const fallMs = () => Math.round(2600 / (0.6 + options.speed * 0.28));
