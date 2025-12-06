import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { type NodeProps, NodeResizeControl } from 'reactflow';
import { Document, Page, pdfjs } from 'react-pdf';
import type { ReplyData } from './index.d';
import LinkifyText from './Linkify';
import '../styles/Note.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// リサイズハンドル (見た目)
const ResizeIcon = () => (
    <div style={{
        width: '12px', 
        height: '12px',
        background: '#ffffff',
        border: '2px solid #2563eb', 
        borderRadius: '50%',
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    }} />
);

const CustomNoteNode = ({ data, selected }: NodeProps) => {
    // --- 状態管理 ---
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [localText, setLocalText] = useState(data.text);
    const [replyText, setReplyText] = useState('');
    const [showReplies, setShowReplies] = useState(false);

    useEffect(() => { setLocalText(data.text); }, [data.text]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.type !== 'pdf') setIsEditing(true);
    }, [data.type]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        if (localText !== data.text) data.onChangeText(localText);
    }, [localText, data]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            setTimeout(() => {
                textareaRef.current?.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
            }, 0);
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

    const onResizeEnd = useCallback((_event: any, params: any) => {
        const { width, height } = params;
        data.onUpdateNote(data.id, { 
            width: Math.round(width),   // 小数点が出ることあるから丸める！
            height: Math.round(height) 
        });
    }, [data]);

    const bgColor = data.type === 'pdf' ? '#ffffff' : (data.color === 'r' ? '#ff9999' : '#99ccff');
    const borderStyle = selected ? '3px solid #2563eb' : '1px solid rgba(0,0,0,0.2)';

    // リサイズハンドルの共通スタイル
    const controlStyle = {
        background: 'transparent',
        border: 'none',
        width: '20px', height: '20px',
        display: 'flex', justifyContent: 'center', alignItems: 'center'
    };
    
    const handleCheck = (e: React.MouseEvent) => {
        e.stopPropagation();
        data.onToggleReadStatus(); // MainContentから受け取った関数を実行！
    };


    return (
        <>
            {/* ▼▼▼ 本体を先に書く！ ▼▼▼ */}
            <div 
                onDoubleClick={handleDoubleClick}
                className={`custom-note-wrapper ${isEditing ? 'nodrag cursor-text' : 'cursor-grab'}`}
                style={{ 
                    backgroundColor: bgColor, width: '100%', height: '100%',
                    border: borderStyle, borderRadius: '4px',
                    position: 'relative', overflow: 'visible',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                    display: 'flex', flexDirection: 'column',
                }}
            >

                <button 
                    onClick={handleCheck}
                    className="nodrag"
                    style={{
                        position: 'absolute', top: '-10px', left: '-10px',
                        width: '24px', height: '24px', borderRadius: '50%',
                        backgroundColor: data.isRead ? '#10b981' : 'white', // チェックなら緑！
                        border: data.isRead ? '2px solid #10b981' : '2px solid #ccc',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 50, fontSize: '14px', fontWeight: 'bold', padding: 0,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    title={data.isRead ? "未完了に戻す" : "完了にする"}
                >
                    {data.isRead && '✓'}
                </button>

                {/* アイコン */}
                {data.icon && <img src={data.icon} alt="icon" className="user-icon-float" />}

                {/* コンテンツエリア */}
                <div style={{ flex: 1, width: '100%', overflow: 'hidden', padding: '12px' }}>
                    {data.type === 'pdf' && data.file_url ? (
                        <div className="pdf-high-res-canvas"> 
                            <Document file={data.file_url} loading="...">
                                <Page 
                                    pageNumber={data.page_index || 1} 
                                    width={parseInt(String(data.width || 200)) * 2} 
                                    renderAnnotationLayer={false} 
                                    renderTextLayer={false} 
                                />
                            </Document>
                        </div>
                    ) : (
                        isEditing ? (
                            <textarea 
                                ref={textareaRef} 
                                style={{ width: '100%', height: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: '14px', color: '#000', fontWeight: '500', lineHeight: '1.5' }}
                                value={localText} onChange={handleChange} onBlur={handleBlur}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', fontSize: '14px', color: '#000', fontWeight: '500', whiteSpace: 'pre-wrap', overflowY: 'hidden', lineHeight: '1.5' }}>
                                {localText ? <LinkifyText text={localText} /> : <span style={{color: 'rgba(0,0,0,0.4)', fontStyle: 'italic'}}>ダブルクリックで入力</span>}
                            </div>
                        )
                    )}
                </div>

                {/* 返信エリア */}
                <div className="nodrag reply-container">
                    <button onClick={(e) => { e.stopPropagation(); setShowReplies(!showReplies); }} style={{ backgroundColor: 'white', padding: '4px 10px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', border: '1px solid #ccc', fontSize: '12px', color: '#333', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}>💬 {data.replies?.length > 0 ? data.replies.length : '+'}</button>
                    {showReplies && (
                        <div style={{ position: 'absolute', top: '36px', left: '50%', transform: 'translateX(-50%)', width: '240px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', border: '1px solid #ddd', padding: '10px', zIndex: 100 }}>
                            {data.replies?.length > 0 && <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '8px', textAlign: 'left' }}>{data.replies.map((reply: ReplyData) => <div key={reply.id} style={{ fontSize: '12px', borderBottom: '1px solid #eee', padding: '4px 0', color: '#333' }}>{reply.text}</div>)}</div>}
                            <div style={{ display: 'flex', gap: '4px' }}><input type="text" className="nodrag" style={{ flex: 1, fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', padding: '4px', outline: 'none' }} placeholder="返信..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddReply(e))} autoFocus /><button onClick={handleAddReply} style={{ fontSize: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>➤</button></div>
                        </div>
                    )}
                </div>
            </div>

            {/* ▼▼▼ ハンドル調整！ ▼▼▼ */}
            
            {/* 右下 (↘)：-5 -> -2 に寄せる！ */}
            <NodeResizeControl position="bottom-right" style={{ ...controlStyle, cursor: 'nwse-resize', right: -2, bottom: -2 }} onResizeEnd={onResizeEnd}>
                <ResizeIcon />
            </NodeResizeControl>

            {/* 左下 (↙)：-5 -> -2 に寄せる！ */}
            <NodeResizeControl position="bottom-left" style={{ ...controlStyle, cursor: 'nesw-resize', left: -2, bottom: -2 }} onResizeEnd={onResizeEnd}>
                <ResizeIcon />
            </NodeResizeControl>


        </>
    );
};
export default memo(CustomNoteNode);