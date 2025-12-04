import React from 'react';
import 'reactflow/dist/style.css'; // React Flowのスタイルをインポート

// URLを検出して <a> タグにするコンポーネント
const LinkifyText = ({ text }: { text: string }) => {
    // 正規表現でURLを探す
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <>
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    return (
                        <a 
                            key={i} 
                            href={part} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline nodrag" // nodrag重要！クリックできるように！
                            onClick={(e) => e.stopPropagation()} // 親のクリックイベントを止める
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </>
    );
};

export default LinkifyText;