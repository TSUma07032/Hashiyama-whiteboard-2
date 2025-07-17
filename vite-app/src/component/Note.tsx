import '../styles/Note.css';
import type { NoteData }  from './index.d'; // NoteData型をインポート
import type { CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';


/**
 * @filename Note.tsx
 * @fileoverview Noteコンポーネントは、ノートの内容を表示するためのReactコンポーネントです。
 * @author 守屋翼
 */

export type NoteProps = {
    note: NoteData;
    onDelete: (id: string) => void;
};

export default function Note({ note, onDelete }: NoteProps) {

    // ノート削除ハンドラ
    const handleDelete = () => {
        onDelete(note.id); // onDeleteコールバックを呼び出して、ノートを削除
    };

    // ドラッグ可能な要素の設定. 
    const { attributes, listeners, setNodeRef, transform,  isDragging } = useDraggable({
        id: note.id, //ドラッグするアイテムのユニークなID. note.idを使用
    });

    //transform はドラッグ中の要素の移動情報を保持する
    const style: CSSProperties = {
        position: 'absolute', // 付箋を自由に配置するために必要
        transform: transform
            ? `translate3d(${transform.x + note.x}px, ${transform.y + note.y}px, 0)`
            : `translate3d(${note.x}px, ${note.y}px, 0)`,
        opacity: isDragging ? 0.8 : 1, // ドラッグ中はちょっと透明にする
        zIndex: isDragging ? 1000 : 1, // ドラッグ中は一番手前に表示する
    };

    return (
        <div 
            className="note-container" 
            ref={setNodeRef} // ドラッグ可能な要素の参照を設定
            style={style} // ドラッグ中の位置を反映
            {...attributes} // ドラッグ可能な要素の属性を適用
            {...listeners} // ドラッグイベントのリスナーを適用
        >
             {/* ノートのコンテナ */}
            <div className="note">
                <h2 className="note-id">{note.text}</h2>
                {/*<p className="note-text">ID: {note.id}</p>*/}
            </div>
            <button
                className="delete-button"
                onClick={handleDelete}
                onPointerDown={(e) => e.stopPropagation()} // これが無いと、削除ボタンを押してもD&Dが実行してしまうらしい

            >
                ✖
            </button>
        </div>
    );
}
