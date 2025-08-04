import '../styles/Note.css';
import type { NoteData }  from './index.d'; // NoteData型をインポート
import type { CSSProperties } from 'react';
import React, { useState, useRef, useEffect, useCallback } from 'react'; // useCallbackを追加した
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
    onEdit: (id: string, newText: string) => void; //edit handler
};

export default function Note({ note, onDelete, onEdit }: NoteProps) {

    // ノート削除ハンドラ
    const handleDelete = () => {
        onDelete(note.id); // onDeleteコールバックを呼び出して、ノートを削除
    };

    // 編集モードの切り替え state
    const [isEditing, setIsEditing] = useState(false);
    //textarea　Ref
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 編集中のテキストを保持 state
    const [editText, setEditText] = useState(note.text);

    // 長押し判定用のタイマーID
    const longPressTimerRef = useRef<number | null>(null); // タイマーIDを保持するref
    const isLongPressRef = useRef(false); // 長押しだったかどうかを判定するref

    // ドラッグ可能な要素の設定.
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: note.id, //ドラッグするアイテムのユニークなID. note.idを使用
    });

    // transform はドラッグ中の要素の移動情報を保持する
    const style: CSSProperties = {
        position: 'absolute', // 画面の特定領域内のみで動作させる際はここを変更
        transform: transform // dnd-kitの設計思想上、falseの場合も記述する必要あり
            ? `translate3d(${transform.x + note.x}px, ${transform.y + note.y}px, 0)`
            : `translate3d(${note.x}px, ${note.y}px, 0)`,
        opacity: isDragging ? 0.8 : 1, // ドラッグ中はちょっと透明にする
        zIndex: isDragging ? 1000 : (isEditing ? 999 : 1), // ドラッグ中は一番手前、編集中はその次に表示する
        cursor: isEditing ? 'auto' : (isDragging ? 'grabbing' : 'grab'), // 編集中はカーソルを通常に、ドラッグ中はつかむようにする
    };

    // テキストエリアがレンダリングされたときにフォーカスをセット
    // 編集モードになったらカーソルをテキストの最後に持っていく
    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            const length = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(length, length);
        }
    }, [isEditing]);

    // 保存処理を共通化
    const saveAndExitEditMode = useCallback(() => {
        if (editText.trim() !== '') {
            onEdit(note.id, editText);
        } else {
            // テキストが空になったら元のテキストに戻すか、削除するかはお好み
            // 今回は元のテキストに戻しとく
            setEditText(note.text);
        }
        setIsEditing(false);
    }, [editText, note.id, note.text, onEdit]);

    // ドキュメント全体へのクリックイベントを監視して、付箋以外をクリックしたら編集終了する
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { // クリックされた要素が付箋の外かどうかを判定
            /*
            *textareaRef.currentは、DOMがあるかどうかを確認するために使用される
            *!textareaRef.current.contains(event.target as Node)では、クリックされた要素がtextareaの外かどうかを判定する
            *isEditingは、現在編集モードかどうかを示すフラグ
            *もしtextareaの外をクリックしていて、かつ編集モードなら、編集を終了する
            */
            if (textareaRef.current && !textareaRef.current.contains(event.target as Node) && isEditing) { 
                const noteContainer = document.querySelector(`.note-container[data-note-id="${note.id}"]`); 

                // noteContainerが存在し、クリックされた要素がnoteContainerの外なら編集を終了
                // これで、付箋の外をクリックしたときに編集モードを終了する
                // 付箋の外をクリックしたときに編集モードを終了
                 if (noteContainer && !noteContainer.contains(event.target as Node)) {
                    saveAndExitEditMode(); // 編集モードを終了して保存
                }
            }
        };

        // マウスのボタンが押されたならば、handleClickOutsideを実行する
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            // クリーンアップ関数というらしい
            // クリーンアップ関数がないと、コンポーネントがアンマウントされたときにイベントリスナーが残ってしまう.つまり、重くなる
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isEditing, note.id, saveAndExitEditMode]); //idを引数にするのはマナー。saveAndExitEditModeはメモ化したから、引数に加えるべき


    // マウスダウンイベント（長押し判定開始）
    const handleMouseDown = useCallback(() => {
        isLongPressRef.current = false; // フラグをリセット
        // 300ms（適当な時間）後に長押しと判定する
        longPressTimerRef.current = window.setTimeout(() => {
            isLongPressRef.current = true; // 長押しフラグを立てる
            setIsEditing(false); // 長押しなら編集モードを終了
        }, 300); // ここで長押しの時間を調整するんだ
    }, []);

    // マウスアップイベント（長押し判定終了＆クリック判定）
    const handleMouseUp = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current); // タイマーをクリア
            longPressTimerRef.current = null;
        }

        // 長押しじゃなかったら（単押しだったら）編集モードに突入する
        if (!isLongPressRef.current && !isDragging) { // ドラッグ中じゃないことも確認
            setIsEditing(true);
        }
    }, [isDragging]); // isDraggingを追加して依存関係を解決


    // キーボードイベント（エンターキーで保存）
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Shift+Enterは改行、Enter単体で保存
            e.preventDefault(); // デフォルトの改行を防ぐ
            saveAndExitEditMode();
        }
    }, [saveAndExitEditMode]);

    return (
        <div
            className="note-container"
            ref={setNodeRef}
            style={style}
            {...(!isEditing ? attributes : {})} // 編集モードでは属性を無効化
            {...(!isEditing ? listeners : {})} // 編集モードではリスナーを無効化
            {...(!isEditing ? { onMouseDown: handleMouseDown, onMouseUp: handleMouseUp } : {})} // 編集モードではマウスイベントを無効化
            data-note-id={note.id}
        >

            {/* ノートのコンテナ */}
            <div className={clsx('note', {
                'note-red': note.color === 'r',
                'note-blue': note.color === 'b',
            })}> {/* 色によってクラスを切り替える*/}
                {isEditing ? (
                    // 編集モード用のtextarea
                    <textarea
                        ref={textareaRef}
                        className={clsx('edit-textarea', {
                            'edit-textarea-red': note.color === 'r',
                            'edit-textarea-blue': note.color === 'b',
                        })} // 色によってクラスを切り替える
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={saveAndExitEditMode}
                        onKeyDown={handleKeyDown}
                        onPointerDown={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    // 非編集モード用のtextarea (読み取り専用)
                    // 本当は非編集モードではtextareaではなく、h2タグとかにしたいけど、見栄えを保つためにtextareaを使う
                    <textarea
                        className={clsx('note-text-readonly', {
                            'note-text-readonly-red': note.color === 'r',
                            'note-text-readonly-blue': note.color === 'b',
                        })} // 色によってクラスを切り替える
                        value={note.text} // ここはオリジナルのノートテキストを表示
                        readOnly={true} // 読み取り専用にする
                        onDoubleClick={() => setIsEditing(true)} // ダブルクリックで編集モード
                        // 非編集モードではD&DとぶつからないようにonPointerDownはつけない
                        // ただし、このtextareaの上でD&Dのドラッグ開始イベントを拾いたい場合は、
                        // onPointerDownをつけず、dnd-kit側のリスナーに任せる必要がある
                        // 現状ではD&Dのリスナーがnote-containerに付いてるから大丈夫なはず
                    />
                )}
            </div>
            <button
                className="delete-button"
                onClick={handleDelete} //なお、削除ボタンは後ほど右クリック
                onPointerDown={(e) => e.stopPropagation()} // これが無いと、削除ボタンを押してもD&Dが実行してしまう
            >
                ✖
            </button>
            {/* 編集ボタンは直接クリックで編集モードにするから不要かもだけど、一応残す */}
            {/* <button
                className="edit-button"
                onClick={handleEditClick} // handleEditClickはもう使わない？
                onPointerDown={(e) => e.stopPropagation()}
            >
                ✎
            </button> */}
        </div>
    );
}