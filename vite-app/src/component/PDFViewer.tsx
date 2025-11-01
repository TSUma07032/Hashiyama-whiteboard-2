import React, { useState, useCallback } from 'react';

const PDFViewer: React.FC = () => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // PDFの送信処理
  const uploadToAPI = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploadStatus('アップロード中...');

    try {
      const response = await fetch('https://your-api-endpoint.com/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`アップロード失敗: ${response.statusText}`);
      }

      setUploadStatus('アップロード成功！');
    } catch (err) {
      console.error(err);
      setUploadStatus('アップロードエラーが発生しました。');
    }
  };

  // 共通のファイル処理
  const handleFile = (file: File) => {
    if (file && file.type === 'application/pdf') {
      const fileURL = URL.createObjectURL(file);
      setPdfUrl(fileURL);
      uploadToAPI(file);
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
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">PDFファイルのアップロード＆表示</h2>

      {/* ドラッグ＆ドロップエリア */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="mb-4 border-2 border-dashed border-gray-400 rounded-lg h-32 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
      >
        ここにPDFをドラッグ＆ドロップ
      </div>

      {/* 通常のinput */}
      <input type="file" accept="application/pdf" onChange={handleFileChange} className="mb-4" />

      {/* アップロードステータス */}
      {uploadStatus && <p className="text-sm text-gray-700 mb-2">{uploadStatus}</p>}

      {/* PDF表示 */}
      {pdfUrl && (
        <div className="mt-4 border rounded shadow overflow-hidden" style={{ height: '600px' }}>
          <iframe
            src={pdfUrl}
            title="PDF Viewer"
            width="100%"
            height="100%"
          />
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
