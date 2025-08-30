// ImageUploader.tsx
import React, { useState, useRef, type ChangeEvent } from 'react';

/**
 * @filename ImageUploader.tsx
 * @fileoverview 画像アップロード用のコンポーネント。
 * @param {function} onUpload - アップロードされた画像のURLを親に渡す関数
 * ToDo: firebaseに対応予定
 */
type ImageUploaderProps = {
    onUpload: (imageUrl: string) => void;
};

export default function ImageUploader({ onUpload }: ImageUploaderProps) {
    // ファイル入力の要素を参照するためのRef
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    // ファイルが選択されたときのハンドラー
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // ここが重要！画像を一時的なURLに変換する呪文
            const imageUrl = URL.createObjectURL(file);
            onUpload(imageUrl);
            setFileName(file.name);
        }
    };

    // アップロードボタンがクリックされたときのハンドラー
    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-400 rounded-md bg-gray-50 mb-4">
            {/* 隠されたファイル入力フィールド */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden" // 見えないようにする
                accept="image/png, image/jpeg"
            />
            {fileName ? (
                <>
                    <p className="text-sm text-gray-600 mb-2">選択中のファイル: <span className="font-bold">{fileName}</span></p>
                    <button
                        onClick={handleButtonClick}
                        className="py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                        アイコンを変更する
                    </button>
                </>
            ) : (
                <button
                    onClick={handleButtonClick}
                    className="py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                    アイコンをアップロード
                </button>
            )}
        </div>
    );
}