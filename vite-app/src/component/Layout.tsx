// Layout.tsx
import React, { useState, useRef } from 'react';
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MainContent from './MainContent'; // MainContentコンポーネントをインポート
import NoteList from './NoteList'; // NoteListコンポーネントをインポート
import NoteInput from './NoteInput'; // NoteInputをインポート
import { DndContext, type DragEndEvent, type DragStartEvent} from '@dnd-kit/core';
import { nanoid } from "nanoid"; // nanoidをインポート(TODO: firebaseが付与するIDに変更予定)
import type { NoteData } from './index.d'; // NoteData型をインポート
import '../styles/layout.css';


/**
 * @filename Layout.tsx
 * @fileoverview Layoutコンポーネントは、アプリケーション全体のレイアウトを定義します。
 * @author 守屋翼
 */
const DEFAULT_NOTE_POSITION = { x: 50, y: 150 }; // デフォルトの座標を定義

// 後でこのパラメータを可変とする
const NOTE_WIDTH = 200;
const NOTE_HEIGHT = 100;

export default function Layout() {
    const [notes, setNotes] = useState<NoteData[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isDroppingNoteTemplate, setIsDroppingNoteTemplate] = useState(false);
    const mainContentRef = useRef<HTMLElement>(null); 
    const startPositionRef = useRef({ x: 0, y: 0 });
    const [uploadedIcon, setUploadedIcon] = useState<string | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string); //「activeId」を更新する(event.active.idは、ドラッグを開始したコンポーネントのIDを取得する)
        startPositionRef.current = { //startPositionRefを、D&Dし始めの座標で更新
            x: event.active.rect.current.initial?.left ?? 0,
            y: event.active.rect.current.initial?.top ?? 0,
        };
        // テンプレートをドラッグしてるか判定する
        if (event.active.data.current?.type === 'note-template') {
            setIsDroppingNoteTemplate(true);
        }
    };

    // ノート追加処理
    const handleAddNote = (text: string, color: string, x?: number, y?: number, icon?: string) => {
        const newNote: NoteData = {
            id: nanoid(),
            text,
            // 座標計算もシンプルにしたぜぃ！
            x: x !== undefined ? x : DEFAULT_NOTE_POSITION.x,
            y: y !== undefined ? y : DEFAULT_NOTE_POSITION.y,
            color: color,
            icon: uploadedIcon,
        };
        setNotes((prevNotes) => [...prevNotes, newNote]);
    };

    // ノート削除処理
    const handleDelete = (idToDelete: string) => {
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== idToDelete));
        console.log(`ノート (id: ${idToDelete}) を削除しました。`);
    };

    // ノート編集処理
    const handleEditNote = (idToEdit: string, newText: string) => {
        setNotes((prevNotes) =>
            prevNotes.map((note) =>
                note.id === idToEdit ? { ...note, text: newText } : note
            )
        );
    };

    // ドラッグ終了時のハンドラ
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over, delta } = event;
        const activeData = active.data.current as { type?: string, color?: string, text?: string };
        
        if (over?.id === 'main-content-droppable' && activeData?.type === 'note-template') {
            if (mainContentRef.current) {
                const mainContentRect = mainContentRef.current.getBoundingClientRect();
                
                // ✨ここを修正するんだニャ！✨
                // ドロップ位置は、ドラッグ開始位置 + ドラッグ量 - mainContentのオフセットで計算するぜぃ！
                const dropX = (active.rect.current.translated?.left ?? startPositionRef.current.x) - mainContentRect.left + mainContentRef.current.scrollLeft;
                const dropY = (active.rect.current.translated?.top ?? startPositionRef.current.y) - mainContentRect.top + mainContentRef.current.scrollTop;
            
                handleAddNote(activeData.text || '', activeData.color || 'r', dropX, dropY, uploadedIcon || undefined);
            }
        } else {
            // ここは既存の付箋の移動ロジック
            setNotes((prevNotes) =>
                prevNotes.map((note) =>
                    note.id === active.id ? { ...note, x: note.x + delta.x, y: note.y + delta.y } : note
                )
            );
        }
        setActiveId(null);
    };

    return (
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <div className="app-layout">
                <Header className="header-area" />
                <LeftSidebar 
                    className="left-sidebar-area" 
                    onIconUpload={setUploadedIcon}
                />
                <MainContent
                    className="main-content-area"
                    isOverTemplate={activeId === 'red-note-template' || activeId === 'blue-note-template'}
                    ref={mainContentRef} // MainContentにRefを渡す！
                >
                    <NoteList notes={notes} onDelete={handleDelete} onEdit={handleEditNote} />
                </MainContent>
                <RightSidebar className="right-sidebar-area" />
                <NoteInput onAddNote={handleAddNote} />
            </div>
        </DndContext>
    );
}