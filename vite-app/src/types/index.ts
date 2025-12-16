/**
 * @fileoverview アプリ全体で使う型定義
 * any禁止！ここで型を縛ってバグを防ぐ！
 */

// --- データモデル ---

export type ReplyData = {
    id: string;
    noteId: string;
    text: string;
    icon?: string | null;
    createdAt: Date; // Supabaseからは文字列で来るかもだけど、アプリ内ではDate推奨
};

export type NoteColor = 'r' | 'b' | 'white' | string; // 拡張性を考慮してstringも許容

export type NoteType = 'note' | 'pdf' | 'note-template';

export type NoteData = {
    id: string;
    text: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color: NoteColor;
    icon?: string | null;
    isRead: boolean;
    replies?: ReplyData[];
    agenda_id?: string;
    
    // PDFや特殊ノート用
    type?: NoteType;
    file_url?: string;
    page_index?: number;
    
    // 制御フラグ
    is_locked?: boolean;
    z_index?: number;
    
    // DB管理項目
    created_at?: string;
};

// --- アジェンダ・進行管理 ---

export type AgendaItem = {
    id: string;
    presenter: string;
    fg: string;
    end_time: string; // "14:30" みたいな文字列 (HH:mm)
};

// --- コンポーネントProps用 (共通で使うもの) ---

// 例: リサイズコールバックの型
export type OnResizeFunc = (id: string, newWidth: number, newHeight: number) => void;