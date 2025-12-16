// src/component/Layout.tsx
import { useState, useRef, useCallback } from 'react';
import { Panel, PanelGroup } from 'react-resizable-panels';
import { DndContext, type DragEndEvent, type DragStartEvent, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';

// Components
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MainContent from './MainContent';
import PDFViewer from './PDFViewer';
import '@/styles/layout.css';

// Hooks & Utils
import { useNotes } from '../hooks/useNotes';
import { useAgenda } from '../hooks/useAgenda';
import { supabase } from '../utils/supabase';
import { downloadBoardAsPdf } from '../utils/pdfGenerator';
import { 
    PDF_NOTE_WIDTH, PDF_NOTE_HEIGHT, PDF_GAP_X, PDF_FILE_MARGIN 
} from '../constants';

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
    const mainContentRef = useRef<HTMLElement>(null); 
    const [uploadedIcon, setUploadedIcon] = useState<string | null>(null);
    const [scale, _setScale] = useState<number>(1);
    const [showPdfViewer, setShowPdfViewer] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const viewpointRef = useRef({ x: 0, y: 0 });
    const dragStartCursorRef = useRef({ x: 0, y: 0 });
    const [jumpTargetId, setJumpTargetId] = useState<string | null>(null); // ジャンプ用

    // PDF印刷
    const handlePrint = useCallback(() => {
        downloadBoardAsPdf(contentRef.current, notes);
    }, [notes]);

    // PDFノート追加 (Logic separation candidate, but kept simple here)
    const getBottomY = () => {
        if (notes.length === 0) return 150;
        return Math.max(...notes.map(n => n.y + (n.height || 450)));
    };
    const handleAddPdfNote = async (url: string, pageIndex: number) => {
        const startY = getBottomY() + 100;
        await supabase.from('notes').insert({
            text: '', x: 50, y: startY, width: 600, height: 850,
            color: 'white', type: 'pdf', file_url: url, page_index: pageIndex,
            replies: [], isRead: false
        });
    };
    const handleAddAllPdfPages = async (url: string, totalPages: number) => {
        const startY = getBottomY() + PDF_FILE_MARGIN;
        const inserts = [];
        for (let i = 0; i < totalPages; i++) {
            const col = i % 10;
            const row = Math.floor(i / 10);
            inserts.push({
                text: '', 
                x: 50 + col * (PDF_NOTE_WIDTH + PDF_GAP_X),
                y: startY + row * (PDF_NOTE_HEIGHT * 2),
                width: PDF_NOTE_WIDTH, height: PDF_NOTE_HEIGHT,
                color: 'white', type: 'pdf', file_url: url, page_index: i + 1,
                replies: [], is_locked: true, isRead: false
            });
        }
        await supabase.from('notes').insert(inserts);
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
                const dropX = dragStartCursorRef.current.x + delta.x - rect.left;
                const dropY = dragStartCursorRef.current.y + delta.y - rect.top;
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

    return (
        <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart} sensors={sensors}>
            <div className="app-layout">
                <Header 
                    className="header-area" data-no-pan="true"
                    onPrint={handlePrint} onDeleteAll={deleteAllNotes} endTimeStr={timerEndAt}
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