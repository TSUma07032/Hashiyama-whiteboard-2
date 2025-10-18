// Layout.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MainContent from './MainContent'; // MainContentコンポーネントをインポート
import NoteList from './NoteList'; // NoteListコンポーネントをインポート
import NoteInput from './NoteInput'; // NoteInputをインポート
import { DndContext, type DragEndEvent, type DragStartEvent, MouseSensor, useSensor, useSensors} from '@dnd-kit/core';
import { nanoid } from "nanoid"; // nanoidをインポート(TODO: firebaseが付与するIDに変更予定)
import type { NoteData, ReplyData } from './index.d'; // NoteData型をインポート
import '../styles/layout.css';


/**
 * @filename Layout.tsx
 * @fileoverview Layoutコンポーネントは、アプリケーション全体のレイアウトを定義します。
 * @author 守屋翼
 */
const DEFAULT_NOTE_POSITION = { x: 50, y: 150 }; // デフォルトの座標を定義
const DEFAULT_NOTE_SIZE = { width: 200, height: 100 };

export default function Layout() {
    const [notes, setNotes] = useState<NoteData[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isDroppingNoteTemplate, setIsDroppingNoteTemplate] = useState(false);
    const mainContentRef = useRef<HTMLElement>(null); 
    const startPositionRef = useRef({ x: 0, y: 0 });
    const [uploadedIcon, setUploadedIcon] = useState<string | null>(null);
    const [scale, setScale] = useState<number>(1);

    const [viewpoint, setViewpoint] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });

    const viewpointRef = useRef(viewpoint);
    useEffect(() => {
        viewpointRef.current = viewpoint;
    }, [viewpoint]);

    // ↓↓↓ ドラッグ開始時のカーソル位置を記憶するための箱を追加！ ↓↓↓
    const dragStartCursorRef = useRef({ x: 0, y: 0 });

    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: {
            distance: 10, // 10px以上動かしたらドラッグ開始
        },
    });
    const sensors = useSensors(mouseSensor);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string); //「activeId」を更新する(event.active.idは、ドラッグを開始したコンポーネントのIDを取得する)
        // activatorEvent が MouseEvent か TouchEvent かでプロパティが違うので判定
        if ('clientX' in event.activatorEvent && 'clientY' in event.activatorEvent) {
            const mouseEvent = event.activatorEvent as MouseEvent;
            dragStartCursorRef.current = {
                x: mouseEvent.clientX,
                y: mouseEvent.clientY,
            };
        }
        
        // テンプレートをドラッグしてるか判定する
        if (event.active.data.current?.type === 'note-template') {
            // isDroppingNoteTemplate の state はもう使ってないので削除してもOK
        }
    };

    // ノート追加処理
    const handleAddNote = (text: string, color: string, x?: number, y?: number, icon?: string) => {
        const newNote: NoteData = {
            id: nanoid(),
            text,
            // 座標計算もシンプルにした
            x: x !== undefined ? x : DEFAULT_NOTE_POSITION.x,
            y: y !== undefined ? y : DEFAULT_NOTE_POSITION.y,
            width: DEFAULT_NOTE_SIZE.width,
            height: DEFAULT_NOTE_SIZE.height,
            color: color,
            icon: uploadedIcon,
        };
        setNotes((prevNotes) => [...prevNotes, newNote]);
    };

    const handleResizeNote = (id: string, newWidth: number, newHeight: number) => {
        setNotes((prevNotes) =>
            prevNotes.map((note) =>
                note.id === id ? { ...note, width: newWidth, height: newHeight } : note
            )
        );
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
        const { active, delta } = event;

        // activeId が null でない、つまり何かしらの要素がドラッグされた場合
        if (activeId) {
            const activeData = active.data.current as { type?: string, color?: string, text?: string };

             if (activeData?.type === 'note-template') {
                if (mainContentRef.current && event.active.rect.current.translated) {
                    const mainContentRect = mainContentRef.current.getBoundingClientRect();
                    
                     // 1. ドラッグ開始時のカーソル位置に、総移動量(delta)を足して、最終的なカーソル位置を算出
                    const finalCursorX = dragStartCursorRef.current.x + delta.x;
                    const finalCursorY = dragStartCursorRef.current.y + delta.y;

                    // 2. そのカーソル位置を、MainContent内の相対座標に変換
                    const dropX = finalCursorX - mainContentRect.left;
                    const dropY = finalCursorY - mainContentRect.top;
                    
                    // 3. 最後に、視点とスケールを考慮してワールド座標に変換！
                    //    （信頼できる座標を使うので、計算式は数学的に正しい「-」に戻す！）
                    const currentViewpoint = viewpointRef.current;
                    const worldX = (dropX - currentViewpoint.x) / scale;
                    const worldY = (dropY - currentViewpoint.y) / scale;

                    handleAddNote(activeData.text || '', activeData.color || 'r', worldX, worldY, uploadedIcon || undefined);
                }
            } else {
                // 既存の付箋の移動ロジック
                setNotes((prevNotes) =>
                    prevNotes.map((note) =>
                        note.id === active.id ? { ...note, x: note.x + delta.x / scale, y: note.y + delta.y / scale } : note
                    )
                );
            }
        }
        setActiveId(null);
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const newScale = e.deltaY > 0 ? scale * 0.9 : scale * 1.1; // ズームイン・ズームアウトの計算
        setScale(Math.min(Math.max(0.5, newScale), 2)); // 最小0.5倍、最大2倍に制限する
    };

    /**
     * 返信を追加する処理
     * @param noteId - 返信する対象の付箋ID
     * @param replyText - 返信内容
     */
    const handleAddReply = (noteId: string, replyText: string) => {
        const newReply: ReplyData = {
            id: nanoid(),
            noteId: noteId,
            text: replyText,
            icon: uploadedIcon, // 現在設定されてるアイコンを使う
            createdAt: new Date(),
        };

        setNotes(prevNotes => 
            prevNotes.map(note => {
                if (note.id === noteId) {
                    // 既存のreplies配列に新しい返信を追加する
                    const updatedReplies = note.replies ? [...note.replies, newReply] : [newReply];
                    return { ...note, replies: updatedReplies };
                }
                return note;
            })
        );
        console.log(`付箋 (id: ${noteId}) に返信を追加しました: ${replyText}`);
    };

    const handleToggleReadStatus = (noteId: string) => {
        setNotes(prevNotes =>
            prevNotes.map(note =>
                note.id === noteId ? { ...note, isRead: !note.isRead } : note
            )
        );
    };

    const handleZoomIn = () => {
        setScale(prevScale => Math.min(prevScale * 1.2, 2)); // 1.2倍ずつ拡大（最大2倍）
    };

    const handleZoomOut = () => {
        setScale(prevScale => Math.max(prevScale / 1.2, 0.5)); // 1.2倍ずつ縮小（最小0.5倍）
    };

    const handleZoomReset = () => {
        setScale(1); // 100%表示に戻す
    };

    const handlePanStart = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        // クリックした要素、またはその親に data-dnd-draggable 属性があったら、パン操作をしな
        if (target.closest('[data-dnd-draggable="true"]')) {
            return;
        }

        // こっちのガードマンも重要
        if (target.closest('[data-no-pan="true"]')) {
            return;
        }
        
        // ガードを突破したものだけが、パン操作を開始できる
        e.preventDefault();
        panStartRef.current = { x: e.clientX, y: e.clientY };
        setIsPanning(true);
    }, []);

    const handlePanMove = useCallback((e: MouseEvent) => {
        if (!isPanning) return;
        e.preventDefault();
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setViewpoint(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        panStartRef.current = { x: e.clientX, y: e.clientY };
    }, [isPanning]);

    const handlePanEnd = useCallback(() => {
        setIsPanning(false);
    }, []);

    useEffect(() => {
        if (isPanning) {
            window.addEventListener('mousemove', handlePanMove);
            window.addEventListener('mouseup', handlePanEnd);
        } else {
            window.removeEventListener('mousemove', handlePanMove);
            window.removeEventListener('mouseup', handlePanEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handlePanMove);
            window.removeEventListener('mouseup', handlePanEnd);
        };
    }, [isPanning, handlePanMove, handlePanEnd]);

    return (
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors}>
            
            <div className="app-layout relative" >{/* onWheel={handleWheel} */}
                <Header className="header-area" data-no-pan="true" />
                <LeftSidebar 
                    className="left-sidebar-area" 
                    onIconUpload={setUploadedIcon}
                    data-no-pan="true"
                />
                <MainContent
                    className="main-content-area"
                    ref={mainContentRef}
                    scale={scale}
                    viewpoint={viewpoint} // viewpoint を渡す
                    onPanStart={handlePanStart} // パン開始関数を渡す
                >
                    <NoteList notes={notes} onDelete={handleDelete} onEdit={handleEditNote} onResize={handleResizeNote} scale={scale} onAddReply={handleAddReply} onToggleReadStatus={handleToggleReadStatus} />
                </MainContent>
                <RightSidebar className="right-sidebar-area" notes={notes} onAddReply={handleAddReply} onToggleReadStatus={handleToggleReadStatus} />
                <NoteInput onAddNote={handleAddNote} />
                <div className="zoom-controls" data-no-pan="true">
                    <button onClick={handleZoomOut} className="zoom-button">-</button>
                    <span className="zoom-display" onClick={handleZoomReset}>
                        {Math.round(scale * 100)}%
                    </span>
                    <button onClick={handleZoomIn} className="zoom-button">+</button>
                </div>
            </div>
        </DndContext>
    );
}