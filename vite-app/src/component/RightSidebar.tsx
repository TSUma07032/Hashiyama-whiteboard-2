// RightSidebar.tsx
import React from 'react';

/**
 * @filename RightSidebar.tsx
 * @fileoverview RightSidebarコンポーネントは、右側の情報パネルを表示します。
 * @author 守屋翼
 */
type RightSidebarProps = {
    className?: string; // classNameを受け取れるようにする
};
export default function RightSidebar({ className }: RightSidebarProps) {
    return (
        // 受け取ったclassNameをaside要素に適用する
        <aside className={`w-64 bg-gray-100 p-4 shadow-lg rounded-l-lg flex flex-col items-center ${className || ''}`}>
            {/* 右サイドバーのプレースホルダー */}
            <div className="w-full h-12 bg-gray-300 rounded-md mb-4 flex items-center justify-center text-gray-600 font-medium">ヘッダー</div>
            <div className="w-full h-24 bg-gray-300 rounded-md mb-4 flex items-center justify-center text-gray-600 font-medium">発表者情報</div>
            <div className="w-full h-32 bg-gray-300 rounded-md flex items-center justify-center text-gray-600 font-medium">タイマー機能</div>
            <div className="w-full h-48 mt-4 bg-gray-300 rounded-md flex items-center justify-center text-gray-600 font-medium">質問リスト</div>
        </aside>
    );
}