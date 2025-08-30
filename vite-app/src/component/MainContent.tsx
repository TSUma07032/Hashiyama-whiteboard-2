// MainContent.tsx
import React, { forwardRef, type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';

type MainContentProps = {
    className?: string;
    children?: ReactNode;
    isOverTemplate: boolean;
};

const MainContent = forwardRef<HTMLElement, MainContentProps>(({ className, children, isOverTemplate }, ref) => {
    const { setNodeRef, isOver } = useDroppable({ //useDroppableを使って、ドロップ可能な領域を定義する
        id: 'main-content-droppable', // ドロップ可能な領域のIDを設定
    });

    const combinedRef = (node: HTMLElement | null) => {
        setNodeRef(node);
        if (ref) {
            if (typeof ref === 'function') {
                ref(node);
            } else {
                ref.current = node;
            }
        }
    };

    const droppableStyle = {
        backgroundColor: isOver && isOverTemplate ? 'rgba(255, 0, 0, 0.2)' : undefined, // ここも元に戻すぜぃ！
    };

    return (
        <main
            ref={combinedRef}
            style={droppableStyle}
            className={`flex-1 overflow-auto p-4 relative ${className || ''}`}
        >
            {children}
        </main>
    );
});

export default MainContent;