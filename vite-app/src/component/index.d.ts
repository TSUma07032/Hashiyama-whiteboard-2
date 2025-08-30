/**
 * @fileoverview 付箋アプリで使用する型定義
 */

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
};