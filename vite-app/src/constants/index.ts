/**
 * @fileoverview アプリ全体で使う定数定義
 * 謎の数字はここにまとめて、コードの可読性を爆上げするよ！
 */

// --- ノート（付箋）関連 ---
export const DEFAULT_NOTE_SIZE = { width: 200, height: 100 };
export const DEFAULT_NOTE_POSITION = { x: 50, y: 150 };

// リサイズ制限
export const NOTE_MIN_SIZE = { width: 100, height: 50 };
export const NOTE_MAX_SIZE = { width: 800, height: 600 };

// ノートの色定義 (Note.css と合わせるのが理想だけど一旦ここで定義)
export const NOTE_COLOR_RED = 'r';
export const NOTE_COLOR_BLUE = 'b';
export const NOTE_COLOR_WHITE = 'white';

// UI操作系
export const LONG_PRESS_DURATION = 300; // 長押し判定のミリ秒
export const DOUBLE_CLICK_GAP = 300;    // (もし使うなら)

// --- PDF・資料貼り付け関連 ---
export const PDF_NOTE_WIDTH = 1600;
export const PDF_NOTE_HEIGHT = 2250;
export const PDF_GAP_X = 100; // 横並びの隙間
export const PDF_FILE_MARGIN = PDF_NOTE_HEIGHT * 2; // ファイル間の縦の隙間

// --- レイアウト関連 ---
export const SIDEBAR_WIDTH_DEFAULT = 260;
export const SIDEBAR_WIDTH_MIN = 150;
export const SIDEBAR_WIDTH_MAX = 500;

// --- ユーザー・認証 (Mock) ---
export const MOCK_USER_ID = "me";
// 削除用の特殊ID (UUIDのゼロ埋め)
export const ALL_DELETE_ID = '00000000-0000-0000-0000-000000000000';