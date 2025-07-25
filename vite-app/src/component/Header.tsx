// Header.tsx
import React from 'react';

/**
 * @filename Header.tsx
 * @fileoverview Headerコンポーネントは、アプリケーションのヘッダーメニューを表示します。
 * @author 守屋翼
 */

type HeaderProps = {
    className?: string; // classNameを受け取れるようにする
};
export default function Header({ className }: HeaderProps) {
    return (
        // 受け取ったclassNameをheader要素に適用する
        <header className={`w-full bg-gray-200 p-4 shadow-md rounded-b-lg flex items-center justify-center ${className || ''}`}>
            {/* ヘッダーメニューのプレースホルダー */}
            <p className="text-xl font-semibold text-gray-700">ヘッダーメニュー (保存機能など、使用頻度が低い機能をここに隔離)</p>
        </header>
    );
}