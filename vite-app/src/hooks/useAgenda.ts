// src/hooks/useAgenda.ts
import { useState, useEffect  } from 'react';
import { supabase } from '@/components/supabaseClient'; 
import type { AgendaItem } from '@/types';
import { MOCK_USER_ID } from '@/constants'; // 

export const useAgenda = () => {
    // ローカルstate (初期値は空にして、DBからロードする)
    const [agendaList, setAgendaList] = useState<AgendaItem[]>([]);
    
    // DB同期ステート
    const [currentAgendaId, setCurrentAgendaId] = useState<string>('');
    const [timerEndAt, setTimerEndAt] = useState<string | null>(null); 
    const [timerOwnerId, setTimerOwnerId] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);

    // 現在のアイテム（IDがなければ先頭）
    const currentAgenda = agendaList.find(a => a.id === currentAgendaId) || agendaList[0];
    const currentIndex = agendaList.findIndex(a => a.id === currentAgendaId);

    // ★ 発表中かどうか（ロック判定用）
    // タイマーが動いている = 発表中とみなす！
    const isPresenting = !!timerEndAt;

    // --- 1. アジェンダリストの同期 (Load & Realtime) ---
    useEffect(() => {
        // 初期ロード
        const fetchAgenda = async () => {
            const { data, error } = await supabase
                .from('agenda_items')
                .select('*')
                .order('ord', { ascending: true }); // 登録順
            
            if (error) console.error("Agenda load error:", error);
            if (data) setAgendaList(data);
        };
        fetchAgenda();

        // リアルタイム監視
        const channel = supabase.channel('agenda_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_items' }, () => {
                fetchAgenda(); // 変更があったら再取得（手抜きだけど確実）
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // --- 2. 部屋の状態同期 (前回と同じ) ---
    useEffect(() => {
        const fetchState = async () => {
            const { data } = await supabase.from('room_state').select('*').eq('id', 1).single();
            if (data) {
                if (data.current_agenda_id) setCurrentAgendaId(data.current_agenda_id);
                setTimerEndAt(data.timer_end_at);
                setTimerOwnerId(data.timer_owner_id);
            }
        };
        fetchState();

        const channel = supabase.channel('room_state_sync')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_state', filter: 'id=eq.1' }, (payload) => {
                const nav = payload.new;
                if (nav.current_agenda_id) setCurrentAgendaId(nav.current_agenda_id);
                setTimerEndAt(nav.timer_end_at);
                setTimerOwnerId(nav.timer_owner_id);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    // --- 3. カウントダウン (前回と同じ) ---
    useEffect(() => {
        const calcTime = () => {
            if (!currentAgenda) return;
            const now = new Date();
            let targetTime: Date;

            if (timerEndAt) {
                targetTime = new Date(timerEndAt);
            } else {
                // 停止中は設定された時刻を表示
                if (!currentAgenda.end_time) return;
                const [hours, minutes] = currentAgenda.end_time.split(':').map(Number);
                targetTime = new Date();
                targetTime.setHours(hours, minutes, 0, 0);
            }
            const diff = Math.round((targetTime.getTime() - now.getTime()) / 1000);
            setTimeLeft(diff > 0 ? diff : 0);
        };
        calcTime();
        const interval = setInterval(calcTime, 1000);
        return () => clearInterval(interval);
    }, [timerEndAt, currentAgenda]);

    // 進行切り替え (ロック中は無効化！)
    const switchAgenda = async (nextId: string) => {
        if (isPresenting) return; // ★ロック！

        setCurrentAgendaId(nextId);
        await supabase.from('room_state').update({ current_agenda_id: nextId }).eq('id', 1);
    };

    const nextAgenda = () => {
        if (currentIndex < agendaList.length - 1) switchAgenda(agendaList[currentIndex + 1].id);
    };
    const prevAgenda = () => {
        if (currentIndex > 0) switchAgenda(agendaList[currentIndex - 1].id);
    };

    // タイマー操作 (ボタンの見た目変更に対応)
    const toggleTimer = async () => {
        if (isPresenting) {
            // ■ 終了 (Presenting解除)
            setTimerEndAt(null);
            setTimerOwnerId(null);
            await supabase.from('room_state').update({ timer_end_at: null, timer_owner_id: null }).eq('id', 1);
        } else {
            // ▶ 発表開始 (Presenting開始)
            if (!currentAgenda.end_time) {
                alert("終了時刻を設定してね！");
                return;
            }
            const [hours, minutes] = currentAgenda.end_time.split(':').map(Number);
            const targetDate = new Date();
            targetDate.setHours(hours, minutes, 0, 0);
            const isoString = targetDate.toISOString();

            setTimerEndAt(isoString);
            setTimerOwnerId(MOCK_USER_ID);
            await supabase.from('room_state').update({ timer_end_at: isoString, timer_owner_id: MOCK_USER_ID }).eq('id', 1);
        }
    };

    return {
        agendaList, 
        currentAgenda, 
        timeLeft,        
        timerEndAt,
        timerOwnerId,
        isPresenting, // ★追加: これでUIを制御！
        toggleTimer, 
        nextAgenda, 
        prevAgenda
    };
};