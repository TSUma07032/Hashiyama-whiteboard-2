// vite-app/src/components/ContextMenu.tsx
type ContextMenuProps = {
    top: number;
    left: number;
    onDelete: () => void;
    onClose: () => void;
};

export default function ContextMenu({ 
    top, left, onDelete, onClose 
}: ContextMenuProps) {
    return (
        <div 
            style={{ top, left, position: 'fixed' , zIndex: 9999}} 
            className="context-menu-container"
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={onClose} 
        >
            <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-1 w-32 animate-in fade-in zoom-in duration-200">
                
                <button 
                    className="w-full text-left text-xs px-3 py-2 text-red-600 hover:bg-red-50 rounded flex items-center gap-2 font-bold"
                    onClick={(e) => {
                        e.stopPropagation(); // 親のイベントを止める
                        onDelete();
                    }}
                >
                    🗑️ 削除
                </button>

                <div className="h-px bg-gray-100 my-1"></div>

                <button 
                    className="w-full text-left text-xs px-3 py-2 text-gray-500 hover:bg-gray-50 rounded"
                    onClick={onClose}
                >
                    閉じる
                </button>
            </div>
        </div>
    );
}