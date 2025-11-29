import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import { type NodeProps, NodeResizer } from 'reactflow';
import { Document, Page, pdfjs } from 'react-pdf';
import type { ReplyData } from './index.d';
import LinkifyText from './Linkify';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const CustomNoteNode = ({ data, selected }: NodeProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [localText, setLocalText] = useState(data.text);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    useEffect(() => { setLocalText(data.text); }, [data.text]);

    const handleDoubleClick = useCallback(() => {
        if (data.type !== 'pdf') setIsEditing(true);
    }, [data.type]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
        if (localText !== data.text) data.onChangeText(localText);
    }, [localText, data]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            // カーソルを末尾へ
            textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
        }
    }, [isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalText(e.target.value);

    const handleAddReply = (e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        if (replyText.trim()) {
            data.onAddReply(replyText);
            setReplyText('');
            setIsReplying(false);
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("消しちゃう？")) {
            data.onDelete(data.id);
        }
    };

    const bgColor = data.type === 'pdf' ? '#ffffff' : (data.color === 'r' ? '#fecaca' : '#bfdbfe');
    const borderStyle = selected ? '2px solid #2563eb' : '1px solid rgba(0,0,0,0.1)';

    return (
        <>
            <NodeResizer color="#2563eb" isVisible={selected} minWidth={150} minHeight={100} />

            <div 
                onDoubleClick={handleDoubleClick}
                style={{ 
                    backgroundColor: bgColor, width: '100%', height: '100%',
                    border: borderStyle, borderRadius: '8px', 
                    position: 'relative', 
                    overflow: 'visible', // ◀◀◀ はみ出し許可！超重要！
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
            >
                {/* アイコン (左上はみ出し) */}
                {data.icon && <img src={data.icon} alt="icon" style={{ position: 'absolute', top: '-16px', left: '-16px', width: '40px', height: '40px', borderRadius: '50%', border: '2px solid white', zIndex: 20, objectFit: 'cover', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />}

                {/* ▼▼▼ ゴミ箱ボタン (修正版！右上に浮遊させる！) ▼▼▼ */}
                <button 
                    onClick={handleDelete}
                    className="nodrag" // ドラッグ無効化
                    style={{
                        position: 'absolute',
                        top: '-12px',   // 上にはみ出す！
                        right: '-12px', // 右にはみ出す！
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%', // まん丸に
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb', // 薄いグレーの枠
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 50, // 最前面
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // 影
                        color: '#ef4444', // 赤文字
                        fontSize: '16px',
                        lineHeight: '1',
                        padding: 0,
                    }}
                    title="削除"
                >
                    ×
                </button>

                {/* コンテンツ */}
                <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '8px' }}>
                    {data.type === 'pdf' && data.file_url ? (
                        <div className="w-full h-full relative overflow-hidden flex justify-center items-center">
                            <Document file={data.file_url} loading="...">
                                <Page 
                                    pageNumber={data.page_index || 1} 
                                            
                                    // 1. 画質のためにデカく描画する！ (枠200pxなら 600pxで描く！)
                                    width={600} 
                                            
                                    renderAnnotationLayer={false} 
                                    renderTextLayer={false} 
                                            
                                    // 2. クラス名を当てる
                                    className="high-res-canvas"
                                />
                            </Document>
                        </div>
                    ) : (
                        <div style={{ width: '100%', height: '100%', padding: '16px' }}>
                            {isEditing ? (
                                <textarea 
                                    ref={textareaRef} className="nodrag"
                                    style={{ width: '100%', height: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: '14px', color: '#333', cursor: 'text' }}
                                    value={localText} onChange={handleChange} onBlur={handleBlur}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', fontSize: '14px', color: '#333', cursor: 'grab', whiteSpace: 'pre-wrap', overflowY: 'auto' }}>
                                    {localText ? <LinkifyText text={localText} /> : <span style={{color: '#9ca3af'}}>ダブルクリックで編集...</span>}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 返信エリア */}
                <div className="nodrag" style={{ position: 'absolute', top: '100%', left: '0', width: '100%', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 30 }}>
                    {/* 返信リストの表示 */}
                    {data.replies && data.replies.length > 0 && (
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.9)', padding: '8px', borderRadius: '6px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', fontSize: '12px', maxHeight: '120px', overflowY: 'auto' }}>
                            {data.replies.map((reply: ReplyData) => (
                                <div key={reply.id} style={{ borderBottom: '1px solid #f3f4f6', padding: '4px 0', wordBreak: 'break-all' }}>
                                    {reply.text}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* 返信入力フォーム */}
                    {isReplying ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'white', padding: '4px', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
                            <input type="text" className="nodrag" style={{ flex: 1, fontSize: '12px', padding: '4px 8px', border: 'none', outline: 'none', background: 'transparent' }} placeholder="返信..." value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddReply(e))} autoFocus />
                            <button onClick={handleAddReply} style={{ backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', width: '24px', height: '24px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '10px', marginLeft: '-1px' }}>➤</span></button>
                            <button onClick={(e) => { e.stopPropagation(); setIsReplying(false); }} style={{ color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', width: '24px', height: '24px' }}>×</button>
                        </div>
                    ) : (
                        <button onClick={(e) => { e.stopPropagation(); setIsReplying(true); }} style={{ backgroundColor: 'rgba(255,255,255,0.8)', color: '#6b7280', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                            <span>💬</span> 返信
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};
export default memo(CustomNoteNode);