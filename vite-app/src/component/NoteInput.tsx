/**
 * @filename NoteInput.tsx
 * @fileoverview NoteInputコンポーネントは、入力されたテキストを表示するためのReactコンポーネントです。
 * @author 守屋翼
 */

import React, {useState} from 'react';

const DEBUG_NOTECOLOR = true; // デバッグモードを有効にするかどうか


type NoteInputProps = {
    onAddNote: (text: string, color: string) => void; // ノート追加時のコールバック関数
};

export default function NoteInput({ onAddNote }: NoteInputProps){

    // useStateフックを使用して、入力されたテキストを管理
    const [inputText, setInputText] = useState('');

    const [color, setColor] = useState('r'); // 色の状態を管理

    // 入力テキストの変更を処理する関数
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(event.target.value); // 入力されたテキストを更新

    };

    // 色の変更を処理する関数
    const handleColorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setColor(event.target.value); // 選択された色を更新
    };

    // 追加ボタンがクリックされたときの処理
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // フォームのデフォルトの送信動作（ページリロード）を防ぐ
        if (inputText.trim() !== '') { // 入力が空でない場合
            onAddNote(inputText, color); // コールバック関数を呼び出してノートを追加
            setInputText(''); // 入力フィールドをクリア
        }

        if (DEBUG_NOTECOLOR) {
            if (color === 'r') {
                setColor('b');
            } else {
                setColor('r');
            }
        }

    }

    return (
        <form className="note-input-container" onSubmit={handleSubmit}>
            <input
                type="text" //HTMLの属性指定
                className="note-input"
                value={inputText} // 入力フィールドの値を状態にバインド
                onChange={handleInputChange} // 入力変更時のイベントハンドラ
                placeholder="ノートを入力してください..." // プレースホルダー
                autoFocus // コンポーネントがマウントされたときに自動的にフォーカス
            />
            <button type="submit" className="add-note-button">追加</button>
        </form>
    )
}
