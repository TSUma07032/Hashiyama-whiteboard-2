// src/hooks/useStorage.ts
import { useState } from 'react';
import { supabase } from '../utils/supabase'; // パスは環境に合わせてね
import { nanoid } from 'nanoid';

export const useStorage = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // 画像でもPDFでも使える汎用アップロード関数
    const uploadFile = async (
        file: File, 
        bucketName: 'uploads', // バケット名は固定または引数で
        folder: string = ''
    ): Promise<string | null> => {
        setIsUploading(true);
        setUploadError(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${nanoid()}.${fileExt}`;
            const filePath = folder ? `${folder}/${fileName}` : fileName;

            // 1. アップロード
            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // 2. 公開URL取得
            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(data.path);

            if (!urlData.publicUrl) throw new Error('公開URL取れなかった...');

            return urlData.publicUrl;

        } catch (err) {
            console.error('Upload Error:', err);
            setUploadError((err as Error).message);
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    // ▼▼▼ 追加！フォルダ内のファイルを全削除する関数 ▼▼▼
    const deleteFolderContents = async (bucketName: string, folderName: string) => {
        try {
            // 1. まずフォルダ内のファイルリストを取得（最大1000件）
            const { data: list, error: listError } = await supabase.storage
                .from(bucketName)
                .list(folderName, { limit: 1000 });

            if (listError) throw listError;
            if (!list || list.length === 0) return; // ファイルなければ何もしない

            // 2. 削除対象のパスを作成 ('icons/abc.png' みたいな形にする)
            const filesToRemove = list.map(file => `${folderName}/${file.name}`);

            // 3. 一括削除実行！
            const { error: removeError } = await supabase.storage
                .from(bucketName)
                .remove(filesToRemove);

            if (removeError) throw removeError;
            
            console.log(`${folderName} の中身を全削除したよ！🗑️`);

        } catch (err) {
            console.error('削除失敗...:', err);
            // 削除失敗してもアプリは止めない（ログだけ出す）
        }
    };

    // アイコンとPDFを一掃する便利関数
    const deleteAllStorageFiles = async () => {
        setIsUploading(true); // 削除中もローディング扱いにしとく
        await Promise.all([
            deleteFolderContents('uploads', 'icons'),
            deleteFolderContents('uploads', 'pdfs')
        ]);
        setIsUploading(false);
    };

    return { uploadFile, isUploading, uploadError, deleteAllStorageFiles};
};