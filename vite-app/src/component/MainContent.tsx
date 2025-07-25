// MainContent.tsx
import React from 'react';
import NoteList from './NoteList'; // 既存のNoteListコンポーネントをインポート

/**
 * @filename MainContent.tsx
 * @fileoverview MainContentコンポーネントは、中央のホワイトボード本体（付箋置き場）を表示します。
 * @author 守屋翼
 */

type MainContentProps = {
    className?: string; // classNameを受け取れるようにするぜぃ！
};
export default function MainContent({ className }: MainContentProps) {
    return (
        // 受け取ったclassNameをmain要素に適用する
        <main className={`flex-1 bg-white p-4 overflow-hidden relative rounded-lg shadow-inner ${className || ''}`}>
            {/* ホワイトボード本体のタイトル */}
            <h2 className="text-2xl font-bold text-gray-800 absolute top-4 left-1/2 -translate-x-1/2 z-10">ホワイトボード本体</h2>
            {/* NoteListを配置して、付箋機能を提供する */}
            <div className="absolute inset-0 p-4"> {/* NoteListが親要素のサイズにフィットするように調整 */}
                <NoteList />
            </div>
        </main>
    );
}
