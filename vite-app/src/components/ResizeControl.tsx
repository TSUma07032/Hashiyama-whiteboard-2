import React from 'react';
import { NodeResizer } from 'reactflow';

type Props = {
    selected: boolean;
    isLocked?: boolean; // ロック機能復活させたい時のため
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