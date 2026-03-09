// vite-app/src/components/CustomNoteNode.tsx
import React, { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type NodeProps, NodeResizeControl, useUpdateNodeInternals } from 'reactflow';
import { Document, Page, pdfjs } from 'react-pdf';
import TextareaAutosize from 'react-textarea-autosize'; // ✨ NEW: 自動リサイズライブラリ
import LinkifyText from './Linkify';
import '../styles/Note.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// ✨ NEW: UIの状態を排他制御するためのUnion型
type ActiveAction = 'none' | 'editing_note' | 'adding_reply' | 'selecting_agenda';

const CustomNoteNode = ({ id, data, selected }: NodeProps) => {
    // ✨ NEW: React Flowにノードのサイズ変更を通知するフック
    const updateNodeInternals = useUpdateNodeInternals();

    // --- State ---
    const [activeAction, setActiveAction] = useState<ActiveAction>('none');
    const [localText, setLocalText] = useState(data.text);
    
    // アコーディオンの開閉は独立状態として維持
    const [isRepliesOpen, setIsRepliesOpen] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [editReplyText, setEditReplyText] = useState("");

    // --- Refs ---
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Effects ---
    // 親のテキストが変更された場合、編集中でなければ反映
    useEffect(() => { 
        if (activeAction !== 'editing_note') {
            setLocalText(data.text);
        }
    }, [data.text, activeAction]);

    // ✨ 選択解除時のクリーンアップ（すべてのメニューを閉じ、編集を保存）
    useEffect(() => {
        if (!selected) {
            if (activeAction === 'editing_note') {
                finishEditing();
            }
            setActiveAction('none');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected]);

    // 返信入力モードになったら自動フォーカス
    useEffect(() => {
        if (activeAction === 'adding_reply' && inputRef.current) {
            inputRef.current.focus();
        }
    }, [activeAction]);

    // --- Handlers ---
    // ✨ 編集完了処理（見た目の更新はライブラリに任せ、ここではデータ保存のみ行う）
    const finishEditing = useCallback(() => {
        if (activeAction !== 'editing_note') return;
        
        if (localText !== data.text && data.onChangeText) {
            data.onChangeText(localText);
        }

        // 保存時に一度だけ、最終的な高さを親（DBなど）に伝える
        if (wrapperRef.current && data.onUpdateNote) {
            data.onUpdateNote(id, { height: wrapperRef.current.offsetHeight });
        }
        
        setActiveAction('none');
    }, [activeAction, localText, data, id]);

    // React Flowの手動リサイズイベント
    const handleResizeEnd = useCallback((_event: any, params: any) => {
        const { width, height } = params;
        if (data.onUpdateNote) {
            data.onUpdateNote(id, { width: Math.round(width), height: Math.round(height) });
        }
    }, [data, id]);

    // ✨ テキスト入力のたびにReact Flowに「サイズが変わったかも！」と通知
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalText(e.target.value);
        updateNodeInternals(id); // これがエッジ（線）のズレを防ぐ魔法のフックです
    };
    
    // Enterキーの挙動（UX維持のため既存の仕様を踏襲）
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finishEditing();
            (document.activeElement as HTMLElement)?.blur();
        }
    };

    // --- アクションのトグル制御（排他制御により超絶シンプル化） ---
    const toggleAction = (action: ActiveAction, e?: React.MouseEvent) => {
        e?.stopPropagation();
        e?.preventDefault();
        setActiveAction(prev => prev === action ? 'none' : action);
    };

    const handleToggleReplyInput = (e: React.MouseEvent) => {
        toggleAction('adding_reply', e);
        setIsRepliesOpen(true); // 返信入力時はアコーディオンを開く
    };

    const selectAgenda = (agendaId: string) => {
        if (data.onUpdateAgendaId) data.onUpdateAgendaId(agendaId);
        setActiveAction('none');
    };

    // --- 返信関連のハンドラー ---
    const sendReply = () => {
        if (replyText.trim()) {
            data.onAddReply?.(replyText);
            setReplyText("");
            setActiveAction('none');
            setIsRepliesOpen(true);
        }
    };

    const handleReplyKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditingReplyId(null);
            setEditReplyText("");
        }
    };

    const handleStartEditReply = (e: React.MouseEvent, reply: any) => {
        e.stopPropagation();
        setEditingReplyId(reply.id);
        setEditReplyText(reply.text);
    };

    const handleReplyBlur = () => {
        if (editingReplyId && editReplyText.trim()) {
            const originalReply = data.replies?.find((r: any) => r.id === editingReplyId);
            if (originalReply && originalReply.text !== editReplyText) {
                data.onUpdateReply?.(editingReplyId, editReplyText);
            }
        }
        setEditingReplyId(null);
        setEditReplyText("");
    };

    // --- Rendering Helpers ---
    const isPdf = data.type === 'pdf';
    let noteClass = 'note';
    if (!isPdf) {
        if (data.color === 'r') noteClass += ' note-red';
        else if (data.color === 'b') noteClass += ' note-blue';
        else noteClass += ' note-white';
    }
    if (data.isRead) noteClass += ' note-read';

    const pdfOptions = useMemo(() => ({
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
    }), []); 

    return (
        <div className={`note-container ${selected ? 'selected' : ''}`} ref={wrapperRef}>
            
            {/* --- リサイズハンドル --- */}
            {!isPdf && (
                <>
                    <NodeResizeControl position="bottom-right" className="resize-handle br" onResizeEnd={handleResizeEnd} minWidth={150} minHeight={60} />
                    <NodeResizeControl position="bottom-left" className="resize-handle bl" onResizeEnd={handleResizeEnd} minWidth={150} minHeight={60} />
                </>
            )}

            {/* --- メインコンテンツ --- */}
            <div 
                className={noteClass}
                style={{
                    height: activeAction === 'editing_note' ? 'auto' : '100%',
                    minHeight: '100%',
                    zIndex: activeAction === 'editing_note' ? 10 : 1
                }}
            >
                {data.icon && (
                    <div className="icon-container">
                        <img src={data.icon} alt="icon" className="user-icon" />
                    </div>
                )}

                {isPdf && data.file_url ? (
                    <div className="pdf-high-res-canvas"> 
                        <Document 
                            file={data.file_url} 
                            loading="Loading..."
                            options={pdfOptions}
                        >
                            <Page 
                                pageNumber={data.page_index || 1} 
                                width={parseInt(String(data.width || 200)) * 2} 
                                renderAnnotationLayer={false} 
                                renderTextLayer={false} 
                            />
                        </Document>
                    </div>
                ) : (
                    <>
                        {/* ✨ NEW: dummyRefとResizeObserverを完全に削除し、TextareaAutosizeを採用 */}
                        {activeAction === 'editing_note' ? (
                            <TextareaAutosize 
                                className="note-textarea nodrag"
                                value={localText}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                onMouseDown={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        ) : (
                            <div 
                                className="note-textarea note-text-display"
                                onDoubleClick={(e) => toggleAction('editing_note', e)} // ダブルクリック編集を復活！
                            >
                                {localText ? <LinkifyText text={localText} /> : <span style={{ opacity: 0.5 }}>（テキストなし）</span>}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* --- 返信エリア --- */}
            {!isPdf && (
                <div className="replies-wrapper">
                    {data.replies?.length > 0 && (
                        <button 
                            className="reply-toggle-btn nodrag" 
                            onClick={(e) => { e.stopPropagation(); setIsRepliesOpen(!isRepliesOpen); }}
                        >
                            <span>{isRepliesOpen ? '▼' : '▶'}</span>
                            <span>返信 {data.replies.length}件</span>
                        </button>
                    )}

                    {isRepliesOpen && data.replies?.length > 0 && (
                        <div className="replies-list-body nodrag">
                            {data.replies.map((reply: any) => (
                                <div key={reply.id} className="reply-item-modern">
                                    {editingReplyId === reply.id ? (
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input
                                                type="text"
                                                className="reply-input-box-seamless"
                                                value={editReplyText}
                                                onChange={(e) => setEditReplyText(e.target.value)}
                                                onBlur={handleReplyBlur}
                                                onKeyDown={handleReplyKeyDown}
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        <div className="reply-content-wrapper">
                                            <span className="reply-text-display">{reply.text}</span>
                                            <button 
                                                className="floating-edit-btn"
                                                onClick={(e) => handleStartEditReply(e, reply)}
                                                title="編集する"
                                            >
                                                ✏️
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeAction === 'adding_reply' && (
                        <div className="reply-input-container nodrag">
                            <input
                                ref={inputRef}
                                type="text"
                                className="reply-input-box"
                                placeholder="返信を入力..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') sendReply(); }}
                            />
                            <button className="reply-send-btn-small" onClick={sendReply}>➤</button>
                        </div>
                    )}
                </div>
            )}

            {/* --- 操作ボタン (ホバーで出現) --- */}
            {!isPdf && activeAction !== 'editing_note' && (
                <div className="action-buttons nodrag" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button className="mini-btn" onClick={(e) => toggleAction('editing_note', e)}>
                        ✏️ 編集
                    </button>
                    <button className="mini-btn" onClick={handleToggleReplyInput}>
                        💬 返信
                    </button>

                    <div style={{ position: 'relative' }}>
                        <button className="mini-btn" onClick={(e) => toggleAction('selecting_agenda', e)}>
                            🔀 宛先
                        </button>

                        {activeAction === 'selecting_agenda' && data.agendaList && (
                            <div className="agenda-popover">
                                <div className="agenda-menu-header">宛先を選択</div>
                                <div style={{maxHeight: '150px', overflowY: 'auto'}}>
                                    {data.agendaList.map((agenda: any) => (
                                        <div 
                                            key={agenda.id}
                                            className="agenda-menu-item"
                                            onClick={(e) => { e.stopPropagation(); selectAgenda(agenda.id); }}
                                        >
                                            <div className="agenda-avatar">👤</div>
                                            <div style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                {agenda.presenter}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(CustomNoteNode);