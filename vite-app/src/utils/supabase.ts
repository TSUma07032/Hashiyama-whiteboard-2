// src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 環境変数の読み込み
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 接続チェック：変数がなかったらコンソールに警告出して、nullを返すかエラーにする
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("🚨 Supabaseの環境変数が設定されてないよ！.env.localを確認してね！");
  // ここでthrow Errorするとアプリが白い画面で死ぬから、一旦コンソールエラーに留めるのが優しさ
}

// クライアント作成
// ※型定義が怪しいときは 'as any' で逃げずに、ちゃんと設定確認してね！
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);