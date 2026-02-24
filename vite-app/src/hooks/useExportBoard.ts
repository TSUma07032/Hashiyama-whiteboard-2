// src/hooks/useExportBoard.ts
import { useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { NoteData } from '@/types';

type UseExportBoardProps = {
    contentRef: React.RefObject<HTMLDivElement | null>;
    notes: NoteData[];
};

export const useExportBoard = ({ contentRef, notes }: UseExportBoardProps) => {
    const exportToPdf = useCallback(async () => {
        // ノードが1個もないときは何もしない
        if (!contentRef.current || notes.length === 0) {
            alert("付箋がひとつもないぞ、ざぁこ♡"); // そのまま残しましたw
            return;
        }

        const originalCursor = document.body.style.cursor;
        document.body.style.cursor = 'wait'; // 処理中カーソル

        try {
            console.log("📸 全体保存プロセス開始！");

            // 1. 全ノートの座標から、全体の「バウンディングボックス」を計算
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            notes.forEach(note => {
                const nWidth = note.width || 200;
                const nHeight = note.height || 100;
                const nRight = note.x + nWidth;
                const nBottom = note.y + nHeight;
                
                if (note.x < minX) minX = note.x;
                if (note.y < minY) minY = note.y;
                if (nRight > maxX) maxX = nRight;
                if (nBottom > maxY) maxY = nBottom;
            });

            // 余白（パディング）
            const PADDING = 50;
            minX -= PADDING;
            minY -= PADDING;
            maxX += PADDING;
            maxY += PADDING;

            const totalWidth = maxX - minX;
            const totalHeight = maxY - minY;

            console.log(`全体サイズ: ${totalWidth} x ${totalHeight} (origin: ${minX}, ${minY})`);

            // 2. html2canvas で「影分身」を作って撮影！
            const canvas = await html2canvas(contentRef.current, {
                useCORS: true,
                scale: 2, // 高画質
                
                // キャプチャサイズを全コンテンツに合わせる
                width: totalWidth,
                height: totalHeight,
                windowWidth: totalWidth,
                windowHeight: totalHeight,
                x: 0, 
                y: 0, // ここは0でOK（oncloneでずらすから）
                
                // ▼ 影分身（クローン）を整形する魔術 ▼
                onclone: (clonedDoc) => {
                    const clonedWrapper = clonedDoc.getElementById('print-target');
                    if (!clonedWrapper) return;
                    
                    // A. ラッパーの枠を広げる
                    clonedWrapper.style.width = `${totalWidth}px`;
                    clonedWrapper.style.height = `${totalHeight}px`;
                    clonedWrapper.style.overflow = 'visible';
                    clonedWrapper.style.position = 'relative';

                    // B. 中身の位置を補正して (0,0) に持ってくる！
                    const transformContainer = clonedWrapper.querySelector('.react-flow__viewport') as HTMLElement;
                    
                    if (transformContainer) {
                        // 今のズームを無視(scale1)して、位置だけズラす！
                        transformContainer.style.transform = `translate(${-minX}px, ${-minY}px) scale(1)`;
                        transformContainer.style.transformOrigin = 'top left';
                        
                        console.log("✅ クローンの位置補正完了！");
                    } else {
                        console.warn("⚠️ viewportが見つからなかったかも？");
                    }
                }
            });

            // 3. PDF生成
            const imgData = canvas.toDataURL('image/png');
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            
            // 縦長か横長か判定
            const orientation = imgWidth > imgHeight ? 'l' : 'p';
            
            // 画像サイズそのままのPDFを作成（単位: px）
            const pdf = new jsPDF(orientation, 'px', [imgWidth / 2, imgHeight / 2]);
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
            pdf.save(`whiteboard-review-${new Date().toISOString().slice(0,10)}.pdf`);
            
            console.log("🎉 PDF保存成功！");

        } catch (error) {
            console.error('PDF生成失敗:', error);
            alert('PDF保存に失敗しちゃった...😭');
        } finally {
            document.body.style.cursor = originalCursor;
        }
    }, [contentRef, notes]);

    return { exportToPdf };
};