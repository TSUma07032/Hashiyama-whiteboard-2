import React, { memo, useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
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

    const [editingReplyId, setEditingReplyId] = useState<string | null>(null); // 編集中のID
    const [editReplyText, setEditReplyText] = useState(""); // 編集中のテキスト

    // --- Effects ---
    useEffect(() => { setLocalText(data.text); }, [data.text]);

    const observerRef = useRef<ResizeObserver | null>(null);

    useLayoutEffect(() => {
        if (data.type === 'pdf' || !wrapperRef.current || !dummyRef.current) return;

        // 監視員（Observer）は最初の一回だけ雇う
        if (!observerRef.current) {
            observerRef.current = new ResizeObserver(() => {
                // ループ防止：requestAnimationFrameでタイミングをずらす
                window.requestAnimationFrame(() => {
                    if (!dummyRef.current) return;
                    const contentHeight = dummyRef.current.offsetHeight + 40;
                    // ステート更新は本当に値が変わった時だけ
                    setMinHeight(prev => {
                        if (Math.abs(prev - contentHeight) < 2) return prev; // 誤差許容
                        return Math.max(60, contentHeight);
                    });
                });
            });
            observerRef.current.observe(wrapperRef.current);
        }

        // テキストが変わった時は、手動で一回だけ高さ計算してあげる（Observerには頼らない）
        const contentHeight = dummyRef.current.offsetHeight + 40;
        setMinHeight(Math.max(60, contentHeight));

        // クリーンアップ（コンポーネントが消える時だけ）
        return () => {
            observerRef.current?.disconnect();
            observerRef.current = null;
        };
    }, []); // 依存配列を空にする
    // localText が変わった瞬間に高さ変えたいなら、
    // 別の useEffect で height 計算だけ走らせるのが安全?


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
            // Enter押したらフォーカス外す → handleReplyBlur が呼ばれて保存される
            (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            // 保存せずに閉じる
            e.preventDefault();
            setEditingReplyId(null);
            setEditReplyText("");
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

    const pdfOptions = useMemo(() => ({
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
    }), []); // [] は「最初の一回だけ作るよ」って意味

    // 1. 編集モードに入る
    const handleStartEditReply = (e: React.MouseEvent, reply: any) => {
        e.stopPropagation(); // 親のクリックイベントを止める（大事！）
        setEditingReplyId(reply.id);
        setEditReplyText(reply.text);
    };

    // フォーカスアウトで保存 (DB更新！)
    const handleReplyBlur = () => {
        if (editingReplyId && editReplyText.trim()) {
            // 元のテキストと変わってるときだけDB更新リクエスト飛ばす (エコだね✨)
            const originalReply = data.replies?.find((r: any) => r.id === editingReplyId);
            if (originalReply && originalReply.text !== editReplyText) {
                if (data.onUpdateReply) {
                    data.onUpdateReply(editingReplyId, editReplyText);
                }
            }
        }
        // どっちにしろ編集モードは終了
        setEditingReplyId(null);
        setEditReplyText("");
    };

    // 2. 編集を保存する (DB更新！)
    const handleSaveReply = () => {
        if (editingReplyId && editReplyText.trim()) {
            // 親から渡された関数を実行！
            if (data.onUpdateReply) {
                data.onUpdateReply(editingReplyId, editReplyText);
            }
            setEditingReplyId(null);
            setEditReplyText("");
        }
    };

    // 3. キャンセル
    const handleCancelEdit = () => {
        setEditingReplyId(null);
        setEditReplyText("");
    };

    // 4. Enterキーで保存、Escでキャンセル (UX爆上げポイント✨)
    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // 改行を防ぐ
            handleSaveReply();
        } else if (e.key === 'Escape') {
            handleCancelEdit();
        }
    };

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

                    <div className="pdf-high-res-canvas"> 
                            <Document 
                                file={data.file_url} 
                                loading="Loading..."
                                // ▼▼▼ ここに追加！これで日本語もバッチリ！ ▼▼▼
                                options={pdfOptions}
                            >
                                <Page 
                                    pageNumber={data.page_index || 1} 
                                    // widthの設定は好みの倍率でOK（今は2倍になってるね！）
                                    width={parseInt(String(data.width || 200)) * 2} 
                                    renderAnnotationLayer={false} 
                                    renderTextLayer={false} 
                                />
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
                            <div className="note-textarea note-text-display">
                                {localText ? <LinkifyText text={localText} /> : <span style={{ opacity: 0.5 }}>（テキストなし）</span>}
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

                    {/* 2. 返信リスト本体 */}
                    {isRepliesOpen && data.replies && data.replies.length > 0 && (
                        <div className="replies-list-body nodrag">
                            {data.replies.map((reply: any) => (
                                <div key={reply.id} className="reply-item-modern">

                                    {editingReplyId === reply.id ? (
                                        // --- 🅰️ 編集モード (ここはシームレスのままでOK！) ---
                                        <div style={{position: 'relative', width: '100%'}}>
                                            <input
                                                type="text"
                                                className="reply-input-box-seamless"
                                                value={editReplyText}
                                                onChange={(e) => setEditReplyText(e.target.value)}
                                                onBlur={handleReplyBlur}    // 外側クリックで保存
                                                onKeyDown={handleReplyKeyDown}
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        // --- 🅱️ 表示モード (ボタンを追加！) ---
                                        <div className="reply-content-wrapper">
                                            <span className="reply-text-display">{reply.text}</span>

                                            {/* ▼ ホバーで浮き出る編集ボタン ▼ */}
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