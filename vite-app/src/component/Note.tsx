import '../styles/Note.css';
import type { NoteData } from './index.d';
import type { CSSProperties } from 'react';
import React, { useState, useRef, useEffect, useCallback, forwardRef, type Ref } from 'react';
import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';
import { ResizableBox, type ResizeCallbackData  } from 'react-resizable';
import type { SyntheticEvent} from 'react';
import { Document, Page } from 'react-pdf';

/**
 * @filename Note.tsx
 * @fileoverview Noteコンポーネントは、ノートの内容を表示するためのReactコンポーネントです。
 * @author 守屋翼
 */

export type NoteProps = {
    note: NoteData;
    onDelete: (id: string) => void;
    onEdit: (id: string, newText: string) => void;
    onResize: (id: string, newWidth: number, newHeight: number) => void;
    scale: number; 
    onAddReply: (noteId: string, replyText: string) => void;
    onToggleReadStatus: (noteId: string) => void;
};

// forwardRefを使って、外部からrefを受け取れるようにする
const Note = forwardRef<HTMLDivElement, NoteProps>(({ note, onDelete, onEdit, onResize, scale, onAddReply, onToggleReadStatus }, ref: Ref<HTMLDivElement>) => {

    const handleDelete = () => {
        onDelete(note.id);
    };

    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [editText, setEditText] = useState(note.text);
    const [noteSize, setNoteSize] = useState({ width: note.width || 200, height: note.height || 100 });
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

    // 長押し判定用のタイマーID
    const longPressTimerRef = useRef<number | null>(null);
    const isLongPressRef = useRef(false);

    // ドラッグ可能な要素の設定.
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: note.id,
        disabled: isEditing,
    });

    // 外部から渡されたrefとdnd-kitのrefを結合する
    const combinedRef = useCallback(
        (node: HTMLDivElement | null) => {
            setNodeRef(node);
            if (ref) {
                if (typeof ref === 'function') {
                    ref(node);
                } else {
                    ref.current = node;
                }
            }
        },
        [setNodeRef, ref]
    );

    const style: CSSProperties = {
        position: 'absolute',
        left: note.x,
        top: note.y,
        transform: transform ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)` : undefined,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1000 : (isEditing ? 999 : 1),
        cursor: isEditing ? 'auto' : (isDragging ? 'grabbing' : 'grab'),
    };

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
        }
    }, [isEditing]);

    const saveAndExitEditMode = useCallback(() => {
        if (editText.trim() !== '') {
            onEdit(note.id, editText);
        } else {
            setEditText(note.text);
        }
        setIsEditing(false);
    }, [editText, note.id, note.text, onEdit]);

    // マウスダウンイベント（長押し判定開始）
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // dnd-kitのイベントを発火させる！これが最重要！
        listeners?.onMouseDown?.(e);

        e.stopPropagation();

        // 長押し判定のロジックはそのまま
        isLongPressRef.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
            isLongPressRef.current = true;
        }, 300); // 300ms以上押したら長押し
    }, [listeners]);

    // マウスアップイベント（長押し判定終了＆クリック判定）
    const handleMouseUp = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        // isDragging は dnd-kit が更新してくれる
        // 長押しされてなくて、かつドラッグ中でなければ編集モードに移行
        if (!isLongPressRef.current && !isDragging) {
            setIsEditing(true);
        }
    }, [isDragging]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveAndExitEditMode();
        }
    }, [saveAndExitEditMode]);

    const handleBlur = useCallback(() => {
        saveAndExitEditMode();
    }, [saveAndExitEditMode]);

    // サイズ変更時のハンドラ
    const  handleResize = useCallback((_e: SyntheticEvent, data: ResizeCallbackData) => {
        const { size } = data;
        setNoteSize(size);
        onResize(note.id, size.width, size.height);
    }, [note.id, onResize]);

   const handleReplyButtonClick = () => {
        setIsReplying(true);
    };

    const handleReplySubmit = () => {
        if (replyText.trim() !== '') {
            onAddReply(note.id, replyText); 
            setReplyText('');
            setIsReplying(false);
        }
    };

     useEffect(() => {
        if (isReplying && replyTextareaRef.current) {
            replyTextareaRef.current.focus();
        }
    }, [isReplying]);

    const handleToggleRead = (e: React.MouseEvent) => {
        // ドラッグイベントと競合しないようにするおまじない
        e.stopPropagation();
        onToggleReadStatus(note.id);
    };

    return (
        <ResizableBox
            width={noteSize.width}
            height={noteSize.height}
            minConstraints={[100, 50]}
            maxConstraints={[800, 600]}
            onResize={handleResize}
            className="note-container"
            style={style}
            data-note-id={note.id}
        >
            <div 
                ref={combinedRef}
                className={clsx('note', {
                    'note-red': note.color === 'r',
                    'note-blue': note.color === 'b',
                    'note-read': note.isRead, // ← これを追加！
                    'note-pdf': note.type === 'pdf' // 一応
                })}
                {...(!isEditing ? attributes : {})}
                {...(!isEditing ? listeners : {})}
                onMouseDown={!isEditing ? handleMouseDown : undefined}
                onMouseUp={!isEditing ? handleMouseUp : undefined}
                data-note-id={note.id}
            >
                {note.type === 'pdf' && note.file_url ? (
                    <div className="w-full h-full overflow-hidden bg-white">
                        {/* ドラッグ移動とリンククリックが喧嘩しないように、no-dragクラスとか工夫がいるかもだが一旦これ！ */}
                        <Document file={note.file_url} loading="Loading...">
                            <Page 
                                pageNumber={note.page_index || 1} 
                                    
                                // ▼▼▼ 【最適解 1】レンダリング解像度（画質）を決める ▼▼▼
                                // ノートの幅 × デバイスのピクセル比（Retinaなら2） × 余裕を見て1.5倍くらい
                                // これで「拡大してもボヤけない高密度の絵」が作られる！
                                width={noteSize.width * (window.devicePixelRatio || 1) * 1.5} 
                                    
                                // ▼▼▼ 【最適解 2】表示サイズ（レイアウト）を強制する ▼▼▼
                                // Canvasがどれだけデカくても、親のdiv（noteSize）にピッタリ収まるようにする
                                // これがないと、さっきみたいにレイアウトが爆発する！
                                className="pdf-page-wrapper"
                                    
                                renderAnnotationLayer={true} 
                                renderTextLayer={false} // テキスト選択いらないならfalse推奨（ズレ防止）
                            />
                        </Document>
                        {/* 編集モードとかで上に透明なレイヤー置かないと、リンク押せないかも？ */}
                    </div>
                ) : (
                    isEditing ? (
                        <textarea
                            ref={textareaRef}
                            className={clsx('edit-textarea', {
                                'edit-textarea-red': note.color === 'r',
                                'edit-textarea-blue': note.color === 'b',
                            })}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            // onPointerDown={(e) => e.stopPropagation()}
                        />
                ) : (
                    <textarea
                        className={clsx('note-text-readonly', {
                            'note-text-readonly-red': note.color === 'r',
                            'note-text-readonly-blue': note.color === 'b',
                        })}
                        value={note.text}
                        readOnly={true}
                    />
                ))}
                {note.icon && (
                    <div className="icon-container">
                        <img src={note.icon} alt="user icon" className="user-icon" />
                    </div>
                )}
            </div>
            <div className="replies-container">
                {note.replies?.map(reply => (
                    <div key={reply.id} className="reply">
                        {reply.icon && <img src={reply.icon} alt="reply icon" className="reply-icon" />}
                        <p className="reply-text">{reply.text}</p>
                    </div>
                ))}
            </div>
            <div className="read-checkbox-container" onClick={handleToggleRead}>
                    {note.isRead ? '✅' : '⬜️'}
            </div>

            {isReplying ? (
                    <div className="reply-input-area">
                        <textarea
                            ref={replyTextareaRef}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="返信を入力..."
                        />
                        <button onClick={handleReplySubmit}>送信</button>
                        <button onClick={() => setIsReplying(false)}>キャンセル</button>
                    </div>
                ) : (
                    <button className="reply-button" onClick={handleReplyButtonClick}>
                        返信する
                    </button>
                )}
            

            <button
                className="delete-button"
                onClick={handleDelete}
                // こっちはドラッグと競合するから残しておこうか…！
                onPointerDown={(e) => e.stopPropagation()}
            >
                ✖
            </button>
        </ResizableBox>
    );
});

export default Note;