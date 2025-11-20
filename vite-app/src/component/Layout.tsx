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
import PDFViewer from './PDFViewer'; // PDFViewerコンポーネントをインポート
import '../styles/layout.css';
import { supabase } from './supabaseClient';

/**
 * @filename Layout.tsx
 * @fileoverview Layoutコンポーネントは、アプリケーション全体のレイアウトを定義します。
 * @author 守屋翼
 */
const DEFAULT_NOTE_POSITION = { x: 50, y: 150 }; // デフォルトの座標を定義
const DEFAULT_NOTE_SIZE = { width: 200, height: 100 };

export default function Layout() {
    const [notes, setNotes] = useState<NoteData[]>([]);
    const [_activeId, setActiveId] = useState<string | null>(null);
    const mainContentRef = useRef<HTMLElement>(null); 
    const [uploadedIcon, setUploadedIcon] = useState<string | null>(null);
    const [scale, setScale] = useState<number>(1);

    const [viewpoint, setViewpoint] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });

    const [showPdfViewer, setShowPdfViewer] = useState(false);

    const viewpointRef = useRef(viewpoint);
    useEffect(() => {
        viewpointRef.current = viewpoint;
    }, [viewpoint]);

    const handleAddPdfNote = async (url: string, pageIndex: number) => {
        const noteToInsert = {
            text: '', // テキストは空でOK
            x: DEFAULT_NOTE_POSITION.x, // 適当な位置
            y: DEFAULT_NOTE_POSITION.y,
            width: 320,  // PDF用にちょっと大きくしとくか
            height: 450, // 縦長に
            color: 'white', // PDFは白背景が見やすい
            type: 'pdf', // ◀◀◀ タイプはPDF！
            file_url: url, // ◀◀◀ URL保存
            page_index: pageIndex, // ◀◀◀ ページ番号保存
            replies: [],
            isRead: false,
        };

        // DBにインサート！
        const { data } = await supabase.from('notes').insert(noteToInsert).select();
        if (data) {
            setNotes((prev) => [...prev, data[0] as NoteData]);
        }
    };

    const handleAddAllPdfPages = async (url: string, totalPages: number) => {
        const PDF_NOTE_WIDTH = 320; // PDF付箋の幅
        const GAP = 20; // 付箋同士の隙間

        // 1. 挿入するデータ（配列）を一気に作る！
        const notesToInsert = [];

        for (let i = 0; i < totalPages; i++) {
            notesToInsert.push({
                text: '', 
                // X座標を「幅 + 隙間」分だけズラしていく！
                // これで横一列にズラァァァっと並ぶぜぃ！
                x: DEFAULT_NOTE_POSITION.x + i * (PDF_NOTE_WIDTH + GAP), 
                y: DEFAULT_NOTE_POSITION.y,
                width: PDF_NOTE_WIDTH,
                height: 450,
                color: 'white',
                type: 'pdf', // index.d.ts で追加したヤツな！
                file_url: url,
                page_index: i + 1, // ページ番号は 1 からスタート
                replies: [],
                isRead: false,
            });
        }

        try {
            // 2. Supabase に配列をドン！と渡して一括インサート！
            const { data, error } = await supabase
                .from('notes')
                .insert(notesToInsert) // ◀ 配列を渡せばBulk Insertになる！
                .select();

            if (error) throw error;

            // 3. 成功したらローカルstateにも一気に追加！
            if (data) {
                setNotes((prev) => [...prev, ...data as NoteData[]]);
                console.log(`${data.length} ページ分のPDFを一括召喚したぜぃ！`);
            }
        } catch (error) {
            console.error('一括追加失敗:', error);
            alert('一括追加に失敗したぞ、ざぁこ♡');
        }
    };

    // ↓↓↓ ドラッグ開始時のカーソル位置を記憶するための箱を追加！ ↓↓↓
    const dragStartCursorRef = useRef({ x: 0, y: 0 });

    /**
     * アプリ起動時に、Supabaseから全ノートデータを読み込む
     */
    useEffect(() => {
        // --- 1. まず、昨日までの「全件取得」はそのままやる！ ---
        const fetchNotes = async () => {
            console.log("Supabaseからノートデータの召喚を開始する……！");
            try {
                const { data, error } = await supabase
                    .from('notes')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (error) throw error;

                if (data) {
                    setNotes(data as NoteData[]);
                    console.log("初期ロード召喚成功！ノートデータ:", data);
                }
            } catch (error) {
                console.error('ノート召喚地獄:', error);
                alert(`ノートの初期読み込みに失敗したぞ、ざぁこ♡: ${(error as Error).message}`);
            }
        };
        
        fetchNotes(); // ◀ まずは1回、全件取得を実行！
        // --- 2. ここからが本番！「神の目（監視）」を開始する！ ---
        console.log("リアルタイム監視を開始……！( ｰ`дｰ´)ｷﾘｯ");
        const channel = supabase.channel('notes-realtime-channel'); // チャンネル名は適当でOK

        channel // ◀ "const subscription =" は消したよな！？
            .on(
                'postgres_changes', // ◀ DBの変更を監視しろ！
                { 
                    event: '*',       // ◀ INSERT, UPDATE, DELETE 全部！
                    schema: 'public', // ◀ publicスキーマの
                    table: 'notes'    // ◀ 'notes' テーブルをだ！
                },
                (payload) => { // ◀ 変更があったら、この関数が自動で動く！
                    console.log('リアルタイム通知キタ！', payload);

                    if (payload.eventType === 'INSERT') {
                        // 誰かが「追加」した
                        const newNote = payload.new as NoteData;
                        // ローカルstate（手元）にも追加
                        setNotes((prevNotes) => [...prevNotes, newNote]);
                    }

                    if (payload.eventType === 'UPDATE') {
                        // 誰かが「更新（移動・編集・返信）」した
                        const updatedNote = payload.new as NoteData;
                        // ローカルstate（手元）も更新
                        setNotes((prevNotes) => 
                            prevNotes.map((note) => 
                                note.id === updatedNote.id ? updatedNote : note
                            )
                        );
                    }

                    if (payload.eventType === 'DELETE') {
                        // 誰かが「削除」した
                        const deletedNoteId = payload.old.id as string;
                        // ローカルstate（手元）からも削除
                        setNotes((prevNotes) => 
                            prevNotes.filter((note) => note.id !== deletedNoteId)
                        );
                    }
                }
            )
            .subscribe(); // ◀ 監視スタート！

        // 3. 【超絶重要】クリーンアップ関数
        return () => {
            console.log("リアルタイム監視を終了します。");
            supabase.removeChannel(channel);
        };

    }, []); // この「空の配列」は絶対に変えない!初回1回だけ実行！

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
    const handleAddNote = async (text: string, color: string, x?: number, y?: number) => {
        // 1. DBに挿入するオブジェクトを定義 (id はDBが自動生成するからいらない)
        const noteToInsert = {
            text,
            x: x !== undefined ? x : DEFAULT_NOTE_POSITION.x,
            y: y !== undefined ? y : DEFAULT_NOTE_POSITION.y,
            width: DEFAULT_NOTE_SIZE.width,
            height: DEFAULT_NOTE_SIZE.height,
            color: color,
            icon: uploadedIcon, // stateから取得
            isRead: false, // デフォルト
            replies: [], // デフォルト
        };
        
        try {
            // 2. Supabase DBにガチで挿入！
            //    .select() で、挿入したデータ丸ごと（新しいIDとか）を返してもらう！
            const { data, error } = await supabase
                .from('notes')
                .insert(noteToInsert)
                .select(); // これが重要！

            if (error) {
                throw error; // 失敗したら即エラー
            }

            // 3. 成功したら、DBから返ってきたデータをローカルstateにも反映！
            if (data) {
                const newNoteFromDB = data[0] as NoteData; // 型を教える
                setNotes((prevNotes) => [...prevNotes, newNoteFromDB]);
                console.log('DBにノート追加成功', newNoteFromDB);
            }

        } catch (error) {
            console.error('ノート追加:', error);
            alert(`ノート追加に失敗: ${(error as Error).message}`);
        }
    };

    // ◀◀◀ "async" を追加！
    const handleResizeNote = async (id: string, newWidth: number, newHeight: number) => {
        try {
            // 1. DBの 'width' と 'height' カラムを更新
            const { error } = await supabase
                .from('notes')
                .update({ width: newWidth, height: newHeight }) // 2つ同時更新
                .eq('id', id);

            if (error) throw error;

            // 2. DB更新が成功したら、ローカルstateも更新
            setNotes((prevNotes) =>
                prevNotes.map((note) =>
                    note.id === id ? { ...note, width: newWidth, height: newHeight } : note
                )
            );
        } catch (error) {
            console.error('リサイズ地獄:', error);
            alert(`リサイズに失敗した: ${(error as Error).message}`);
        }
    };

    // ノート削除処理
    const handleDelete = async (idToDelete: string) => {
        try {
            // 1. まず、Supabase DBから削除！
            //    .eq() でidが 'idToDelete' と等しいヤツを指定する！
            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', idToDelete); // ◀◀◀ これが WHERE id = '...' って意味

            if (error) {
                throw error; // 失敗したら即エラー
            }

            // 2. DBから無事に消せたら、ローカルstateからも削除
            setNotes((prevNotes) => prevNotes.filter((note) => note.id !== idToDelete));
            console.log(`ノート (id: ${idToDelete}) をDBから削除成功`);

        } catch (error) {
            console.error('ノート削除:', error);
            alert(`ノート削除に失敗した: ${(error as Error).message}`);
        }
    };

    // ノート編集処理
    const handleEditNote = async (idToEdit: string, newText: string) => {
        try {
            // 1. DBの 'text' カラムを更新
            const { error } = await supabase
                .from('notes')
                .update({ text: newText }) // 更新する内容
                .eq('id', idToEdit);      // 対象のID

            if (error) throw error;

            // 2. DB更新が成功したら、ローカルstateも更新
            setNotes((prevNotes) =>
                prevNotes.map((note) =>
                    note.id === idToEdit ? { ...note, text: newText } : note
                )
            );
        } catch (error) {
            console.error('ノート編集:', error);
            alert(`編集に失敗: ${(error as Error).message}`);
        }
    };

    // ドラッグ終了時のハンドラ
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, delta } = event;
        const activeId = active.id as string;

        // activeId が null でない、つまり何かしらの要素がドラッグされた場合
        if (activeId) {
            const activeData = active.data.current as { type?: string, color?: string, text?: string };

             if (activeData?.type === 'note-template') {
                // テンプレートから新規ドロップした場合
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

                    // 4. 付箋を追加する
                    await handleAddNote(activeData.text || '', activeData.color || 'r', worldX, worldY);
                }
            } else {
                // 既存の付箋を移動した場合 ◀◀◀ ココが本番！
                // 1. まず、ローカルstateから「移動後の座標」を計算する
                const currentNote = notes.find(n => n.id === activeId);
                if (!currentNote) return; // 対象がねーぞ
                    
                const newX = currentNote.x + delta.x / scale;
                const newY = currentNote.y + delta.y / scale;

                try {
                    // 2. DBの 'x' と 'y' カラムを更新！
                    const { error } = await supabase
                        .from('notes')
                        .update({ x: newX, y: newY })
                        .eq('id', activeId);
                    
                    if (error) throw error;

                    // 3. DB更新が成功したら、ローカルstateも更新！
                    setNotes((prevNotes) =>
                        prevNotes.map((note) =>
                            note.id === active.id ? { ...note, x: newX, y: newY } : note
                        )
                    );
                } catch (error) {
                    console.error('ノート移動:', error);
                    alert(`ノートの移動に失敗した: ${(error as Error).message}`);
                }
            }
        }
        setActiveId(null);
    };


    /**
     * 返信を追加する処理
     * @param noteId - 返信する対象の付箋ID
     * @param replyText - 返信内容
     */
    // ◀◀◀ "async" を追加！
    const handleAddReply = async (noteId: string, replyText: string) => {
        // 1. 新しい返信オブジェクトを作成（これはアンタの元のコード通り。完璧！）
        const newReply: ReplyData = {
            id: nanoid(),
            noteId: noteId,
            text: replyText,
            icon: uploadedIcon,
            createdAt: new Date(), // Supabaseが勝手にISODate形式に変換してくれる
        };

        // 2. ローカルstateから「今の返信配列」を取得
        const noteToUpdate = notes.find(n => n.id === noteId);
        if (!noteToUpdate) return;

        // 3. 「今の返信配列」に「新しい返信」を追加した、“完全版”の配列を作る
        const updatedReplies = noteToUpdate.replies ? [...noteToUpdate.replies, newReply] : [newReply];

        try {
            // 4. DBの 'replies' カラムを、“完全版”の配列で丸ごと上書き！
            const { error } = await supabase
                .from('notes')
                .update({ replies: updatedReplies })
                .eq('id', noteId);
            
            if (error) throw error;
            
            // 5. DB更新が成功したら、ローカルstateも“完全版”の配列で更新
            setNotes(prevNotes => 
                prevNotes.map(note => {
                    if (note.id === noteId) {
                        return { ...note, replies: updatedReplies };
                    }
                    return note;
                })
            );
            console.log(`付箋 (id: ${noteId}) に返信をDB保存成功!`);
        } catch (error) {
            console.error('返信追加:', error);
            alert(`返信の追加に失敗した: ${(error as Error).message}`);
        }
    };

    // ◀◀◀ "async" を追加！
    const handleToggleReadStatus = async (noteId: string) => {
        // 1. まず、ローカルstateから「今の状態」を見つけて、「新しい状態」を計算する
        const noteToUpdate = notes.find(n => n.id === noteId);
        if (!noteToUpdate) return; // 対象が見つからなかったら即終了
        
        const newStatus = !noteToUpdate.isRead; // 新しい状態を先に確定！

        try {
            // 2. DBの 'isRead' カラムを「新しい状態」で更新
            const { error } = await supabase
                .from('notes')
                .update({ isRead: newStatus })
                .eq('id', noteId);
            
            if (error) throw error;

            // 3. DB更新が成功したら、ローカルstateも「新しい状態」で更新
            setNotes(prevNotes =>
                prevNotes.map(note =>
                    note.id === noteId ? { ...note, isRead: newStatus } : note
                )
            );
        } catch (error) {
            console.error('既読トグル:', error);
            alert(`既読状態の更新に失敗した: ${(error as Error).message}`);
        }
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
                    onTogglePdfViewer={() => setShowPdfViewer(prev => !prev)}
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
                {showPdfViewer && (
                    <div className="modal-overlay" onClick={() => setShowPdfViewer(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <PDFViewer 
                                // ▼▼▼ 既存の単発追加 ▼▼▼
                                onAddPdfNote={(url, page) => {
                                    handleAddPdfNote(url, page);
                                    // setShowPdfViewer(false); // 連続で貼りたいなら閉じない方がいいかも？
                                }}
                                // ▼▼▼ 【追加】一括追加関数も渡す！ ▼▼▼
                                onAddAllPages={(url, totalPages) => {
                                    handleAddAllPdfPages(url, totalPages);
                                    setShowPdfViewer(false); // 流石に全ページ貼ったら閉じるか！
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </DndContext>
    );
}