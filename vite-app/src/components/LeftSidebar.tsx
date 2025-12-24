import React from 'react';
import ImageUploader from './ImageUploader';
// ▼ 作ったCSSをインポート！パスは環境に合わせて調整してね（@/styles/... か ../styles/...）
import '@/styles/LeftSidebar.css'; 

type LeftSidebarProps = {
    className?: string;
    onIconUpload: (imageUrl: string) => void;
    onTogglePdfViewer: () => void;
    dataNoPan?: boolean;
};

export default function LeftSidebar({ className, onIconUpload, onTogglePdfViewer, dataNoPan }: LeftSidebarProps) {

    const onDragStart = (event: React.DragEvent, nodeType: string, color: string) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, color }));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside 
            // ▼ Tailwindの長いクラスを消して、独自のクラス .left-sidebar を使用
            className={`left-sidebar ${className || ''}`} 
            data-no-pan={dataNoPan ? 'true' : undefined}
        >
            <div className="tool-tab-header">ツールタブ</div>
            
            <div className="items-container">
                <ImageUploader onUpload={onIconUpload} />

                {/* 付箋テンプレート（赤） */}
                {/* style={{...}} を削除して className="note-template comment" に！ */}
                <div
                    className="note-template comment"
                    draggable
                    onDragStart={(event) => onDragStart(event, 'note', 'r')}
                >
                    コメント
                </div>

                {/* 付箋テンプレート（青） */}
                <div
                    className="note-template question"
                    draggable
                    onDragStart={(event) => onDragStart(event, 'note', 'b')}
                >
                    質問
                </div>
            </div>

            <div className="pdf-button-container">
                <button 
                    onClick={onTogglePdfViewer}
                    className="pdf-button"
                >
                    PDFを開く
                </button>
            </div>
        </aside>
    );
}