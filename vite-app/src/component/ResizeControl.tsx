import React from 'react';
import { NodeResizer } from 'reactflow';

type Props = {
    selected: boolean;
    isLocked?: boolean; // ロック機能復活させたい時のため
};

// 見た目は小さく、判定はデカくする「魔法のハンドル」スタイル
const handleStyle: React.CSSProperties = {
    width: '20px',   // 当たり判定は20px！デカい！
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'transparent', // 透明！
    border: 'none',
    zIndex: 100, // 最前面
    // ↓ ここがミソ！「見た目」はCSSの ::after とかで描くか、
    //    今回は簡易的に「背景画像」とかでやる手もあるが、
    //    一番確実なのは「透明なデカいハンドルの真ん中に、色付きの小さい点を描く」ことだ。
    //    でも NodeResizer の仕様上、styleしか渡せないので、
    //    「当たり判定優先」でデザインは妥協するか、CSSで頑張るかだ！
};

// 今回は「確実に掴める」ことを最優先にして、少しデカめのまま行くぞ！
// ユーザーが慣れたら小さくすればいい。

export const ResizeControl: React.FC<Props> = ({ selected, isLocked }) => {
    if (isLocked) return null;

    return (
        <NodeResizer 
            color="#2563eb" 
            isVisible={selected} 
            minWidth={150} 
            minHeight={100}
            
            // ▼▼▼ ここが最強設定 ▼▼▼
            // nodrag を確実につける！
            handleClassName="nodrag" 
            
            // 当たり判定を大きくする (14px -> 20px)
            // これで「ドラッグ暴発」は激減するはずだ！
            handleStyle={{ 
                width: 20, 
                height: 20, 
                borderRadius: '50%', 
                zIndex: 999, // 圧倒的最前面！
                border: '3px solid white', // 白枠を太くして視認性アップ
                backgroundColor: '#2563eb', // 青色
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)' // 影をつけて浮き上がらせる
            }}
            lineStyle={{ border: '1px solid #2563eb', opacity: 0.5 }}
        />
    );
};