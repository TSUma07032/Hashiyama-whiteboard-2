import React, { useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { nanoid } from 'nanoid';
// ▼▼▼ react-pdf の召喚 ▼▼▼
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css'; // テキスト選択用CSS
import 'react-pdf/dist/Page/TextLayer.css';       // テキスト選択用CSS

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type PDFViewerProps = {
    // ▼▼▼ 親から「追加関数」をもらうようにする！ ▼▼▼
    onAddPdfNote: (url: string, pageIndex: number) => void;
    onAddAllPages: (url: string, totalPages: number) => void;
};

const PDFViewer: React.FC<PDFViewerProps> = ({ onAddPdfNote, onAddAllPages }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // ページ数管理用
  const [numPages, setNumPages] = useState<number | null>(null);

  // PDFの読み込み成功時にページ数をセットする
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // ▼▼▼ 【ここが魔改造ポイント！】 ▼▼▼
  const uploadToSupabase = async (file: File) => {
    setUploadStatus('Supabaseにアップロード中...');
    setIsUploading(true);

    try {
      // 1. ファイル名が被らないようにランダムな名前を生成
      //    PDFなので拡張子もしっかり管理！
      const fileExt = file.name.split('.').pop();
      const fileName = `${nanoid()}.${fileExt}`;
      const filePath = `pdfs/${fileName}`; // "pdfs" フォルダに入れると整理しやすいぞ！

      // 2. Supabase Storage (uploadsバケット) にアップロード！
      const { error: uploadError } = await supabase.storage
        .from('uploads') // ◀ バケット名は 'uploads' (画像と同じでOK)
        .upload(filePath, file, {
            contentType: 'application/pdf' // ◀ PDFであることを明示！
        });

      if (uploadError) {
        throw uploadError;
      }

      // 3. 公開URLを取得！
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        throw new Error("公開URLの取得に失敗しました。");
      }

      // 4. 成功！
      setPdfUrl(urlData.publicUrl);
      setUploadStatus('アップロード成功！');
      console.log('PDF URL:', urlData.publicUrl);

    } catch (err) {
      console.error(err);
      setUploadStatus(`アップロード失敗: ${(err as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  };
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  // 共通のファイル処理
  const handleFile = (file: File) => {
    if (file && file.type === 'application/pdf') {
      // ローカルプレビュー用URLを一瞬出すのもアリだけど、
      // ここでは直接アップロードしちゃうぜ！
      uploadToSupabase(file);
    } else {
      alert('PDFファイルを選択してください。');
    }
  };

  // input選択時
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // drag & drop 対応
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded shadow-lg"> {/* 見やすく白背景追加 */}
      <h2 className="text-xl font-bold mb-4 text-gray-800">PDFファイルのアップロード＆表示</h2>

      <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">PDFアップロード</h2>
          
          {/* ▼▼▼ 「全ページ貼る」ボタン（PDFがある時だけ表示） ▼▼▼ */}
          {pdfUrl && numPages && (
              <button
                  onClick={() => onAddAllPages(pdfUrl, numPages)}
                  className="bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 shadow-lg transition-transform transform hover:scale-105"
              >
                  全{numPages}ページをボードに展開する！
              </button>
          )}
      </div>

      {/* ドラッグ＆ドロップエリア */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`mb-4 border-2 border-dashed rounded-lg h-32 flex items-center justify-center text-gray-600 transition
            ${isUploading ? 'bg-gray-200 border-gray-400 cursor-wait' : 'border-blue-400 hover:bg-blue-50 cursor-pointer'}`}
      >
        {isUploading ? 'アップロード中...' : 'ここにPDFをドラッグ＆ドロップ'}
      </div>

      {/* 通常のinput */}
      <input 
        type="file" 
        accept="application/pdf" 
        onChange={handleFileChange} 
        className="mb-4" 
        disabled={isUploading}
      />

      {/* アップロードステータス */}
      {uploadStatus && <p className="text-sm text-blue-600 mb-2 font-bold">{uploadStatus}</p>}

      {/* PDF表示エリア */}
      {pdfUrl && (
        <div className="flex-1 overflow-x-auto bg-gray-100 p-4 border rounded-lg">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex flex-row gap-4" // ◀◀◀ ここで横並び (flex-row) 指定！
            loading={<div className="text-center p-4">PDFを読み込み中</div>}
            error={<div className="text-red-500">読み込み失敗！</div>}
          >
            {/* ページ数分だけループして <Page> をレンダリング */}
            {Array.from(new Array(numPages), (_el, index) => (
              <div key={`page_${index + 1}`} className="shadow-md">
                <Page 
                    pageNumber={index + 1} 
                    width={300} // ◀ 幅を指定しないとデカすぎるぞ！調整しろ！
                    renderAnnotationLayer={true} 
                    renderTextLayer={false} 
                />
                <button
                    onClick={() => onAddPdfNote(pdfUrl, index + 1)}
                    className="bg-blue-500 text-white text-sm py-1 px-2 rounded-b hover:bg-blue-600"
                >
                    ボードに貼る
                </button>
                <p className="text-center text-sm mt-1 text-gray-500">{index + 1}ページ</p>
              </div>
            ))}
          </Document>
        </div>
      )}
      
      {/* デバッグ用：URL表示 */}
      {pdfUrl && (
          <p className="text-xs text-gray-400 mt-2 break-all">URL: {pdfUrl}</p>
      )}
    </div>
  );
};

export default PDFViewer;