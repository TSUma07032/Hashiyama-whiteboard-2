// LeftSidebar.tsx
import { type CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import ImageUploader from './ImageUploader';
import '../styles/Note.css'; // Note.cssをインポートして、付箋のスタイルを流用する

/**
 * @filename LeftSidebar.tsx
 * @fileoverview LeftSidebarコンポーネントは、左側のツールパレットを表示します。
 * @author 守屋翼
 */
type LeftSidebarProps = {
    className?: string; // classNameを受け取れるようにする
    onIconUpload: (imageUrl: string) => void;
    onTogglePdfViewer: () => void;
    dataNoPan?: boolean; // data-no-pan属性を受け取れるようにする
};

export default function LeftSidebar({ className, onIconUpload, onTogglePdfViewer, dataNoPan }: LeftSidebarProps) {
    // 赤い付箋のテンプレート
    const {
        attributes: redAttributes,
        listeners: redListeners,
        setNodeRef: setRedNodeRef,
        transform: redTransform,
        isDragging: isRedDragging
    } = useDraggable({
        id: 'red-note-template', // ユニークなIDを設定
        data: { color: 'r', text: '赤の付箋', type: 'note-template' }, // 色とテキストをデータとして渡す
    });

    const redStyle: CSSProperties = {
        transform: redTransform ? `translate3d(${redTransform.x}px, ${redTransform.y}px, 0)` : undefined,
        cursor: isRedDragging ? 'grabbing' : 'grab',
        opacity: isRedDragging ? 0.8 : 1,
        position: 'relative',
        zIndex: isRedDragging ? 9999 : undefined,
    };

    // 青い付箋のテンプレート
    const {
        attributes: blueAttributes,
        listeners: blueListeners,
        setNodeRef: setBlueNodeRef,
        transform: blueTransform,
        isDragging: isBlueDragging
    } = useDraggable({
        id: 'blue-note-template', // ユニークなIDを設定
        data: { color: 'b', text: '青の付箋', type: 'note-template' },
    });

    const blueStyle: CSSProperties = {
        transform: blueTransform ? `translate3d(${blueTransform.x}px, ${blueTransform.y}px, 0)` : undefined,
        cursor: isBlueDragging ? 'grabbing' : 'grab',
        opacity: isBlueDragging ? 0.8 : 1,
        position: 'relative',
        zIndex: isBlueDragging ? 9999 : undefined,
    };

    return (
        // 受け取ったclassNameをaside要素に適用する
        <aside className={`w-64 bg-gray-100 p-4 shadow-lg rounded-r-lg flex flex-col items-center ${className || ''}`} data-no-pan={dataNoPan ? 'true' : undefined}>
            {/* 左サイドバーのプレースホルダー */}
            <div className="w-full h-12 bg-gray-300 rounded-md mb-4 flex items-center justify-center text-gray-600 font-medium">ツールタブ</div>
            
            <ImageUploader onUpload={onIconUpload} />

            {/* 赤い付箋のテンプレート */}
            <div
                ref={setRedNodeRef}
                style={redStyle}
                {...redAttributes}
                {...redListeners}
                className={clsx('note', 'note-red', 'template-note')} // noteとnote-redのクラスを適用
            >
                <div className="note-text-readonly">赤の付箋</div>
            </div>

            {/* 青い付箋のテンプレート */}
            <div
                ref={setBlueNodeRef}
                style={blueStyle}
                {...blueAttributes}
                {...blueListeners}
                className={clsx('note', 'note-blue', 'template-note')} // noteとnote-blueのクラスを適用
            >
                <div className="note-text-readonly">青の付箋</div>
            </div>
            
            <div className="w-full h-32 bg-gray-300 rounded-md mb-4 flex items-center justify-center text-gray-600 font-medium">色選択</div>
            <div className="w-full h-48 bg-gray-300 rounded-md flex items-center justify-center text-gray-600 font-medium">追加ツール</div>
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