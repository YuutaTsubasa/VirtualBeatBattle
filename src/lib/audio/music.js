// 本作的曲目表：收錄的系列曲子（songs.js）＋本作自己的介面曲（ui-songs.js 的 ui-*）。
// 播放器 Player 與 compile（譜面產生器用）在 VirtualCore 的 src/audio/music.js；這裡一起轉出去，其他檔案照舊從這裡 import。
import { SONGS as GAME_SONGS } from './songs.js';
import { UI_SONGS } from './ui-songs.js';

export { Player, compile } from 'virtual-core/audio/music.js';

// setBgm／playJingle 用的曲子
export const SONGS = { ...GAME_SONGS, ...UI_SONGS };
