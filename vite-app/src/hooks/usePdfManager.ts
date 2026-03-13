// src/hooks/usePdfManager.ts
import { useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import type { NoteData } from '@/types';
import { 
    DEFAULT_NOTE_SIZE, 
    DEFAULT_NOTE_POSITION, 
    PDF_NOTE_WIDTH, 
    PDF_NOTE_HEIGHT, 
    PDF_GAP_X, 
    PDF_FILE_MARGIN,
    NOTE_COLOR_WHITE,
    PDF_GRID_COLS,
    PDF_GAP_Y
} from '@/constants';

type UsePdfManagerProps = {
    notes: NoteData[];
};

export const usePdfManager = ({ notes }: UsePdfManagerProps) => {

    // 画面の一番下のY座標を取得する
    const getBottomY = useCallback(() => {
        if (notes.length === 0) return DEFAULT_NOTE_POSITION.y;
        return Math.max(...notes.map(n => n.y + (n.height || DEFAULT_NOTE_SIZE.height)));
    }, [notes]);

    // PDFの1ページだけを追加
    const handleAddPdfNote = useCallback(async (url: string, pageIndex: number) => {
        const startY = getBottomY() + PDF_FILE_MARGIN;

        await supabase.from('notes').insert({
            text: '', 
            x: DEFAULT_NOTE_POSITION.x,
            y: startY, 
            width: PDF_NOTE_WIDTH,
            height: PDF_NOTE_HEIGHT,
            color: NOTE_COLOR_WHITE,
            type: 'pdf', 
            file_url: url, 
            page_index: pageIndex,
            replies: [], 
            isRead: false
        });
    }, [getBottomY]);

    // PDFの全ページをズラ〜ッと追加
    const handleAddAllPdfPages = useCallback(async (url: string, totalPages: number) => {
        const startY = getBottomY() + PDF_FILE_MARGIN;
        const inserts = [];

        for (let i = 0; i < totalPages; i++) {
            const col = i % PDF_GRID_COLS;
            const row = Math.floor(i / PDF_GRID_COLS);

            const posX = DEFAULT_NOTE_POSITION.x + col * (PDF_NOTE_WIDTH + PDF_GAP_X);
            const posY = startY + row * (PDF_NOTE_HEIGHT + PDF_GAP_Y);

            inserts.push({
                text: '', 
                x: posX,
                y: posY,
                width: PDF_NOTE_WIDTH, 
                height: PDF_NOTE_HEIGHT,
                color: NOTE_COLOR_WHITE, 
                type: 'pdf', 
                file_url: url, 
                page_index: i + 1,
                replies: [], 
                is_locked: true, 
                isRead: false
            });
        }

        if (inserts.length > 0) {
            await supabase.from('notes').insert(inserts);
        }
    }, [getBottomY]);

    return { handleAddPdfNote, handleAddAllPdfPages };
};