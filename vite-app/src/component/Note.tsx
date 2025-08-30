import '../styles/Note.css';
import type { NoteData } from './index.d';
import type { CSSProperties } from 'react';
import React, { useState, useRef, useEffect, useCallback, forwardRef, type Ref } from 'react';
import { useDraggable } from '@dnd-kit/core';
import clsx from 'clsx';

/**
 * @filename Note.tsx
 * @fileoverview Noteコンポーネントは、ノートの内容を表示するためのReactコンポーネントです。
 * @author 守屋翼
 */

export type NoteProps = {
    note: NoteData;
    onDelete: (id: string) => void;
    onEdit: (id: string, newText: string) => void;
};

// forwardRefを使って、外部からrefを受け取れるようにする
const Note = forwardRef<HTMLDivElement, NoteProps>(({ note, onDelete, onEdit }, ref: Ref<HTMLDivElement>) => {

    const handleDelete = () => {
        onDelete(note.id);
    };

    const [isEditing, setIsEditing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [editText, setEditText] = useState(note.text);

    // 長押し判定用のタイマーID
    const longPressTimerRef = useRef<number | null>(null);
    const isLongPressRef = useRef(false);

    // ドラッグ可能な要素の設定.
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: note.id,
        disabled: isEditing, // 編集モード中はドラッグを無効化する
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
        transform: transform
            ? `translate3d(${transform.x + note.x}px, ${transform.y + note.y}px, 0)`
            : `translate3d(${note.x}px, ${note.y}px, 0)`,
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
    const handleMouseDown = useCallback(() => {
        isLongPressRef.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
            isLongPressRef.current = true;
            setIsEditing(false);
        }, 300);
    }, []);

    // マウスアップイベント（長押し判定終了＆クリック判定）
    const handleMouseUp = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

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

    return (
        <div
            className="note-container"
            ref={combinedRef}
            style={style}
            {...(!isEditing ? attributes : {})}
            {...(!isEditing ? listeners : {})}
            onMouseDown={!isEditing ? handleMouseDown : undefined}
            onMouseUp={!isEditing ? handleMouseUp : undefined}
            data-note-id={note.id}
        >
            <div className={clsx('note', {
                'note-red': note.color === 'r',
                'note-blue': note.color === 'b',
            })}>
                {isEditing ? (
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
                )}
                {note.icon && (
                    <div className="icon-container">
                        <img src={note.icon} alt="user icon" className="user-icon" />
                    </div>
                )}
            </div>
            <button
                className="delete-button"
                onClick={handleDelete}
                // こっちはドラッグと競合するから残しておこうか…！
                onPointerDown={(e) => e.stopPropagation()}
            >
                ✖
            </button>
        </div>
    );
});

export default Note;