import React, { memo, useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { type NodeProps, NodeResizeControl } from 'reactflow';
import { Document, Page, pdfjs } from 'react-pdf';
import LinkifyText from './Linkify';
import '../styles/Note.css';

// PDFワーカー (省略せず書いておくね)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const CustomNoteNode = ({ data, selected }: NodeProps) => {
    // --- State ---
    const [isEditing, setIsEditing] = useState(false);
    const [localText, setLocalText] = useState(data.text);
    const [minHeight, setMinHeight] = useState(60); 

    // ▼ 新しいStateたち
    const [showAgendaMenu, setShowAgendaMenu] = useState(false); // 宛先メニュー
    const [isRepliesOpen, setIsRepliesOpen] = useState(false);   // アコーディオン開閉
    const [showReplyInput, setShowReplyInput] = useState(false); // 返信入力欄
    const [replyText, setReplyText] = useState("");              // 返信内容

    // --- Refs ---
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dummyRef = useRef<HTMLDivElement>(null); 
    const inputRef = useRef<HTMLInputElement>(null); // 返信入力用

    // --- Effects ---
    useEffect(() => { setLocalText(data.text); }, [data.text]);

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

    // 返信入力が開いたらフォーカス
    useEffect(() => {
        if (showReplyInput && inputRef.current) {
            inputRef.current.focus();
        }
    }, [showReplyInput]);

    // --- Handlers ---
    const handleResizeEnd = useCallback((_event: any, params: any) => {
        const { width, height } = params;
        data.onUpdateNote(data.id, { width: Math.round(width), height: Math.round(height) });
    }, [data]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalText(e.target.value);
    
    const handleBlur = useCallback(() => {
        setIsEditing(false);
        if (localText !== data.text) data.onChangeText(localText);
    }, [localText, data]);

    // ▼ 宛先変更ハンドラ
    const handleChangeAgenda = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowAgendaMenu(!showAgendaMenu);
    };

    const selectAgenda = (agendaId: string) => {
        if (data.onUpdateAgendaId) {
            data.onUpdateAgendaId(agendaId); // DB更新！
        }
        setShowAgendaMenu(false);
    };

    // ▼ 返信モード切替
    const handleToggleReplyInput = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowReplyInput(!showReplyInput);
        setShowAgendaMenu(false); // 他のメニューは閉じる
        setIsRepliesOpen(true);   // 入力するなら履歴も開く
    };

    // ▼ 返信送信
    const sendReply = () => {
        if (replyText.trim()) {
            data.onAddReply(replyText);
            setReplyText("");
            setShowReplyInput(false);
            setIsRepliesOpen(true); // 送信後も開いておく
        }
    };

    const handleReplyKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendReply();
        }
    };

    // --- Classes ---
    const isPdf = data.type === 'pdf';
    let noteClass = 'note';
    if (!isPdf) {
        if (data.color === 'r') noteClass += ' note-red';
        else if (data.color === 'b') noteClass += ' note-blue';
        else noteClass += ' note-white';
    }
    if (data.isRead) noteClass += ' note-read';

    // --- Context Menu (右クリック) ---
    // React Flowの onNodeContextMenu を使う場合はここは標準のイベントバブリングでOK
    // ただし、このノード内での右クリックをキャッチしたい場合は以下を使う
    // 今回は MainContent側で制御されているので、ここでは何もしなくてOK！
    // (トップ右上の削除ボタンは一応残しておくね)

    return (
        <div className={`note-container ${selected ? 'selected' : ''}`} ref={wrapperRef}>
            
            {/* リサイズハンドラ */}
            {!isPdf && (
                <>
                    <NodeResizeControl position="bottom-right" className="resize-handle br" onResizeEnd={handleResizeEnd} minWidth={150} minHeight={minHeight} />
                    <NodeResizeControl position="bottom-left" className="resize-handle bl" onResizeEnd={handleResizeEnd} minWidth={150} minHeight={minHeight} />
                </>
            )}

            <div className={noteClass}>

                {/* アイコン */}
                {data.icon && (
                    <div className="icon-container">
                        <img src={data.icon} alt="icon" className="user-icon" />
                    </div>
                )}

                {/* コンテンツ */}
                {isPdf && data.file_url ? (
                    <div className="pdf-wrapper">
                        <Document file={data.file_url} loading="Loading...">
                            <Page pageNumber={data.page_index || 1} width={(data.width || 200) * (window.devicePixelRatio || 1) * 1.5} renderAnnotationLayer={true} renderTextLayer={false} />
                        </Document>
                    </div>
                ) : (
                    <>
                        <div ref={dummyRef} style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', width: '100%', padding: '10px', wordBreak: 'break-all' }}>{localText}</div>
                        {isEditing ? (
                            <textarea 
                                ref={textareaRef}
                                className="note-textarea nodrag"
                                value={localText}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                autoFocus
                            />
                        ) : (
                            <div className="note-textarea note-text-display" onDoubleClick={() => setIsEditing(true)}>
                                {localText ? <LinkifyText text={localText} /> : <span style={{ opacity: 0.5 }}>ダブルクリックで編集...</span>}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* --- アコーディオン返信エリア --- */}
            {!isPdf && (
                <div className="replies-wrapper">
                    
                    {/* 1. 返信がある場合だけトグルボタンを表示 */}
                    {data.replies && data.replies.length > 0 && (
                        <button 
                            className="reply-toggle-btn nodrag" 
                            onClick={(e) => { e.stopPropagation(); setIsRepliesOpen(!isRepliesOpen); }}
                        >
                            <span>{isRepliesOpen ? '▼' : '▶'}</span>
                            <span>返信 {data.replies.length}件</span>
                        </button>
                    )}

                    {/* 2. 返信リスト本体 (開いている時だけ) */}
                    {isRepliesOpen && data.replies && data.replies.length > 0 && (
                        <div className="replies-list-body nodrag">
                            {data.replies.map((reply: any) => (
                                <div key={reply.id} className="reply-item-modern">
                                    {reply.text}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 3. インライン返信入力 (ボタンを押すと出現) */}
                    {showReplyInput && (
                        <div className="reply-input-container nodrag">
                            <input
                                ref={inputRef}
                                type="text"
                                className="reply-input-box"
                                placeholder="返信を入力..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={handleReplyKeyDown}
                            />
                            <button className="reply-send-btn-small" onClick={sendReply}>
                                ➤
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* --- 操作ボタン (ホバーで出現) --- */}
            {!isPdf && !isEditing && (
                <div className="action-buttons nodrag" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    
                    <button className="mini-btn" onClick={() => setIsEditing(true)}>
                        ✏️ 編集
                    </button>
                    
                    <button className="mini-btn" onClick={handleToggleReplyInput}>
                        💬 返信
                    </button>

                    {/* 宛先変更 (リッチなポップオーバー付き) */}
                    <div style={{ position: 'relative' }}>
                        <button className="mini-btn" onClick={handleChangeAgenda}>
                            🔀 宛先
                        </button>

                        {/* ✨ カッコいいメニュー ✨ */}
                        {showAgendaMenu && data.agendaList && (
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