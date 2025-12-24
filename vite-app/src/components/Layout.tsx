// src/component/Layout.tsx
import { useState, useRef } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';
import { DndContext, type DragEndEvent, type DragStartEvent, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';

// Components
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MainContent, {type MainContentHandle } from './MainContent';
import PDFViewer from './PDFViewer';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';    
import '@/styles/layout.css';

// Hooks & Utils
import { useNotes } from '../hooks/useNotes';
import { useAgenda } from '../hooks/useAgenda';
import { supabase } from '../utils/supabase';
//import { downloadBoardAsPdf } from '../utils/pdfGenerator'; ←没
//import { downloadBoardAsImage } from '@/utils/imageGenerator';
import { 
    DEFAULT_NOTE_SIZE, 
    DEFAULT_NOTE_POSITION, 
    PDF_NOTE_WIDTH, 
    PDF_NOTE_HEIGHT, 
    PDF_GAP_X, 
    PDF_FILE_MARGIN,
    NOTE_COLOR_WHITE,
    PDF_GRID_COLS,
    PDF_GAP_Y
} from '@/constants'; // 定数のパスに合わせてね！
import { useStorage } from '@/hooks/useStorage';

// ハンドル用のコンポーネント (前回ResizeControl.tsx作ってなかったらここに書いてOK)
import { PanelResizeHandle } from 'react-resizable-panels';
const ResizeHandle = ({ className = "" }: { className?: string }) => (
    <PanelResizeHandle className={`w-4 bg-transparent hover:bg-blue-100 transition-colors flex items-center justify-center outline-none cursor-col-resize z-50 ${className}`}>
        <div className="w-0.5 h-full bg-gray-300 hover:bg-blue-400 transition-colors" />
    </PanelResizeHandle>
);

export default function Layout() {
    // フック x 2
    const { notes, addNote, updateNote, deleteNote, addReply, deleteAllNotes,  } = useNotes();
    const { 
        agendaList, currentAgenda, timeLeft, timerEndAt, timerOwnerId,
        isPresenting, toggleTimer, nextAgenda, prevAgenda 
    } = useAgenda();

    // UI State
    const [_activeId, setActiveId] = useState<string | null>(null);
    //const mainContentRef = useRef<HTMLElement>(null); 
    const [uploadedIcon, setUploadedIcon] = useState<string | null>(null);
    const [scale, _setScale] = useState<number>(1);
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const viewpointRef = useRef({ x: 0, y: 0 });
    const dragStartCursorRef = useRef({ x: 0, y: 0 });
    const [jumpTargetId, setJumpTargetId] = useState<string | null>(null); // ジャンプ用

    // PDF印刷
    /*
    const handlePrint = useCallback(() => {
        // 1. データ変換！ NoteData[] を React Flow の Node[] に変身させるメイクアップ💄
        const nodesForPdf = notes.map((note) => ({
            id: note.id,
            position: { x: note.x, y: note.y }, // DBの x,y を position に！
            width: note.width,
            height: note.height,
            // type: 'note', // 必要なら足して
            data: { ...note }, // 中身はそのままドン！
        }));

        console.log('PDF化するノードたち:', nodesForPdf);

        // 2. 最強関数を呼び出す！引数はノードリストだけでOK！
        downloadBoardAsPdf(nodesForPdf);
        
    }, [notes]); // notesが変わったら関数も作り直す
    */

    // Refを作成
    const mainContentRef = useRef<MainContentHandle>(null);

    // ▼▼▼ 最強の印刷ロジック (The Final Version) ▼▼▼
    const handlePrint = async () => {
        // ノードが1個もないときは何もしない
        if (!contentRef.current || notes.length === 0) {
            alert("付箋がひとつもないぞ、ざぁこ♡"); // ←かわいいw
            return;
        }

        const originalCursor = document.body.style.cursor;
        document.body.style.cursor = 'wait'; // 処理中カーソル

        try {
            console.log("📸 全体保存プロセス開始！");

            // 1. 全ノートの座標から、全体の「バウンディングボックス」を計算
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            notes.forEach(note => {
                const nWidth = note.width || 200;
                const nHeight = note.height || 100;
                const nRight = note.x + nWidth;
                const nBottom = note.y + nHeight;
                
                if (note.x < minX) minX = note.x;
                if (note.y < minY) minY = note.y;
                if (nRight > maxX) maxX = nRight;
                if (nBottom > maxY) maxY = nBottom;
            });

            // 余白（パディング）
            const PADDING = 50;
            minX -= PADDING;
            minY -= PADDING;
            maxX += PADDING;
            maxY += PADDING;

            const totalWidth = maxX - minX;
            const totalHeight = maxY - minY;

            console.log(`全体サイズ: ${totalWidth} x ${totalHeight} (origin: ${minX}, ${minY})`);

            // 2. html2canvas で「影分身」を作って撮影！
            const canvas = await html2canvas(contentRef.current, {
                useCORS: true,
                scale: 2, // 高画質
                
                // キャプチャサイズを全コンテンツに合わせる
                width: totalWidth,
                height: totalHeight,
                windowWidth: totalWidth,
                windowHeight: totalHeight,
                x: 0, 
                y: 0, // ここは0でOK（oncloneでずらすから）
                
                // ▼ 影分身（クローン）を整形する魔術 ▼
                onclone: (clonedDoc) => {
                    const clonedWrapper = clonedDoc.getElementById('print-target');
                    if (!clonedWrapper) return;
                    
                    // A. ラッパーの枠を広げる
                    clonedWrapper.style.width = `${totalWidth}px`;
                    clonedWrapper.style.height = `${totalHeight}px`;
                    clonedWrapper.style.overflow = 'visible';
                    clonedWrapper.style.position = 'relative';

                    // B. 中身の位置を補正して (0,0) に持ってくる！
                    // ReactFlowの viewport (transformがかかってるdiv) を探す
                    // クラス名 '.react-flow__viewport' が確実かも！
                    const transformContainer = clonedWrapper.querySelector('.react-flow__viewport') as HTMLElement;
                    
                    if (transformContainer) {
                        // 今のズームを無視(scale1)して、位置だけズラす！
                        transformContainer.style.transform = `translate(${-minX}px, ${-minY}px) scale(1)`;
                        transformContainer.style.transformOrigin = 'top left';
                        
                        console.log("✅ クローンの位置補正完了！");
                    } else {
                        console.warn("⚠️ viewportが見つからなかったかも？");
                    }
                }
            });

            // 3. PDF生成
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            
            // 縦長か横長か判定
            const orientation = imgWidth > imgHeight ? 'l' : 'p';
            
            // 画像サイズそのままのPDFを作成（単位: px）
            // scale:2 で撮ってるから、PDFサイズは /2 して実寸に戻すのがセオリー
            const pdf = new jsPDF(orientation, 'px', [imgWidth / 2, imgHeight / 2]);
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
            pdf.save(`whiteboard-review-${new Date().toISOString().slice(0,10)}.pdf`);
            
            console.log("🎉 PDF保存成功！");

        } catch (error) {
            console.error('PDF生成失敗:', error);
            alert('PDF保存に失敗しちゃった...😭');
        } finally {
            document.body.style.cursor = originalCursor;
        }
    };
    

    // PDFノート追加 (Logic separation candidate, but kept simple here)
    /**
     * 画面の一番下のY座標を取得する（次のコンテンツの開始位置用）
     */
    const getBottomY = () => {
        // ノートが一つもないなら、デフォルトのY位置を返す
        if (notes.length === 0) return DEFAULT_NOTE_POSITION.y;

        // 全ノートの中で「一番下のライン」を探す
        // n.height がない場合の保険として DEFAULT_NOTE_SIZE.height を使う
        return Math.max(...notes.map(n => n.y + (n.height || DEFAULT_NOTE_SIZE.height)));
    };

    /**
     * PDFの1ページだけをポチッと貼る関数
     */
    const handleAddPdfNote = async (url: string, pageIndex: number) => {
        // 一番下 + ファイル間マージン を開始位置にする
        const startY = getBottomY() + PDF_FILE_MARGIN;

        await supabase.from('notes').insert({
            text: '', 
            x: DEFAULT_NOTE_POSITION.x, // 定数を使う (50)
            y: startY, 
            width: PDF_NOTE_WIDTH,      // 定数を使う (800)
            height: PDF_NOTE_HEIGHT,    // 定数を使う (1131)
            color: NOTE_COLOR_WHITE,    // 定数を使う
            type: 'pdf', 
            file_url: url, 
            page_index: pageIndex,
            replies: [], 
            isRead: false
        });
    };

    /**
     * PDFの全ページをズラ〜ッと並べる関数
     */
    const handleAddAllPdfPages = async (url: string, totalPages: number) => {
        // 開始位置計算
        const startY = getBottomY() + PDF_FILE_MARGIN;
        const inserts = [];

        for (let i = 0; i < totalPages; i++) {
            // グリッド計算（横に PDF_GRID_COLS 枚並べたら改行）
            const col = i % PDF_GRID_COLS;
            const row = Math.floor(i / PDF_GRID_COLS);

            // X座標: 初期位置 + (列番号 * (幅 + 隙間))
            const posX = DEFAULT_NOTE_POSITION.x + col * (PDF_NOTE_WIDTH + PDF_GAP_X);

            // Y座標: 開始位置 + (行番号 * (高さ + 隙間))
            // ※元のコードの (PDF_NOTE_HEIGHT * 2) だと隙間がデカすぎたので、GAP足し算に変更！
            const posY = startY + row * (PDF_NOTE_HEIGHT + PDF_GAP_Y);

            inserts.push({
                text: '', 
                x: posX,
                y: posY,
                width: PDF_NOTE_WIDTH, 
                height: PDF_NOTE_HEIGHT,
                color: NOTE_COLOR_WHITE, 
                type: 'pdf', 
                file_url: url, 
                page_index: i + 1,
                replies: [], 
                is_locked: true, // 背景として貼るならロック推奨
                isRead: false
            });
        }

        // まとめてドーン！
        if (inserts.length > 0) {
            await supabase.from('notes').insert(inserts);
        }
    };

    // 複製
    const handleDuplicateNote = async (id: string) => {
        const original = notes.find(n => n.id === id);
        if (!original) return;
        const { id: _id, created_at: _c, ...rest } = original; 
        await supabase.from('notes').insert({
            ...rest, x: original.x + 20, y: original.y + 20,
            text: (original.text || '') + ' (コピー)', is_locked: false,
        });
    };

    // DnD Logic
    const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } });
    const sensors = useSensors(mouseSensor);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        if ('clientX' in event.activatorEvent && 'clientY' in event.activatorEvent) {
            const e = event.activatorEvent as MouseEvent;
            dragStartCursorRef.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, delta } = event;
        const activeId = active.id as string;
        if (!activeId) { setActiveId(null); return; }

        const activeData = active.data.current as any;
        if (activeData?.type === 'note-template') {
            if (mainContentRef.current && event.active.rect.current.translated) {
                const rect = mainContentRef.current.getBoundingClientRect();
                const dropX = dragStartCursorRef.current.x + delta.x - rect!.left;
                const dropY = dragStartCursorRef.current.y + delta.y - rect!.top;
                const worldX = (dropX - viewpointRef.current.x) / scale;
                const worldY = (dropY - viewpointRef.current.y) / scale;
                addNote(
                    activeData.text || '', 
                    activeData.color || 'r', 
                    worldX, 
                    worldY, 
                    uploadedIcon, 
                    currentAgenda?.id 
                );
            }
        } else {
            const currentNote = notes.find(n => n.id === activeId);
            if (currentNote) {
                const newX = currentNote.x + delta.x / scale;
                const newY = currentNote.y + delta.y / scale;
                updateNote(activeId, { x: newX, y: newY });
            }
        }
        setActiveId(null);
    };

    // 完全初期化処理
    const { deleteAllStorageFiles } = useStorage(); // 削除関数をゲット

    const handleClearAll = async () => {
        if (!window.confirm('マジで全部消していい？復元できないよ？🥺')) return;

        // 1. 今までのDB削除処理 (deleteAllNotes的なやつ)
        // await deleteAllNotes(); 

        // 2. ▼▼▼ ここに追加！ストレージも削除！ ▼▼▼
        await deleteAllStorageFiles();
        
        console.log('完全初期化完了！✨');
    };

    const deleteAll = async () => {
        await deleteAllNotes();
        handleClearAll();
    }

    return (
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors}>
            <div className="app-layout">
                <Header 
                    className="header-area" data-no-pan="true"
                    onPrint={handlePrint} onDeleteAll={deleteAll} endTimeStr={timerEndAt}
                    currentAgenda={currentAgenda} timer={timeLeft} timerOwnerId={timerOwnerId}
                    onToggleTimer={toggleTimer} onNext={nextAgenda} onPrev={prevAgenda} isPresenting={isPresenting}
                    icon={uploadedIcon}
                />

                <div className="main-wrapper">
                    <PanelGroup direction="horizontal" className="w-full h-full">
                        <Panel defaultSize={20} minSize={3} maxSize={40}>
                            <div className="left-sidebar-area h-full w-full">
                                <LeftSidebar 
                                    className="w-full h-full" onIconUpload={setUploadedIcon}
                                    onTogglePdfViewer={() => setShowPdfViewer(true)} dataNoPan={true}
                                />
                            </div>
                        </Panel>

                        <ResizeHandle />

                        <Panel minSize={30}>
                            <div ref={contentRef} className="main-content-area w-full h-full relative overflow-hidden" id="print-target">
                                <MainContent
                                    ref={mainContentRef}
                                    notes={notes}
                                    onNotesChange={(id, x, y) => updateNote(id, { x, y })}
                                    onAddNote={(text, color, x, y) => addNote(text, color, x, y, uploadedIcon, currentAgenda?.id)}
                                    onEditNote={(id, text) => updateNote(id, { text })}
                                    onAddReply={(id, text) => addReply(id, text, uploadedIcon)}
                                    onDeleteNote={deleteNote}
                                    onDuplicateNote={handleDuplicateNote}
                                    onUpdateNote={updateNote}
                                    onToggleReadStatus={(id) => {
                                        const n = notes.find(n => n.id === id);
                                        if (n) updateNote(id, { isRead: !n.isRead });
                                    }}
                                    jumpTargetId={jumpTargetId}
                                    onJumpComplete={() => setJumpTargetId(null)}
                                    agendaList={agendaList}
                                    
                                />
                            </div>
                        </Panel>

                        <ResizeHandle />

                        <Panel defaultSize={20} minSize={3} maxSize={40}>
                            <div className="right-sidebar-area h-full w-full">
                                <RightSidebar 
                                    className="w-full h-full" notes={notes}
                                    onAddReply={(id, text) => addReply(id, text, uploadedIcon)}
                                    onToggleReadStatus={(id) => {
                                        const n = notes.find(n => n.id === id);
                                        if (n) updateNote(id, { isRead: !n.isRead });
                                    }}
                                    onJump={(id) => setJumpTargetId(id)}
                                    agendaList={agendaList}
                                    currentAgendaId={currentAgenda?.id}
                                />
                            </div>
                        </Panel>
                    </PanelGroup>
                </div>

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