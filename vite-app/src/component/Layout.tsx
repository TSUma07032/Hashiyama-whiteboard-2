// Layout.tsx
import React from 'react';
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MainContent from './MainContent';
import '../styles/layout.css';

/**
 * @filename Layout.tsx
 * @fileoverview Layoutコンポーネントは、アプリケーション全体のレイアウトを定義します。
 * @author 守屋翼
 */
export default function Layout() {
    return (
        <div className="app-layout"> {/* 新しいCSSクラスを適用する */}
            <Header className="header-area" /> {/* クラスを追加するためにHeaderコンポーネントにpropsを渡せるようにする必要があるニャ */}
            <LeftSidebar className="left-sidebar-area" />
            <MainContent className="main-content-area" />
            <RightSidebar className="right-sidebar-area" />
        </div>
    );
}