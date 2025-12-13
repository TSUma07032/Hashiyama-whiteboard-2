import React, { memo, useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { type NodeProps, NodeResizeControl } from 'reactflow';
import { Document, Page, pdfjs } from 'react-pdf';
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

    // ▼▼▼ 資料(PDF)かどうかチェック ▼▼▼
    const isPdf = data.type === 'pdf';

    return (
        <>
            {/* ▼▼▼ PDFじゃない時だけリサイズ可能にする！ ▼▼▼ */}
            {!isPdf && (
                <>
                    <NodeResizeControl position="bottom-right" style={{ ...controlStyle, cursor: 'nwse-resize', right: -6, bottom: -6 }} onResizeEnd={handleResizeEnd} minWidth={150} minHeight={minHeight}><ResizeIcon /></NodeResizeControl>
                    <NodeResizeControl position="bottom-left" style={{ ...controlStyle, cursor: 'nesw-resize', left: -6, bottom: -6 }} onResizeEnd={handleResizeEnd} minWidth={150} minHeight={minHeight}><ResizeIcon /></NodeResizeControl>
                </>
            )}

            <div 
                ref={wrapperRef}
                className={`custom-note-wrapper ${isEditing ? 'nodrag cursor-text' : 'cursor-grab'}`}
                style={{ 
                    width: '100%', height: '100%', position: 'relative', overflow: 'visible',
                    opacity: opacity, filter: data.isRead ? 'grayscale(80%)' : 'none',
                    transition: 'opacity 0.3s, filter 0.3s'
                }}
            >
                {/* 影武者エリア */}
                {!isPdf && (
                    <div
                        ref={dummyRef}
                        className="note-text-display"
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 'auto', visibility: 'hidden', pointerEvents: 'none', zIndex: -999, padding: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                    >
                        {localText || 'テキストを入力...'}
                    </div>
                )}

                {/* 装飾パーツ */}
                {/* ▼▼▼ バツボタン(delete-btn)を削除！ ▼▼▼ */}
                {/* <button onClick={handleDelete} className="nodrag delete-btn" title="削除">×</button> */}
                
                {/* チェックボックスは残す？一旦残す！ */}
                <button onClick={handleCheck} className={`nodrag check-btn ${data.isRead ? 'checked' : 'unchecked'}`}>{data.isRead && '✓'}</button>
                {data.icon && <img src={data.icon} alt="icon" className="user-icon-float" />}

                {/* 下部エリア（編集ボタンなど） */}
                {/* PDFじゃなければ編集ボタンを表示（PDFは元々出ない設計だったはず） */}
                {!isPdf && (
                    <div className="nodrag reply-container">
                        <div style={{ display: 'flex', gap: '8px' }}>
                             {/* 編集ボタン */}
                            {!isEditing && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsEditing(true);
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
                    </div>
                )}

                {/* 内箱 */}
                <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '4px', backgroundColor: bgColor, border: borderStyle, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)', }}>
                    <div className="note-content">
                        {isPdf && data.file_url ? (
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