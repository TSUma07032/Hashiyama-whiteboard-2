/**
 * @fileoverview 付箋アプリで使用する型定義
 */

/**
 * 返信のデータ構造の型定義
 * @typedef {object} ReplyData
 * @property {string} id - 返信のユニークなID
 * @property {string} noteId - どの付箋への返信かを示すID
 * @property {string} text - 返信の内容
 * @property {'comment' | 'question'} type - 返信の種類（コメント or 質問）
 * @property {string} [icon] - 返信者のアイコン
 * @property {Date} createdAt - 作成日時
 */
export type ReplyData = {
  id: string;
  noteId: string;
  text: string;
  icon?: string | null;
  createdAt: Date;
};

/**
 * 付箋のデータ構造の型定義
 * @typedef {object} NoteData
 * @property {string} id - 付箋のユニークなID。
 * @property {string} text - 付箋の内容。
 * @property {number} x - 付箋のX座標。
 * @property {number} y - 付箋のY座標。
 * @property {string} [color] - 付箋の色
 */
export type NoteData = {
  id: string;
  text: string;
  x: number; // 付箋のX座標
  y: number; // 付箋のY座標
  color: string; // 付箋の色
  icon?: string | null; // 付箋のアイコン
  width?: number; // 付箋の幅
  height?: number; // 付箋の高さ
  isRead?: boolean; // 付箋が既読かどうか
  replies?: ReplyData[];
  // 付箋の種類（'note': テキスト付箋, 'pdf': PDF付箋）
  // 指定がない場合は 'note' として扱うから optional (?) にしとくのが安全だ！
  type?: 'note' | 'pdf'; 

  // PDFファイルのURL（Supabase Storageの公開URL）
  file_url?: string | null;

  // PDFのページ番号（1ページ目〜）
  page_index?: number | null;

  is_locked?: boolean; // ロック状態
  z_index?: number;    // 重なり順
};