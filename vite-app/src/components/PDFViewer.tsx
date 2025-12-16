// src/components/PDFViewer.tsx
import React, { useState, memo } from 'react'; // memoをインポート
import { Document, Page, pdfjs } from 'react-pdf';
import '../styles/Note.css'; // パス修正済みと仮定

// Worker設定 (これはファイルの外でもOK)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type PDFViewerProps = {
    onAddPdfNote: (url: string, pageNumber: number) => void;
    onAddAllPages: (url: string, numPages: number) => void;
};

// コンポーネント定義
const PDFViewer = ({ onAddPdfNote, onAddAllPages }: PDFViewerProps) => {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setFileUrl(url);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    return (
        <div className="pdf-viewer-container" style={{ padding: '20px', background: 'white', borderRadius: '8px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 className="text-lg font-bold mb-4">PDFを選択してね📄</h2>
            <input type="file" accept="application/pdf" onChange={onFileChange} className="mb-4" />

            {fileUrl && (
                <>
                    <div className="flex gap-2 mb-4">
                        <button 
                            onClick={() => numPages && onAddAllPages(fileUrl, numPages)}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            全ページを一括展開 ({numPages}ページ)
                        </button>
                    </div>

                    <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
                        {Array.from(new Array(numPages), (_el, index) => (
                            <div key={`page_${index + 1}`} className="mb-4 border border-gray-200 relative group">
                                <Page pageNumber={index + 1} width={200} />
                                {/* ホバー時に追加ボタンを出す */}
                                <button
                                    onClick={() => onAddPdfNote(fileUrl, index + 1)}
                                    className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity"
                                >
                                    このページを付箋にする
                                </button>
                            </div>
                        ))}
                    </Document>
                </>
            )}
        </div>
    );
};

// ✨ ここが重要！ React.memo で包んでエクスポート！
// これで親コンポーネントが再レンダリングされても、propsが変わらなければ再描画されない！
export default memo(PDFViewer);