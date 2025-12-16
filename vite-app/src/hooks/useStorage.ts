// src/hooks/useStorage.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { nanoid } from 'nanoid';

export const useStorage = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<Error | null>(null);

    /**
     * 画像をアップロードして公開URLを返す関数
     * @param file アップロードするファイル
     * @param bucketName バケット名 (デフォルト: 'uploads')
     */
    const uploadImage = useCallback(async (file: File, bucketName: string = 'uploads') => {
        setIsUploading(true);
        setUploadError(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${nanoid()}.${fileExt}`;
            
            // アップロード実行
            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file);

            if (error) throw error;

            // 公開URL取得
            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(data.path);

            if (!urlData.publicUrl) {
                throw new Error("公開URLの取得に失敗したよ💦");
            }

            return urlData.publicUrl;

        } catch (error) {
            console.error('アップロード失敗:', error);
            setUploadError(error as Error);
            throw error; // 呼び出し元でもキャッチできるようにする
        } finally {
            setIsUploading(false);
        }
    }, []);

    return { uploadImage, isUploading, uploadError };
};