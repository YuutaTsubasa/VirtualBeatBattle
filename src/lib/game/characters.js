// 角色資料，id、名字、介紹、配色沿用 TaiwanMahjong（origin/master）的 src/lib/characters.js。
//
// special：每個角色的小能力（名稱、說明、代表色）。實際數值在 crates/beat-core/src/characters.rs 的 ability_of，改的話兩邊要一起改。
// lines：go 開場、ko 打倒魔王、hurt 被打、boss 魔王出現、win 贏了、lose 輸了。
//
// 圖：characters/<id>/<表情>.webp（半身像，直接沿用 TaiwanMahjong origin/master 的，衣服是麻將館那套）、sprites/<id>.webp（動作圖集），
//   依目前畫風取圖（見 src/lib/style-assets.js），該風格沒有的圖會用 90 年代版。
//   動作圖集沿用虛擬跑跑樂（虛擬闖天下的格子＋跑步）：idle 待機、punch1／punch2／kick 打擊、special 長押、hurt 被打、win 勝利。
//   節奏遊戲專用的格子（左打、右打、橫掃、長押中、長押放）之後請美術補。

import { asset } from '../art-style.svelte.js';
import { t } from '../i18n.svelte.js';

export const EXPRESSIONS = ['normal', 'happy', 'surprised', 'sad', 'win'];

// 讀取時才依目前畫風決定網址，所以畫面會跟著換風格
const portraits = (id) =>
  Object.defineProperties(
    {},
    Object.fromEntries(EXPRESSIONS.map((e) => [e, { enumerable: true, get: () => asset(`characters/${id}/${e}.webp`) }])),
  );

const RAW = [
  {
    id: 'xiaocui', name: '小翠', intro: '綠色雙馬尾的元氣少女',
    hair: '#3fbf86', clothes: '#ffffff', collar: '#2a9d8f', skin: '#ffe0c8', shorts: '#2a9d8f',
    special: { name: '幸運星', desc: 'Good 也打得出 Great 的傷害。', color: '#3fbf86' },
    lines: {
      go: ['小翠出擊～！', '大家跟上喔～！'],
      ko: ['耶～打倒了！', '再來再來～！'],
      hurt: ['好痛啦～！'],
      boss: ['好、好大隻…小翠不怕！'],
      win: ['過關～！今天運氣超好！'],
      lose: ['嗚…下次一定贏回來！'],
    },
  },
  {
    id: 'yuehua', name: '月華', intro: '銀髮的冷靜大小姐',
    hair: '#e6e9f2', clothes: '#2b2d42', collar: '#e6e9f2', skin: '#fde6d6', shorts: '#2b2d42',
    special: { name: '冷靜應對', desc: '體力 130（一般是 100）。', color: '#c9d4ff' },
    lines: {
      go: ['路線已經計算好了。', '請跟緊我。'],
      ko: ['失禮了。', '一切都在計算之中。'],
      hurt: ['……失算了。'],
      boss: ['弱點，已經看穿了。'],
      win: ['勝負，早已注定。'],
      lose: ['真是不甘心……再一次。'],
    },
  },
  {
    id: 'aming', name: '阿明', intro: '熱血的刺蝟頭少年',
    hair: '#2f2f3a', clothes: '#f77f00', collar: '#fcbf49', skin: '#e9b48a', shorts: '#d62828',
    special: { name: '熱血連擊', desc: '連擊加成最多到 +50%（一般是 +30%）。', color: '#ff6a3d' },
    lines: {
      go: ['燃起來了——！', '全部給我放馬過來！'],
      ko: ['一擊必殺！', '還不夠熱血啊！'],
      hurt: ['可惡——！'],
      boss: ['終於來了個像樣的！'],
      win: ['這就是熱血的力量！！'],
      lose: ['我還沒燃燒完啊——！'],
    },
  },
  {
    id: 'tangtang', name: '糖糖', intro: '愛撒嬌的粉紅包包頭',
    hair: '#ff9ec7', clothes: '#ffd6e8', collar: '#ff8fab', skin: '#ffe4d4', shorts: '#ff8fab',
    special: { name: '元氣補給', desc: '每 50 連擊回 8 點體力。', color: '#ff8fc8' },
    lines: {
      go: ['糖糖要出發囉♪', '打完要吃糖喔♡'],
      ko: ['嘿嘿，糖糖好厲害♪', '討厭啦～走開♡'],
      hurt: ['嗚哇～好痛♡'],
      boss: ['好可怕…糖糖要哭了啦！'],
      win: ['贏了～獎勵是糖果♡'],
      lose: ['嗚嗚…糖糖還想玩…'],
    },
  },
  {
    id: 'xiaochun', name: '小春', intro: '橘色馬尾的運動少女',
    hair: '#f8961e', clothes: '#277da1', collar: '#ffffff', skin: '#f6cfae', shorts: '#1d4e89',
    special: { name: '飛毛腿', desc: 'Perfect 的傷害 +15%。', color: '#ffd23f' },
    lines: {
      go: ['熱身完畢，衝啊！', '比賽開始！'],
      ko: ['好球！', '漂亮！下一個！'],
      hurt: ['唔，被偷襲了！'],
      boss: ['對手很強，正合我意！'],
      win: ['今天的練習很充實！'],
      lose: ['再練一百次！'],
    },
  },
  {
    id: 'lanjie', name: '蘭姐', intro: '戴眼鏡的麻將館老闆娘',
    hair: '#6a4c93', clothes: '#c1121f', collar: '#ffd166', skin: '#f3d0b4', shorts: '#7a0b14',
    special: { name: '大姊頭', desc: '魔王的反擊只痛 65%。', color: '#9b7fe0' },
    lines: {
      go: ['年輕人，跟著我走。', '開店三十年，什麼場面沒見過。'],
      ko: ['不懂規矩。', '去旁邊坐好。'],
      hurt: ['哎喲，我的腰……'],
      boss: ['終於有個能聊兩句的了。'],
      win: ['收工，回去泡茶。'],
      lose: ['唉，年紀到了……'],
    },
  },
  {
    id: 'cangya', name: '蒼牙', intro: '銀髮狼耳、鼻子靈又好勝的狼族少年',
    hair: '#a7a9ad', clothes: '#2c2c34', collar: '#c9a24a', skin: '#f6dccb', shorts: '#2c2c34',
    special: { name: '獵犬分身', desc: '同時押（分身出擊）的傷害 +40%。', color: '#5ab0ff' },
    lines: {
      go: ['聞到獵物的味道了。', '一個都別想跑。'],
      ko: ['咬住了！', '太慢了！'],
      hurt: ['嘖，大意了。'],
      boss: ['好大的獵物……我要定了！'],
      win: ['狼族的狩獵，結束。'],
      lose: ['可惡……下次一定咬住你！'],
    },
  },
  {
    id: 'jinye', name: '金爺', intro: '鬍子帥氣、見過大風大浪的老牌賭客',
    hair: '#2a2a2e', clothes: '#1b2233', collar: '#f0ece2', skin: '#d9a47c', shorts: '#1b2233',
    special: { name: '財神爺', desc: '拿到的經驗值 +30%。', color: '#e9b85e' },
    lines: {
      go: ['小場面，走吧。', '這把，我押自己贏。'],
      ko: ['年輕人，再練練。', '手氣不錯。'],
      hurt: ['呵，有點意思。'],
      boss: ['大風大浪我見多了。'],
      win: ['贏了就收，這是規矩。'],
      lose: ['人生嘛，總有輸的時候。'],
    },
  },
  {
    id: 'leo', name: '雷歐', intro: '戴著王冠、一本正經的異國王子騎士',
    hair: '#f2c94c', clothes: '#c7ccd6', collar: '#1f3f9a', skin: '#fde6d6', shorts: '#1f3f9a',
    special: { name: '滑翔重擊', desc: '長押放開的那一擊傷害兩倍。', color: '#4fd1c5' },
    lines: {
      go: ['以騎士之名，前進！', '我會守護大家。'],
      ko: ['正義必勝。', '多有得罪。'],
      hurt: ['唔……騎士不會倒下！'],
      boss: ['邪惡之徒，報上名來！'],
      win: ['這份勝利獻給大家。'],
      lose: ['我……還不夠成熟……'],
    },
  },
  {
    id: 'alie', name: '阿烈', intro: '紅髮刀疤、豪爽愛冒險的傭兵',
    hair: '#c1272d', clothes: '#1d1d1d', collar: '#7a1d1d', skin: '#e2b08c', shorts: '#7a1d1d',
    special: { name: '鐵頭', desc: '攻擊力 +10%，但體力只有 85。', color: '#ff4d4d' },
    lines: {
      go: ['冒險開始啦！', '前面一定有寶藏！'],
      ko: ['哈哈！痛快！', '下一個！'],
      hurt: ['這點小傷算什麼！'],
      boss: ['大傢伙，身上有寶藏吧？'],
      win: ['寶藏到手！'],
      lose: ['哈…這次是我輸了。'],
    },
  },
  {
    id: 'ayi', name: '阿翼', intro: '棕髮藍眼、穿著銀色盔甲的隱藏來客', hidden: true,
    hair: '#795038', clothes: '#cbd3dc', collar: '#20252f', skin: '#f3d2b6', shorts: '#20252f',
    special: { name: '天翼之盾', desc: 'Miss 時有 35% 的機率擋下魔王的反擊。', color: '#ffffff' },
    lines: {
      go: ['大家，一起走吧。', '我會幫上忙的。'],
      ko: ['抱歉了。', '就到這裡吧。'],
      hurt: ['還撐得住……！'],
      boss: ['就是你在作亂嗎？'],
      win: ['太好了，大家都沒事。'],
      lose: ['對不起……我還不夠強。'],
    },
  },
];

// name、intro 讀取時才翻成目前的語言（zhName 是原文）；台詞在 pickLine() 翻
export const CHARACTERS = RAW.map((c) => ({
  sprite: true,
  ...c,
  zhName: c.name,
  get name() {
    return t(c.name);
  },
  get intro() {
    return t(c.intro);
  },
  // 小能力（每個人不同，數值在 crates/beat-core/src/characters.rs 的 ability_of）
  get specialName() {
    return t(c.special.name);
  },
  get specialDesc() {
    return t(c.special.desc);
  },
  specialColor: c.special.color,
  portraits: portraits(c.id),
  get spriteSrc() {
    return asset(`sprites/${c.id}.webp`);
  },
}));

export const getCharacter = (id) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

export function pickLine(character, kind) {
  const list = character.lines[kind] ?? [];
  return t(list[Math.floor(Math.random() * list.length)] ?? '');
}

// 隱藏角色：第一次打倒任何一隻魔王就解鎖（也可以輸入秘技）
const UNLOCK_KEY = 'vbb_unlock_ayi';
export function isUnlocked(character) {
  if (!character.hidden) return true;
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}
export function unlockHidden() {
  try {
    const was = localStorage.getItem(UNLOCK_KEY) === '1';
    localStorage.setItem(UNLOCK_KEY, '1');
    return !was;
  } catch {
    return false;
  }
}
