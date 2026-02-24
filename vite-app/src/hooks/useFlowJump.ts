// src/hooks/useFlowJump.ts
import { useEffect } from 'react';
import type { NoteData } from '@/types';

type UseFlowJumpProps = {
    jumpTargetId?: string | null;
    notes: NoteData[];
    setCenter: (x: number, y: number, options?: any) => void;
    onJumpComplete?: () => void;
};

export const useFlowJump = ({ jumpTargetId, notes, setCenter, onJumpComplete }: UseFlowJumpProps) => {
    useEffect(() => {
        if (!jumpTargetId) return;
        
        const targetNode = notes.find(n => n.id === jumpTargetId);
        if (targetNode) {
            const targetX = targetNode.x + (targetNode.width || 200) / 2;
            const targetY = targetNode.y + (targetNode.height || 100) / 2;
            // 指定の座標にカメラを移動させる
            setCenter(targetX, targetY, { zoom: 1.0, duration: 800 });
        }
        
        if (onJumpComplete) onJumpComplete();
    }, [jumpTargetId, notes, setCenter, onJumpComplete]);
};