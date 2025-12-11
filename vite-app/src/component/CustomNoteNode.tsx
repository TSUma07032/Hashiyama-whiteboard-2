import React, { memo, useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { type NodeProps, NodeResizeControl } from 'reactflow';
import { Document, Page, pdfjs } from 'react-pdf';
import type { ReplyData } from './index.d';
import LinkifyText from './Linkify';
import '../styles/Note.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const ResizeIcon = () => (
    <div style={{ width: '12px', height: '12px', background: '#ffffff', border: '2px solid #2563eb', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
);

const CustomNoteNode = ({ data, selected }: NodeProps) => {
    // --- State ---
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dummyRef = useRef<HTMLDivElement>(null); 
    const [localText, setLocalText] = useState(data.text);
    const [replyText, setReplyText] = useState('');
    const [showReplies, setShowReplies] = useState(false);
    const [minHeight, setMinHeight] = useState(60); 

    useEffect(() => { setLocalText(data.text); }, [data.text]);

    // 高さ自動計算
    useLayoutEffect(() => {
        if (data.type === 'pdf') return;
        const updateMinHeight = () => {
            if (dummyRef.current) {
                const contentHeight = dummyRef.current.offsetHeight + 40;
                setMinHeight(Math.max(60, contentHeight));
            }
        };
        updateMinHeight();
        const observer = new ResizeObserver(() => updateMinHeight());
        if (wrapperRef.current) observer.observe(wrapperRef.current);
        return () => observer.disconnect();
    }, [localText, data.type]);

    // ★★★ ダブルクリックハンドラは削除！ ★★★

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        if (localText !== data.text) data.onChangeText(localText);
    }, [localText, data]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            const len = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(len, len);
        }
    }, [isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalText(e.target.value);

    const handleAddReply = (e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        if (replyText.trim()) {
            data.onAddReply(replyText);
            setReplyText('');
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("消しちゃう？")) data.onDelete(data.id);
    };

    const handleCheck = (e: React.MouseEvent) => {
        e.stopPropagation();
        data.onToggleReadStatus();
    };

    const handleResizeEnd = useCallback((_event: any, params: any) => {
        const { width, height } = params;
        data.onUpdateNote(data.id, { width: Math.round(width), height: Math.round(height) });
    }, [data]);

    const bgColor = data.type === 'pdf' ? '#ffffff' : (data.color === 'r' ? '#ff9999' : '#99ccff');
    const borderStyle = selected ? '3px solid #2563eb' : '1px solid rgba(0,0,0,0.2)';
    const opacity = data.isRead ? 0.6 : 1;

    const controlStyle = { background: 'transparent', border: 'none', width: '20px', height: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' };

    return (
        <>
            <NodeResizeControl position="bottom-right" style={{ ...controlStyle, cursor: 'nwse-resize', right: -6, bottom: -6 }} onResizeEnd={handleResizeEnd} minWidth={150} minHeight={minHeight}><ResizeIcon /></NodeResizeControl>
            <NodeResizeControl position="bottom-left" style={{ ...controlStyle, cursor: 'nesw-resize', left: -6, bottom: -6 }} onResizeEnd={handleResizeEnd} minWidth={150} minHeight={minHeight}><ResizeIcon /></NodeResizeControl>

            <div 
                ref={wrapperRef}
                // onDoubleClick={handleDoubleClick} ◀◀◀ 削除！もうダブルクリックでは反応しない！
                className={`custom-note-wrapper ${isEditing ? 'nodrag cursor-text' : 'cursor-grab'}`}
                style={{ 
                    width: '100%', height: '100%', position: 'relative', overflow: 'visible',
                    opacity: opacity, filter: data.isRead ? 'grayscale(80%)' : 'none',
                    transition: 'opacity 0.3s, filter 0.3s'
                }}
            >
                {/* 影武者エリア */}
                {data.type !== 'pdf' && (
                    <div
                        ref={dummyRef}
                        className="note-text-display"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', visibility: 'hidden', pointerEvents: 'none', zIndex: -999, padding: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                    >
                        {localText || 'テキストを入力...'}
                    </div>
                )}

                {/* 装飾パーツ */}
                <button onClick={handleDelete} className="nodrag delete-btn" title="削除">×</button>
                <button onClick={handleCheck} className={`nodrag check-btn ${data.isRead ? 'checked' : 'unchecked'}`}>{data.isRead && '✓'}</button>
                {data.icon && <img src={data.icon} alt="icon" className="user-icon-float" />}

                {/* ▼▼▼ 下部エリア（返信＆編集ボタン） ▼▼▼ */}
                <div 
                    className="nodrag reply-container"
                    // style={{ ... }} ← CSS (Note.css) に任せるので削除、または微調整
                >
                    {/* ボタンを横並びにするコンテナ */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        
                        {/* 1. 返信トグルボタン */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowReplies(!showReplies); }}
                            style={{ 
                                backgroundColor: 'white', padding: '4px 10px', borderRadius: '16px', 
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)', border: '1px solid #ccc',
                                fontSize: '12px', color: '#333', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px',
                                cursor: 'pointer', whiteSpace: 'nowrap'
                            }}
                        >
                            💬 {data.replies?.length > 0 ? data.replies.length : '返信'}
                        </button>

                        {/* ▼▼▼ 2. 編集ボタン（新規追加！） ▼▼▼ */}
                        {!isEditing && data.type !== 'pdf' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true); // 編集モードON！
                                }}
                                style={{ 
                                    backgroundColor: 'white', padding: '4px 10px', borderRadius: '16px', 
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)', border: '1px solid #ccc',
                                    fontSize: '12px', color: '#333', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px',
                                    cursor: 'pointer', whiteSpace: 'nowrap'
                                }}
                            >
                                ✏️ 編集
                            </button>
                        )}
                    </div>

                    {/* 返信展開ボックス (位置はそのまま) */}
                    {showReplies && (
                        <div style={{ position: 'absolute', top: '36px', left: '50%', transform: 'translateX(-50%)', width: '240px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', border: '1px solid #ddd', padding: '10px', zIndex: 100 }}>
                            {data.replies?.length > 0 && <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '8px', textAlign: 'left' }}>{data.replies.map((reply: ReplyData) => <div key={reply.id} style={{ fontSize: '12px', borderBottom: '1px solid #eee', padding: '4px 0', color: '#333' }}>{reply.text}</div>)}</div>}
                            <div style={{ display: 'flex', gap: '4px' }}><input type="text" className="nodrag" style={{ flex: 1, fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', padding: '4px', outline: 'none' }} placeholder="返信..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddReply(e))} autoFocus /><button onClick={handleAddReply} style={{ fontSize: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>➤</button></div>
                        </div>
                    )}
                </div>

                {/* 内箱 */}
                <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '4px', backgroundColor: bgColor, border: borderStyle, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)', }}>
                    <div className="note-content">
                        {data.type === 'pdf' && data.file_url ? (
                            <div className="pdf-high-res-canvas"> 
                                <Document file={data.file_url} loading="..."><Page pageNumber={data.page_index || 1} width={parseInt(String(data.width || 200)) * 2} renderAnnotationLayer={false} renderTextLayer={false} /></Document>
                            </div>
                        ) : (
                            isEditing ? (
                                <textarea 
                                    ref={textareaRef} 
                                    className="nodrag note-textarea"
                                    value={localText} onChange={handleChange} onBlur={handleBlur}
                                />
                            ) : (
                                <div className="note-text-display">
                                    {/* 文言をシンプルに */}
                                    {localText ? <LinkifyText text={localText} /> : <span style={{color: 'rgba(0,0,0,0.4)', fontStyle: 'italic'}}>テキストを入力...</span>}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
export default memo(CustomNoteNode);