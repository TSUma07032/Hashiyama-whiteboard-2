// MainContent.tsx
import React, { forwardRef, type ReactNode } from 'react';

type MainContentProps = {
    className?: string;
    children?: ReactNode;
    scale: number;
    viewpoint?: { x: number; y: number }; 
    onPanStart?: (event: React.MouseEvent) => void;
};

const MainContent = forwardRef<HTMLElement, MainContentProps>(({ className, children, scale, viewpoint, onPanStart }, ref) => {

    const containerStyle = {
        transform: `translate(${viewpoint?.x ?? 0}px, ${viewpoint?.y ?? 0}px) scale(${scale})`,
        transformOrigin: 'top left',
    };

    return (
        <main
            ref={ref} // refを直接渡す
            className={`flex-1 overflow-hidden p-4 relative ${className || ''}`} // overflow-auto を hidden に変更！
            onMouseDown={onPanStart} // ここでパン開始！
        >
            <div style={containerStyle}>
                {children}
            </div>
        </main>
    );
});

export default MainContent;