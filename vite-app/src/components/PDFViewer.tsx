// src/components/PDFViewer.tsx
import React, { useState, useMemo} from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useStorage } from '@/hooks/useStorage'; // フックをインポート
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// ▼ 作ったCSSをインポート！
import '@/styles/PDFViewer.css';

// Worker設定 (これはファイルの外でもOK)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type PDFViewerProps = {
    onAddPdfNote: (url: string, pageNumber: number) => void;
    onAddAllPages: (url: string, numPages: number) => void;
};

export default function PDFViewer({ onAddPdfNote, onAddAllPages }: PDFViewerProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);

    // フックを使う！
    const { uploadFile} = useStorage();

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    // アップロード処理がこんなにシンプルに！
    const handleUpload = async (file: File) => {
        // PDFは 'pdfs' フォルダに入れたい場合
        const publicUrl = await uploadFile(file, 'uploads', 'pdfs');
        
        if (publicUrl) {
            setPdfUrl(publicUrl);
        }
    };

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            handleUpload(file);
        } else if (file) {
            alert('PDFファイルを選択してください。');
        }
    };

    const pdfOptions = useMemo(() => ({
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
    }), []); // [] は「最初の一回だけ作るよ」って意味

    return (
        <div className="pdf-viewer-container">
            <h2 className="pdf-viewer-title">PDFを選択してね📄</h2>
            <input 
                type="file" 
                accept="application/pdf" 
                onChange={onFileChange} 
                className="pdf-file-input" 
            />

            {pdfUrl && (
                <>
                    <div className="pdf-controls">
                        <button 
                            onClick={() => numPages && onAddAllPages(pdfUrl!, numPages)}
                            className="pdf-action-button"
                        >
                            全ページを一括展開 ({numPages}ページ)
                        </button>
                    </div>

                    <Document 
                        file={pdfUrl} 
                        onLoadSuccess={onDocumentLoadSuccess} 
                        options={pdfOptions}>
                        {Array.from(new Array(numPages), (_el, index) => (
                            <div key={`page_${index + 1}`} className="pdf-page-wrapper">
                                <Page pageNumber={index + 1} width={200} />
                                
                                {/* ホバー時に追加ボタンを出す */}
                                <button
                                    onClick={() => onAddPdfNote(pdfUrl!, index + 1)}
                                    className="pdf-overlay-button"
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
}