import { toPng } from 'html-to-image';
import { getNodesBounds, type Node } from 'reactflow';

// 🔥 安全装置：ブラウザが処理できる最大ピクセル数（長辺）
// これを超えると EncodingError になるので、このサイズに収まるように縮小する
const MAX_CANVAS_DIMENSION = 4000;

export const downloadBoardAsImage = async (nodes: Node[]) => {
    // 1. 撮影対象（Viewport）を探す
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    
    if (!viewport || nodes.length === 0) {
        alert('ノードがないか、画面が見つからないよ🥺');
        return;
    }

    try {
        // 2. 全体のサイズを計算
        const bounds = getNodesBounds(nodes);
        const width = bounds.width;
        const height = bounds.height;

        console.log(`ボードサイズ: 横${Math.round(width)}px / 縦${Math.round(height)}px`);

        // 3. 縮小率の計算（安全装置）
        // 横か縦、どっちか長い方が MAX_CANVAS_DIMENSION を超えてたら縮小する
        const maxSide = Math.max(width, height);
        let scale = 1;
        
        if (maxSide > MAX_CANVAS_DIMENSION) {
            scale = MAX_CANVAS_DIMENSION / maxSide;
            console.log(`⚠️ デカすぎ！ ${scale.toFixed(2)}倍 に縮小して撮影するね📸`);
        }

        // 4. 画像生成（PNG）
        const dataUrl = await toPng(viewport, {
            backgroundColor: '#ffffff',
            // ▼ ここで「出力サイズ」を制限するのがポイント！
            canvasWidth: width * scale,
            canvasHeight: height * scale,
            
            style: {
                width: `${width}px`,
                height: `${height}px`,
                // 描画位置を補正（左上の余白を消す）
                transform: `translate(${-bounds.x}px, ${-bounds.y}px) scale(1)`,
                transformOrigin: 'top left',
            },
            skipAutoScale: true,
            cacheBust: true,
        });

        // 5. ダウンロード処理 (aタグを作ってクリック)
        const link = document.createElement('a');
        link.download = `whiteboard-review-${new Date().toISOString().slice(0,10)}.png`;
        link.href = dataUrl;
        link.click();
        
        console.log('✅ 保存完了！お疲れ様！');

    } catch (error) {
        console.error('画像保存失敗:', error);
        alert('ごめん、保存に失敗しちゃった...😭');
    }
};