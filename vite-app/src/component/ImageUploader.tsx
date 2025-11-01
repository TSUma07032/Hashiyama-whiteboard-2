// ImageUploader.tsx
import { useState, useRef, type ChangeEvent } from 'react';
import { supabase } from './supabaseClient'; // 
import { nanoid } from 'nanoid'; // ファイル名が被らないためのおまじない

/**
 * @filename ImageUploader.tsx
 * @fileoverview 画像アップロード用のコンポーネント。
 * @param {function} onUpload - アップロードされた画像のURLを親に渡す関数
 */
type ImageUploaderProps = {
    onUpload: (imageUrl: string) => void;
};

export default function ImageUploader({ onUpload }: ImageUploaderProps) {
    // ファイル入力の要素を参照するためのRef
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false); // アップロード中フラグを追加！

    // ファイルが選択されたときのハンドラ
    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return; // ファイルがなければ終了
        }

        setIsUploading(true); // アップロード開始
        setFileName(file.name);

        try {
            // 1. ファイル名が被らないように、ランダムな文字列を生成
            // （例: 'my-icon.png' -> 'abcdef123.png'）
            const fileExt = file.name.split('.').pop();
            const randomName = `${nanoid()}.${fileExt}`;
            
            // 2. Supabase Storageにアップロード
            //    バケット名は 'uploads' 
            const { data, error: uploadError } = await supabase.storage
                .from('uploads') // バケット名
                .upload(randomName, file); // (ファイルパス, ファイル本体)

            if (uploadError) {
                // 3. アップロード失敗時の断末魔
                throw uploadError;
            }

            // 4. アップロード成功
            //    「公開URL」を取得する処理を追加
            const { data: urlData } = supabase.storage
                .from('uploads')
                .getPublicUrl(data.path); // 今アップしたファイルのパスを指定

            if (!urlData.publicUrl) {
                throw new Error("公開URLの取得に失敗しました。バケットがPublicになってるか確認してください");
            }

            // 5. 本物の公開URLを親 (Layout.tsx) に渡す
            console.log('取得したURL:', urlData.publicUrl);
            onUpload(urlData.publicUrl); 

        } catch (error) {
            console.error('アップロード地獄:', error);
            alert(`アップロードに失敗した: ${(error as Error).message}`);
            setFileName('アップロード失敗...');
        } finally {
            setIsUploading(false); // 処理完了
        }
    };

    // アップロードボタンがクリックされたときのハンドラー
    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
    <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-400 rounded-md bg-gray-50 mb-4">
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/png, image/jpeg"
            disabled={isUploading} // 連打防止
        />
        <p className="text-sm text-gray-600 mb-2">
            {isUploading ? `アップロード中...: ${fileName}` : (fileName ? `選択中のファイル: ${fileName}` : 'アイコンが選択されていません')}
        </p>
        <button
            onClick={handleButtonClick}
            className="py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
            disabled={isUploading} // 連打防止
        >
            {isUploading ? '待て…！' : (fileName ? 'アイコンを変更する' : 'アイコンをアップロード')}
        </button>
    </div>
);
}