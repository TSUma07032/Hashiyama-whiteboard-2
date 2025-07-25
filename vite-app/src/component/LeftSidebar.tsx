// LeftSidebar.tsx
import React from 'react';

/**
 * @filename LeftSidebar.tsx
 * @fileoverview LeftSidebarコンポーネントは、左側のツールパレットを表示します。
 * @author 守屋翼
 */
type LeftSidebarProps = {
    className?: string; // classNameを受け取れるようにする
};
export default function LeftSidebar({ className }: LeftSidebarProps) {
    return (
        // 受け取ったclassNameをaside要素に適用する
        <aside className={`w-64 bg-gray-100 p-4 shadow-lg rounded-r-lg flex flex-col items-center ${className || ''}`}>
            {/* 左サイドバーのプレースホルダー */}
            <div className="w-full h-12 bg-gray-300 rounded-md mb-4 flex items-center justify-center text-gray-600 font-medium">ツールタブ</div>
            <div className="w-full h-24 bg-gray-300 rounded-md mb-4 flex items-center justify-center text-gray-600 font-medium">ブラシサイズ</div>
            <div className="w-full h-32 bg-gray-300 rounded-md mb-4 flex items-center justify-center text-gray-600 font-medium">色選択</div>
            <div className="w-full h-48 bg-gray-300 rounded-md flex items-center justify-center text-gray-600 font-medium">追加ツール</div>
        </aside>
    );
}