// src/component/Layout.tsx
import { useState, useRef } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';
import { DndContext} from '@dnd-kit/core';

// Components
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MainContent, {type MainContentHandle } from './MainContent';
import PDFViewer from './PDFViewer';
import '@/styles/layout.css';
import { useExportBoard } from '@/hooks/useExportBoard';
import { useBoardDnD } from '@/hooks/useBoardDnD';
import { usePdfManager } from '@/hooks/usePdfManager';

// Hooks & Utils
import { useNotes } from '../hooks/useNotes';
import { useAgenda } from '../hooks/useAgenda';
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
    const { notes, addNote, updateNote, deleteNote, addReply, deleteAllNotes, updateReply, duplicateNote } = useNotes();
    const { 
        agendaList, currentAgenda, timeLeft, timerEndAt, timerOwnerId,
        isPresenting, toggleTimer, nextAgenda, prevAgenda 
    } = useAgenda();

    //const mainContentRef = useRef<HTMLElement>(null); 
    const [uploadedIcon, setUploadedIcon] = useState<string | null>(null);
    const [scale, _setScale] = useState<number>(1);
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const [jumpTargetId, setJumpTargetId] = useState<string | null>(null); // ジャンプ用
    const contentRef = useRef<HTMLDivElement>(null);
    const { exportToPdf } = useExportBoard({ contentRef, notes });


    // Refを作成
    const mainContentRef = useRef<MainContentHandle>(null);

    const { sensors, handleDragStart, handleDragEnd } = useBoardDnD({
        notes,
        addNote,
        updateNote,
        mainContentRef,
        scale,
        uploadedIcon,
        currentAgenda
    });

    const { handleAddPdfNote, handleAddAllPdfPages } = usePdfManager({ notes });

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
                    onPrint={exportToPdf} onDeleteAll={deleteAll} endTimeStr={timerEndAt}
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
                                    onDuplicateNote={duplicateNote}
                                    onUpdateNote={updateNote}
                                    onToggleReadStatus={(id) => {
                                        const n = notes.find(n => n.id === id);
                                        if (n) updateNote(id, { isRead: !n.isRead });
                                    }}
                                    jumpTargetId={jumpTargetId}
                                    onJumpComplete={() => setJumpTargetId(null)}
                                    agendaList={agendaList}
                                    onUpdateReply={(noteId, replyId, text) => updateReply(noteId, replyId, text)}
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