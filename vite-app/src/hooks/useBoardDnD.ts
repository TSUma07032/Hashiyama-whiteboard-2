// src/hooks/useBoardDnD.ts
import { useState, useRef, useCallback } from 'react';
import { MouseSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import type { NoteData, AgendaItem } from '@/types';
import type { MainContentHandle } from '@/components/MainContent';

type UseBoardDnDProps = {
    notes: NoteData[];
    addNote: (text: string, color: string, x: number, y: number, icon?: string | null, agendaId?: string) => void;
    updateNote: (id: string, updates: Partial<NoteData>) => void;
    mainContentRef: React.RefObject<MainContentHandle | null>;
    scale: number;
    uploadedIcon: string | null;
    currentAgenda: AgendaItem | null | undefined;
};

export const useBoardDnD = ({
    notes,
    addNote,
    updateNote,
    mainContentRef,
    scale,
    uploadedIcon,
    currentAgenda
}: UseBoardDnDProps) => {
    // 内部に隠蔽するStateとRef
    const [_activeId, setActiveId] = useState<string | null>(null);
    const viewpointRef = useRef({ x: 0, y: 0 });
    const dragStartCursorRef = useRef({ x: 0, y: 0 });

    // DnDのセンサー設定
    const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } });
    const sensors = useSensors(mouseSensor);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        if ('clientX' in event.activatorEvent && 'clientY' in event.activatorEvent) {
            const e = event.activatorEvent as MouseEvent;
            dragStartCursorRef.current = { x: e.clientX, y: e.clientY };
        }
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, delta } = event;
        const activeId = active.id as string;
        if (!activeId) { setActiveId(null); return; }

        const activeData = active.data.current as any;

        // パターンA: テンプレートから新しいノートを追加した時
        if (activeData?.type === 'note-template') {
            if (mainContentRef.current && event.active.rect.current.translated) {
                // MainContentのDOM座標を取得して相対位置を計算
                const rect = mainContentRef.current.getBoundingClientRect();
                if (rect) {
                    const dropX = dragStartCursorRef.current.x + delta.x - rect.left;
                    const dropY = dragStartCursorRef.current.y + delta.y - rect.top;
                    const worldX = (dropX - viewpointRef.current.x) / scale;
                    const worldY = (dropY - viewpointRef.current.y) / scale;
                    
                    addNote(
                        activeData.text || '', 
                        activeData.color || 'r', 
                        worldX, 
                        worldY, 
                        uploadedIcon, 
                        currentAgenda?.id 
                    );
                }
            }
        } else {
            // パターンB: 既存のノートを移動した時
            const currentNote = notes.find(n => n.id === activeId);
            if (currentNote) {
                const newX = currentNote.x + delta.x / scale;
                const newY = currentNote.y + delta.y / scale;
                updateNote(activeId, { x: newX, y: newY });
            }
        }
        setActiveId(null);
    }, [notes, addNote, updateNote, mainContentRef, scale, uploadedIcon, currentAgenda]);

    return { sensors, handleDragStart, handleDragEnd };
};