// src/hooks/useNotes.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase'; // さっき作ったやつ！
import { nanoid } from 'nanoid';
import type { NoteData, ReplyData } from '../types'; // ✨しれっと型定義を使用！

export const useNotes = () => {
    const [notes, setNotes] = useState<NoteData[]>([]);
    const [loading, setLoading] = useState(true);

    // --- 1. 初期ロード & リアルタイム監視 ---
    useEffect(() => {
        const fetchNotes = async () => {
            try {
                const { data, error } = await supabase
                    .from('notes')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (error) throw error;
                if (data) setNotes(data as NoteData[]);
            } catch (error) {
                console.error('ノート召喚失敗...:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotes();

        // リアルタイム監視
        const channel = supabase.channel('notes-realtime-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setNotes((prev) => [...prev, payload.new as NoteData]);
                }
                if (payload.eventType === 'UPDATE') {
                    setNotes((prev) => prev.map((n) => n.id === payload.new.id ? (payload.new as NoteData) : n));
                }
                if (payload.eventType === 'DELETE') {
                    setNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // --- 2. ノート追加 (Add) ---
    const addNote = useCallback(async (
        text: string, 
        color: string, 
        x?: number, 
        y?: number, 
        icon?: string | null, 
        agendaId?: string
    ) => {
        const newNote = {
            text,
            x: x ?? 50,
            y: y ?? 150,
            width: 200, height: 100,
            color: color || 'r',
            icon: icon || null,
            isRead: false,
            replies: [],
            agenda_id: agendaId,
        };

        try {
            const { error } = await supabase.from('notes').insert(newNote);
            if (error) throw error;
        } catch (e) {
            console.error('追加失敗:', e);
        }
    }, []);

    // --- 3. ノート更新 (Update) ---
    const updateNote = useCallback(async (id: string, updates: Partial<NoteData>) => {
        // 先にローカルを更新しちゃう（楽観的UI更新）
        setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));

        try {
            const { error } = await supabase.from('notes').update(updates).eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error('更新失敗:', e);
            // 失敗したら元に戻す処理が必要だけど、一旦省略！
        }
    }, []);

    // --- 4. ノート削除 (Delete) ---
    const deleteNote = useCallback(async (id: string) => {
        try {
            const { error } = await supabase.from('notes').delete().eq('id', id);
            if (error) throw error;
        } catch (e) {
            console.error('削除失敗:', e);
            alert('削除できなかった...');
        }
    }, []);

    // --- 5. 返信追加 (Reply) ---
    const addReply = useCallback(async (noteId: string, replyText: string, icon?: string | null) => {
        const targetNote = notes.find(n => n.id === noteId);
        if (!targetNote) return;

        const newReply: ReplyData = {
            id: nanoid(),
            noteId,
            text: replyText,
            icon: icon || null,
            createdAt: new Date(),
        };

        const updatedReplies = targetNote.replies ? [...targetNote.replies, newReply] : [newReply];
        // updateNoteを再利用！
        await updateNote(noteId, { replies: updatedReplies });
    }, [notes, updateNote]);

    // --- 6. 全削除 (Delete All) ---
    const deleteAllNotes = useCallback(async () => {
        if (!window.confirm("マジで全部消していいの？復元できないよ？🥺")) return;
        try {
            // 全削除用のロジック (0じゃないIDを全部消す)
            const { error } = await supabase.from('notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
            setNotes([]);
        } catch (e) {
            console.error('全削除失敗:', e);
        }
    }, []);

    // --- 7. 返信更新 (Update Reply) ---
    const updateReply = async (noteId: string, replyId: string, newText: string) => {
        try {
            // 1. まず、そのノートの現在の返信リストを取得（ローカルのnotesから探せば早い！）
            const targetNote = notes.find(n => n.id === noteId);
            if (!targetNote) throw new Error("ノートが見つからない！");
        
            // 2. 配列の中身を書き換える（JavaScriptの処理）
            // data.replies が存在しない場合やnullの場合も考慮して安全に！
            const currentReplies = targetNote.replies || [];
            
            const newReplies = currentReplies.map((r: any) => 
                r.id === replyId ? { ...r, text: newText } : r
            );
        
            // 3. Supabaseの 'notes' テーブルを更新！
            // 「repliesカラム」を新しい配列で上書きするの！
            const { error } = await supabase
                .from('notes') // 👈 ここ重要！ notesテーブル！
                .update({ replies: newReplies })
                .eq('id', noteId); // 👈 ノートIDで指定！
        
            if (error) throw error;
        
            // 4. ローカルStateも更新 (画面のピカつき防止✨)
            setNotes((prevNotes) => 
                prevNotes.map((note) => {
                    if (note.id !== noteId) return note;
                    return { ...note, replies: newReplies };
                })
            );
        
            console.log("✨ 返信、今度こそ更新できたよ〜！JSONB最強！");
        } catch (e) {
            console.error("😭 返信更新ミスった...", e);
        }
    };

    return {
        notes,
        loading,
        addNote,
        updateNote,
        deleteNote,
        addReply,
        deleteAllNotes,
        updateReply,
    };
};