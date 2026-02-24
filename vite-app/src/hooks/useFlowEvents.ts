// src/hooks/useFlowEvents.ts
import { useCallback, useState } from 'react';
import type { NodeDragHandler, Node } from 'reactflow';
import type { NoteData } from '@/types';

type UseFlowEventsProps = {
    onNotesChange: (id: string, x: number, y: number) => void;
    onAddNote: (text: string, color: string, x: number, y: number) => void;
    onUpdateNote: (id: string, updates: Partial<NoteData>) => void;
    screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
};

export const useFlowEvents = ({
    onNotesChange,
    onAddNote,
    onUpdateNote,
    screenToFlowPosition
}: UseFlowEventsProps) => {
    // コンテキストメニューの状態もここで管理する
    const [menu, setMenu] = useState<{ id: string, top?: number, left?: number } | null>(null);

    const onNodeDragStop: NodeDragHandler = useCallback((_e, node) => {
        onNotesChange(node.id, node.position.x, node.position.y);
    }, [onNotesChange]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault(); 
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const reactFlowData = event.dataTransfer.getData('application/reactflow');
        if (!reactFlowData) return;

        const { color } = JSON.parse(reactFlowData);
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

        onAddNote('', color, position.x, position.y);
    }, [screenToFlowPosition, onAddNote]);

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setMenu(null);
        onUpdateNote(node.id, { z_index: Date.now() });
    }, [onUpdateNote]);

    const onNodeDragStart: NodeDragHandler = useCallback((_event, node) => {
        setMenu(null);
        onUpdateNote(node.id, { z_index: Date.now() });
    }, [onUpdateNote]);

    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        setMenu({
            id: node.id,
            top: event.clientY,
            left: event.clientX,
        });
    }, []);

    const onPaneClick = useCallback(() => setMenu(null), []);

    return {
        menu,
        setMenu,
        onNodeDragStop,
        onDragOver,
        onDrop,
        onNodeClick,
        onNodeDragStart,
        onNodeContextMenu,
        onPaneClick
    };
};