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
import html2canvas from 'html2canvas'; // ◀ 画像化ライブラリ
import jsPDF from 'jspdf';             // ◀ PDF生成ライブラリ

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const ResizeHandle = ({ className = "" }: { className?: string }) => (
    <PanelResizeHandle 
        className={`w-4 bg-transparent hover:bg-blue-100 transition-colors flex items-center justify-center outline-none cursor-col-resize z-50 ${className}`}
    >
        {/* デザイン上の「細い線」 */}
        <div className="w-0.5 h-full bg-gray-300 hover:bg-blue-400 transition-colors" />
    </PanelResizeHandle>
);

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

    const [leftWidth, setLeftWidth] = useState(260); // デフォルト幅
    const [rightWidth, setRightWidth] = useState(260);
    const [isResizing, setIsResizing] = useState(false); //  ドラッグ中にiframeに吸われない対策

    const [viewpoint, setViewpoint] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });
    const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null);

    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null); // 印刷対象（MainContent）への参照
    const handlePrint = async () => {
        // ノートが1個もないときは何もしない
        if (!contentRef.current || notes.length === 0) {
            alert("付箋がひとつもないぞ、ざぁこ♡");
            return;
        }

        const originalCursor = document.body.style.cursor;
        document.body.style.cursor = 'wait';

        try {
            // 1. 全ノートの座標から、全体の「バウンディングボックス（境界）」を計算する！
            //    これで「無限キャンバスのどこからどこまでを使ってるか」を特定する！
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            notes.forEach(note => {
                const nWidth = note.width || 200; // デフォルト幅
                const nHeight = note.height || 100; // デフォルト高さ
                const nRight = note.x + nWidth;
                const nBottom = note.y + nHeight;
                
                if (note.x < minX) minX = note.x;
                if (note.y < minY) minY = note.y;
                if (nRight > maxX) maxX = nRight;
                if (nBottom > maxY) maxY = nBottom;
            });

            // ちょっと余白（パディング）を足してあげる（窮屈にならないように）
            const PADDING = 50;
            minX -= PADDING;
            minY -= PADDING;
            maxX += PADDING;
            maxY += PADDING;

            const totalWidth = maxX - minX;
            const totalHeight = maxY - minY;

            console.log(`全体サイズ計算完了: ${totalWidth} x ${totalHeight} (origin: ${minX}, ${minY})`);

            // 2. html2canvas で「影分身」を作って撮影！
            const canvas = await html2canvas(contentRef.current, {
                useCORS: true,
                scale: 2, // 高画質！
                
                // ▼▼▼ ここが魔術！キャプチャサイズを「全コンテンツ」に合わせる！ ▼▼▼
                width: totalWidth,
                height: totalHeight,
                windowWidth: totalWidth,
                windowHeight: totalHeight,
                x: 0, 
                y: 0,
                
                // ▼▼▼ 影分身（クローン）を整形する！ ▼▼▼
                onclone: (clonedDoc) => {
                    // クローンされたDOMの中のラッパー（#print-target）を取得
                    const clonedWrapper = clonedDoc.getElementById('print-target');
                    if (!clonedWrapper) return;
                    
                    // A. ラッパーの枠を、計算した「全体サイズ」まで無理やり広げる！
                    clonedWrapper.style.width = `${totalWidth}px`;
                    clonedWrapper.style.height = `${totalHeight}px`;
                    clonedWrapper.style.overflow = 'visible'; // はみ出し許可！
                    clonedWrapper.style.position = 'relative';

                    // B. 中身の「変形（ズーム・移動）」をリセットして、
                    //    全コンテンツが (0, 0) から始まるように位置を補正する！
                    //    （MainContentの中にある、transformがかかってるdivを探す）
                    const transformContainer = clonedWrapper.querySelector('div[style*="transform"]');
                    if (transformContainer instanceof HTMLElement) {
                        // 「今のズーム」を無視してスケール1倍！
                        // 「今の視点」を無視して、minX, minY 分だけズラして、左上の付箋を (0,0) に持ってくる！
                        transformContainer.style.transform = `translate(${-minX}px, ${-minY}px) scale(1)`;
                        transformContainer.style.transformOrigin = 'top left';
                    }
                }
            });

            // 3. あとは同じ！PDF生成
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            
            const orientation = imgWidth > imgHeight ? 'l' : 'p';
            // PDFのサイズ単位をピクセル(px)に合わせて画像サイズそのまま突っ込む！
            const pdf = new jsPDF(orientation, 'px', [imgWidth / 2, imgHeight / 2]); // scale2倍で作ったからサイズ調整
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
            pdf.save('hashiyamaboard.pdf');

        } catch (error) {
            console.error('PDF生成失敗:', error);
            alert('PDF保存に失敗した');
        } finally {
            document.body.style.cursor = originalCursor;
        }
    };

    // ▼▼▼ アルゴリズムの核心：イベントリスナー ▼▼▼
    useEffect(() => {
        if (!resizingSide) return; // ドラッグしてなきゃ何もしない

        const handleMouseMove = (e: MouseEvent) => {
            // requestAnimationFrame で描画負荷を軽減！（プロの技）
            requestAnimationFrame(() => {
                if (resizingSide === 'left') {
                    // 左: マウスのX座標 = 幅
                    const newWidth = Math.max(150, Math.min(e.clientX, 500));
                    setLeftWidth(newWidth);
                } else {
                    // 右: 画面幅 - マウスX座標 = 幅
                    const newWidth = Math.max(150, Math.min(document.body.clientWidth - e.clientX, 500));
                    setRightWidth(newWidth);
                }
            });
        };

        const handleMouseUp = () => {
            setResizingSide(null); // ドラッグ終了
            document.body.style.cursor = 'default';
            // iframeの操作ブロックを解除
            document.body.style.userSelect = 'auto'; 
        };

        // window全体で監視するから、マウスが外れても大丈夫！
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingSide]);

    const startResizing = (side: 'left' | 'right') => (e: React.MouseEvent) => {
        e.preventDefault(); // テキスト選択などを防止
        setResizingSide(side);
        document.body.style.cursor = 'col-resize';
        // ドラッグ中は文字選択などを禁止して、操作性を上げる
        document.body.style.userSelect = 'none';
    };

    // ▼▼▼ 2. 一括削除機能の実装 ▼▼▼
    const handleDeleteAll = async () => {
        // さすがに確認ダイアログは出そうぜ？w
        if (!window.confirm("【警告】\nボード上の全てのデータを削除します。\nこの操作は取り消せません。\n本当にやりますか？")) {
            return;
        }

        try {
            // "id" が "0" じゃないやつ（つまり全部）を削除！
            // (UUIDなら絶対に0にはならないからこれで全削除になる)
            const { error } = await supabase
                .from('notes')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); 

            if (error) throw error;

            // ローカルもクリア！
            setNotes([]);
            alert("全てを無に帰しました...( ˘ω˘)ｽﾔｧ");

        } catch (error) {
            console.error('全削除失敗:', error);
            alert('削除に失敗した');
        }
    };

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

    // 汎用アップデート関数 (ロックとかZ-Indexとか)
    const handleUpdateNote = async (id: string, updates: Partial<NoteData>) => {
        try {
            const { error } = await supabase.from('notes').update(updates).eq('id', id);
            if (error) throw error;
            // ローカルstateはRealtimeが更新してくれるから何もしない！
            // (即座に反映させたいなら setNotes で map してもいい)
        } catch (e) { console.error(e); }
    };

    // 複製機能
    const handleDuplicateNote = async (id: string) => {
        const original = notes.find(n => n.id === id);
        if (!original) return;
        
        // 元のノートをコピーして、少しズラして新規作成！
        // id と created_at はDBが自動生成or無視するので除外
        const { id: _id, ...rest } = original; 
        const newNote = {
            ...rest,
            x: original.x + 20, // ちょっとズラす
            y: original.y + 20,
            text: original.text + ' (コピー)', // わかりやすく
            is_locked: false, // コピー品はロック解除
        };

        try {
            const { error } = await supabase.from('notes').insert(newNote);
            if (error) throw error;
        } catch (e) { console.error(e); }
    };

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
            
            {/* .app-layout クラスを使う！（layout.css で Flexbox になってるはず！） */}
            <div className="app-layout">
                
                {/* ヘッダー */}
                <Header 
                    className="header-area" // layout.css を適用
                    data-no-pan="true" 
                    onPrint={handlePrint}
                    onDeleteAll={handleDeleteAll}
                />

                {/* メインエリア (Flexコンテナ) */}
                <div className="main-wrapper">
                    
                    {/* ▼▼▼ PanelGroup に w-full h-full をつける！これがミソ！ ▼▼▼ */}
                    <PanelGroup direction="horizontal" className="w-full h-full">
                        
                        {/* 1. 左サイドバー */}
                        <Panel 
                            defaultSize={20} 
                            minSize={3} 
                            maxSize={40} 
                            // ↓ ここにはCSSクラスをつけず、内側のdivにつける！
                        >
                            {/* ここに .left-sidebar-area をつける！ */}
                            <div className="left-sidebar-area h-full w-full">
                                <LeftSidebar 
                                    className="w-full h-full"
                                    onIconUpload={setUploadedIcon}
                                    onTogglePdfViewer={() => setShowPdfViewer(true)}
                                    dataNoPan={true}
                                />
                            </div>
                        </Panel>

                        {/* ハンドル */}
                        <ResizeHandle />

                        {/* 2. メインコンテンツ */}
                        <Panel minSize={30}>
                            {/* ここに .main-content-area をつける！ */}
                            <div 
                                ref={contentRef}
                                className="main-content-area w-full h-full relative overflow-hidden" 
                                id="print-target"
                            >
                                <MainContent
                                    notes={notes}
                                    onNotesChange={(id, x, y) => handleUpdateNote(id, { x, y })}
                                    onAddNote={handleAddNote}
                                    onEditNote={handleEditNote}
                                    onAddReply={handleAddReply}
                                    onDeleteNote={handleDelete}
                                    onDuplicateNote={handleDuplicateNote}
                                    onUpdateNote={handleUpdateNote}
                                    onToggleReadStatus={handleToggleReadStatus}
                                />
                            </div>
                        </Panel>

                        {/* ハンドル */}
                        <ResizeHandle />

                        {/* 3. 右サイドバー */}
                        <Panel 
                            defaultSize={20} 
                            minSize={3} 
                            maxSize={40} 
                        >
                            {/* ここに .right-sidebar-area をつける！ */}
                            <div className="right-sidebar-area h-full w-full">
                                <RightSidebar 
                                    className="w-full h-full"
                                    notes={notes}
                                    onAddReply={handleAddReply}
                                    onToggleReadStatus={handleToggleReadStatus}
                                />
                            </div>
                        </Panel>

                    </PanelGroup>
                </div>

                {/* PDFモーダル */}
                {showPdfViewer && (
                    <div className="modal-overlay" onClick={() => setShowPdfViewer(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <PDFViewer 
                                onAddPdfNote={(url, page) => { handleAddPdfNote(url, page); setShowPdfViewer(false); }}
                                onAddAllPages={(url, pages) => { handleAddAllPdfPages(url, pages); setShowPdfViewer(false); }}
                            />
                        </div>
                    </div>
                )}

            </div>
        </DndContext>
    );
}