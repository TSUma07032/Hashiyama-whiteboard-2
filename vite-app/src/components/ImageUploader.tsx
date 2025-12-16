// src/component/ImageUploader.tsx
import { useState, useRef, type ChangeEvent } from 'react';
import { useStorage } from '../hooks/useStorage'; // ✨フックをインポート

type ImageUploaderProps = {
    onUpload: (imageUrl: string) => void;
};

export default function ImageUploader({ onUpload }: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    
    // ✨フックを使う！
    const { uploadImage, isUploading } = useStorage();

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        try {
            // ✨ここがスッキリ！
            const url = await uploadImage(file);
            console.log('取得したURL:', url);
            onUpload(url); 
        } catch (error) {
            alert(`アップロードに失敗した: ${(error as Error).message}`);
            setFileName('アップロード失敗...');
        }
    };

    return (
        <div className="flex flex-col items-center w-full mb-4">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/png, image/jpeg"
                style={{ display: 'none' }}
            />
            
            <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-[200px] py-2 px-4 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                disabled={isUploading}
            >
                {isUploading ? 'アップロード中...' : (fileName ? 'アイコン変更' : 'アイコンをアップロード')}
            </button>
            
            {fileName && <p className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{fileName}</p>}
        </div>
    );
}