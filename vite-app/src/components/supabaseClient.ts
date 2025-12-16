import { createClient } from '@supabase/supabase-js';

// .env.local からURLと鍵を読み込む
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ミス防止用の型チェック
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabaseの環境変数が設定されてねー .env.localを見直せ"
  );
}

// Supabaseクライアントを作成してエクスポート
// これがアプリとDBを繋ぐ
export const supabase = createClient(supabaseUrl, supabaseAnonKey);