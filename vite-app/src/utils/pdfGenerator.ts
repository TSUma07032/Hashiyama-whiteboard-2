import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { getNodesBounds, type Node } from 'reactflow';

// A4サイズの定義 (mm単位)
const PDF_WIDTH_MM = 210;
//const PDF_HEIGHT_MM = 297;

// 🔥 安全装置1：一度に画像化する最大高さ（px）
const MAX_SLICE_HEIGHT_PX = 3000; 

// 🔥 安全装置2：ブラウザが処理できる最大横幅（px）
// 一般的なGPU制限(16384px)より少し余裕を持って設定
const MAX_CANVAS_WIDTH_PX = 8000;

// 出力する画像の横幅（px）
const OUTPUT_IMAGE_WIDTH_PX = 2000;

export const downloadBoardAsPdf = async (nodes: Node[]) => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    
    if (!viewport || nodes.length === 0) {
        alert('ノードがないか、画面が見つからないよ🥺');
        return;
    }

    try {
        const bounds = getNodesBounds(nodes);
        const boardWidthPx = bounds.width;
        const boardHeightPx = bounds.height;

        console.log(`ボードサイズ計測: 横${Math.round(boardWidthPx)}px / 縦${Math.round(boardHeightPx)}px`);

        // ✨ ここが新機能！「縮小スケール」の計算 ✨
        // 横幅が15000pxを超えてたら、0.5倍とかに縮小して、限界内に収める！
        // これでEncodingErrorを回避！
        let safeScale = 1;
        if (boardWidthPx > MAX_CANVAS_WIDTH_PX) {
            safeScale = MAX_CANVAS_WIDTH_PX / boardWidthPx;
            console.log(`⚠️ 横幅がデカすぎるので ${safeScale.toFixed(2)}倍 に縮小して撮影します`);
        }

        // 縮小後の「見かけ上のサイズ」
        const effectiveWidth = boardWidthPx * safeScale;
        const effectiveHeight = boardHeightPx * safeScale;

        // ページ数を計算（縮小後の高さで計算！）
        // (safeScaleをかけた高さ ÷ 安全スライス高さ)
        const totalPages = Math.ceil(effectiveHeight / MAX_SLICE_HEIGHT_PX);
        
        console.log(`PDF生成開始: 全${totalPages}ページ / 有効サイズ: ${Math.round(effectiveWidth)}x${Math.round(effectiveHeight)}`);

        const pdf = new jsPDF('p', 'mm', 'a4');

        for (let i = 0; i < totalPages; i++) {
            // 今処理するスライスの高さ（縮小後の世界での高さ）
            const currentSliceHeight = Math.min(
                MAX_SLICE_HEIGHT_PX, 
                effectiveHeight - (i * MAX_SLICE_HEIGHT_PX)
            );
            
            // 元の座標系でのYオフセット（縮小前の世界）
            // i * MAX_SLICE_HEIGHT_PX は縮小後の距離なので、scaleで割って元に戻す
            const yOffsetOriginal = bounds.y + (i * MAX_SLICE_HEIGHT_PX / safeScale);

            // 出力サイズ計算
            const outputImageHeightPx = currentSliceHeight * (OUTPUT_IMAGE_WIDTH_PX / effectiveWidth);

            console.log(`📸 撮影中 (${i + 1}/${totalPages}): 高さ${currentSliceHeight}px`);

            const dataUrl = await toPng(viewport, {
                backgroundColor: '#ffffff',
                // ▼ canvasのサイズは「縮小後のサイズ」を指定
                width: effectiveWidth,     
                height: currentSliceHeight, 
                
                // ▼ 最終出力（PNG）のサイズ
                canvasWidth: OUTPUT_IMAGE_WIDTH_PX,
                canvasHeight: outputImageHeightPx,
                
                style: {
                    // ここが魔法！「縮小(scale)」と「移動(translate)」を同時にかける！
                    // scaleが先かtranslateが先か注意。CSS transformは左から適用されるイメージ。
                    // scale(s) してから translate(...) すると、translateの距離もs倍される仕様を利用。
                    transform: `scale(${safeScale}) translate(${-bounds.x}px, ${-yOffsetOriginal}px)`,
                    transformOrigin: 'top left',
                    
                    // viewport自体のサイズは変えない（変えるとレイアウト崩れるかもなので）
                    width: `${boardWidthPx}px`,
                    height: `${boardHeightPx}px`,
                },
                skipAutoScale: true,
                cacheBust: true, 
            });

            if (i > 0) pdf.addPage();

            // PDFに追加
            const pdfImgHeightMm = outputImageHeightPx * (PDF_WIDTH_MM / OUTPUT_IMAGE_WIDTH_PX);
            pdf.addImage(dataUrl, 'PNG', 0, 0, PDF_WIDTH_MM, pdfImgHeightMm);
        }

        pdf.save('whiteboard-export.pdf');
        console.log('✅ PDF生成完了！優勝！');

    } catch (error) {
        console.error('PDF生成失敗:', error);
        alert('PDF化に失敗しちゃった...😭');
    }
};