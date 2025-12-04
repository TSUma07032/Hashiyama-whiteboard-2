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
        <div className="flex flex-col items-center w-full mb-4">
            {/* ▼▼▼ こいつだ！ hidden クラスがついているか絶対確認！ ▼▼▼ */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden" // 隠す！
                accept="image/png, image/jpeg"
                style={{ display: 'none' }}
            />
            
            <button
                onClick={handleButtonClick}
                className="w-full max-w-[200px] py-2 px-4 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                disabled={isUploading}
            >
                {isUploading ? 'アップロード中...' : (fileName ? 'アイコン変更' : 'アイコンをアップロード')}
            </button>
            
            {fileName && <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{fileName}</p>}
        </div>
    );
}