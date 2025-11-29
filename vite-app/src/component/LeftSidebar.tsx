import React from 'react';
// useDraggable とか dnd-kit 系は削除！
import ImageUploader from './ImageUploader';

type LeftSidebarProps = {
    className?: string;
    onIconUpload: (imageUrl: string) => void;
    onTogglePdfViewer: () => void;
    dataNoPan?: boolean;
};

export default function LeftSidebar({ className, onIconUpload, onTogglePdfViewer, dataNoPan }: LeftSidebarProps) {

    // ▼▼▼ これが標準のドラッグ開始イベントだ！ ▼▼▼
    const onDragStart = (event: React.DragEvent, nodeType: string, color: string) => {
        // "application/reactflow" というキーでデータを仕込む（React Flow流儀）
        event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, color }));
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <aside className={`w-64 bg-gray-100 p-4 shadow-lg rounded-r-lg flex flex-col items-center ${className || ''}`} data-no-pan={dataNoPan ? 'true' : undefined}>
            <div className="w-full h-12 bg-gray-300 rounded-md mb-4 flex items-center justify-center text-gray-600 font-medium">ツールタブ</div>
            
            <ImageUploader onUpload={onIconUpload} />

            <div className="flex flex-col gap-4 w-full">
                {/* ▼▼▼ 赤い付箋（シンプル版） ▼▼▼ */}
                <div
                    className="note note-red template-note cursor-grab p-2 text-center select-none"
                    draggable // ◀◀◀ これだけでドラッグ可能になる！
                    onDragStart={(event) => onDragStart(event, 'note', 'r')}
                >
                    赤の付箋
                </div>

                {/* ▼▼▼ 青い付箋（シンプル版） ▼▼▼ */}
                <div
                    className="note note-blue template-note cursor-grab p-2 text-center select-none"
                    draggable
                    onDragStart={(event) => onDragStart(event, 'note', 'b')}
                >
                    青の付箋
                </div>
            </div>
            <div className="mt-8">
                <button 
                    onClick={onTogglePdfViewer}
                    className="w-full bg-gray-700 text-white font-bold py-2 px-4 rounded hover:bg-gray-600"
                >
                    PDFを開く
                </button>
            </div>
        </aside>
    );
}