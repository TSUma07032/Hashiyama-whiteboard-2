// src/components/ImageUploader.tsx
import { useRef, useState, type ChangeEvent } from 'react';
import { useStorage } from '@/hooks/useStorage'; // ✨フックをインポート
// ▼ 作ったCSSをインポート！
import '@/styles/ImageUploader.css';

type ImageUploaderProps = {
    onUpload: (url: string) => void;
};

export default function ImageUploader({ onUpload }: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const { uploadFile, isUploading, uploadError } = useStorage();

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        // ロジックは全部フックにお任せ！
        const publicUrl = await uploadFile(file, 'uploads', 'icons');
        
        if (publicUrl) {
            console.log('画像URLゲット:', publicUrl);
            onUpload(publicUrl);
        } else {
            setFileName('アップロード失敗...');
        }
    };

    return (
        <div className="image-uploader-container">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden-input"
                accept="image/png, image/jpeg"
            />
            
            <button
                onClick={() => fileInputRef.current?.click()}
                className="upload-button"
                disabled={isUploading}
            >
                {isUploading ? 'アップロード中...' : (fileName ? 'アイコン変更' : 'アイコンをアップロード')}
            </button>
            
            {fileName && <p className="file-name-text">{fileName}</p>}
            {uploadError && <p className="error-text">エラー: {uploadError}</p>}
        </div>
    );
}