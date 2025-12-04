import React from 'react';
import ImageUploader from './ImageUploader';

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
        // ▼▼▼ w-full と items-center で中央揃え＆幅追従！ ▼▼▼
        <aside 
            className={`w-full bg-gray-100 p-4 shadow-lg rounded-r-lg flex flex-col items-center ${className || ''}`} 
            data-no-pan={dataNoPan ? 'true' : undefined}
        >
            <div className="w-full h-12 bg-gray-300 rounded-md mb-4 flex items-center justify-center text-gray-600 font-medium">ツールタブ</div>
            
            {/* ▼▼▼ ここ！ImageUploaderの中身も確認が必要だが、まずはコンテナを整理 ▼▼▼ */}
            <div className="w-full flex flex-col items-center gap-4">
                <ImageUploader onUpload={onIconUpload} />

                {/* 付箋テンプレート（ドラッグ元） */}
                <div
                    className="w-full h-64 rounded-lg shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center font-bold text-gray-700 transition-transform hover:scale-105 hover:shadow-lg"
                    style={{ backgroundColor: '#ff9999', border: '1px solid rgba(0,0,0,0.1)' }}
                    draggable
                    onDragStart={(event) => onDragStart(event, 'note', 'r')}
                >
                    コメント
                </div>

                <div
                    className="w-full h-64 rounded-lg shadow-md cursor-grab active:cursor-grabbing flex items-center justify-center font-bold text-gray-700 transition-transform hover:scale-105 hover:shadow-lg"
                    style={{ backgroundColor: '#99ccff', border: '1px solid rgba(0,0,0,0.1)' }}
                    draggable
                    onDragStart={(event) => onDragStart(event, 'note', 'b')}
                >
                    質問
                </div>
            </div>

            <div className="mt-8 w-full max-w-[200px]">
                <button 
                    onClick={onTogglePdfViewer}
                    className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded hover:bg-gray-600 shadow transition-colors"
                >
                    PDFを開く
                </button>
            </div>
        </aside>
    );
}