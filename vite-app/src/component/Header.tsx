// Header.tsx

/**
 * @filename Header.tsx
 * @fileoverview Headerコンポーネントは、アプリケーションのヘッダーメニューを表示します。
 * @author 守屋翼
 */

type HeaderProps = {
    className?: string; // classNameを受け取れるようにする
    dataNoPan?: boolean; // data-no-pan属性を受け取れるようにする
    onPrint: () => void;
    onDeleteAll: () => void;
};
export default function Header({ className, dataNoPan, onPrint, onDeleteAll }: HeaderProps) {
    return (
        <header className={`w-full bg-gray-800 text-white p-4 shadow-md flex items-center justify-between ${className || ''}`} data-no-pan={dataNoPan ? 'true' : undefined}>
            
            <div className="font-bold text-xl tracking-wider">
                My Awesome Board 🚀
            </div>

            <div className="flex gap-4">
                {/* ▼▼▼ PDF出力ボタン ▼▼▼ */}
                <button 
                    onClick={onPrint}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition flex items-center gap-2"
                >
                    <span>🖨️</span> PDF保存
                </button>

                {/* ▼▼▼ 全削除ボタン（赤色で警告！） ▼▼▼ */}
                <button 
                    onClick={onDeleteAll}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition flex items-center gap-2"
                >
                    <span>💣</span> 全削除
                </button>
            </div>
        </header>
    );
}