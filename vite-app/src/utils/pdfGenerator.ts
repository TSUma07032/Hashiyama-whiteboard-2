import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { NoteData } from '../types';

/**
 * ボード全体をPDF化してダウンロードする関数
 * @param contentElement キャプチャ対象のDOM要素
 * @param notes 全ノートデータ（座標計算用）
 */
export const downloadBoardAsPdf = async (
    contentElement: HTMLElement | null,
    notes: NoteData[]
) => {
    if (!contentElement || notes.length === 0) {
        alert("付箋がひとつもないぞ、ざぁこ♡");
        return;
    }

    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'wait';

    try {
        // 1. 全体の「バウンディングボックス」を計算
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        notes.forEach(note => {
            const nWidth = note.width || 200;
            const nHeight = note.height || 100;
            if (note.x < minX) minX = note.x;
            if (note.y < minY) minY = note.y;
            if ((note.x + nWidth) > maxX) maxX = note.x + nWidth;
            if ((note.y + nHeight) > maxY) maxY = note.y + nHeight;
        });

        const PADDING = 50;
        minX -= PADDING;
        minY -= PADDING;
        maxX += PADDING;
        maxY += PADDING;

        const totalWidth = maxX - minX;
        const totalHeight = maxY - minY;

        // 2. html2canvas で撮影
        const canvas = await html2canvas(contentElement, {
            useCORS: true,
            scale: 2,
            width: totalWidth,
            height: totalHeight,
            windowWidth: totalWidth,
            windowHeight: totalHeight,
            x: 0,
            y: 0,
            onclone: (clonedDoc) => {
                const clonedWrapper = clonedDoc.getElementById('print-target');
                if (!clonedWrapper) return;
                
                clonedWrapper.style.width = `${totalWidth}px`;
                clonedWrapper.style.height = `${totalHeight}px`;
                clonedWrapper.style.overflow = 'visible';
                clonedWrapper.style.position = 'relative';

                const transformContainer = clonedWrapper.querySelector('div[style*="transform"]');
                if (transformContainer instanceof HTMLElement) {
                    transformContainer.style.transform = `translate(${-minX}px, ${-minY}px) scale(1)`;
                    transformContainer.style.transformOrigin = 'top left';
                }
            }
        });

        // 3. PDF生成
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const orientation = imgWidth > imgHeight ? 'l' : 'p';
        
        const pdf = new jsPDF(orientation, 'px', [imgWidth / 2, imgHeight / 2]);
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / 2, imgHeight / 2);
        pdf.save('hashiyamaboard.pdf');

    } catch (error) {
        console.error('PDF生成失敗:', error);
        alert('PDF保存に失敗した');
    } finally {
        document.body.style.cursor = originalCursor;
    }
};