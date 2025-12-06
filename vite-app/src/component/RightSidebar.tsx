// RightSidebar.tsx
import type { NoteData} from './index.d'; 
import { useState } from 'react';
import clsx from 'clsx';
import '../styles/RightSidebar.css';

/**
 * @filename RightSidebar.tsx
 * @fileoverview RightSidebarコンポーネントは、右側の情報パネルを表示します。
 * @author 守屋翼
 */
type RightSidebarProps = {
    className?: string;
    notes: NoteData[];
    onAddReply: (noteId: string, replyText: string) => void;
    onToggleReadStatus: (noteId: string) => void;
    onJump: (id: string) => void;
};

// サイドバーの中だけで使う、返信入力用のミニコンポーネント
const ReplyInput = ({ onAddReply, onCancel }: { onAddReply: (text: string) => void, onCancel: () => void }) => {
    const [text, setText] = useState('');
    const handleSubmit = () => {
        if (text.trim()) {
            onAddReply(text);
            setText('');
        }
    };
    return (
        <div className="reply-form">
            <textarea
                className="reply-textarea"
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="返信を入力..."
            />
            <div className="reply-form-actions">
                <button onClick={onCancel} className="cancel-button">キャンセル</button>
                <button onClick={handleSubmit} className="submit-button">送信</button>
            </div>
        </div>
    );
};

export default function RightSidebar({ className, notes, onAddReply, onToggleReadStatus, onJump }: RightSidebarProps) {

    const [activeTab, setActiveTab] = useState<'question' | 'comment'>('question');
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const pdfNotes = notes.filter(n => n.type === 'pdf' && n.page_index === 1);

    const filteredNotes = notes.filter(note => {
        if (activeTab === 'question') {
            return note.color === 'b'; // 青の付箋（質問）
        } else {
            return note.color === 'r'; // 赤の付箋（コメント）
        }
    });

    return (
        <aside className={`w-full bg-gray-100 p-2 shadow-lg rounded-l-lg flex flex-col ${className || ''}`}>

            <h3 className="font-bold text-gray-700 mb-4">📑 資料目次</h3>
            
            <div className="flex flex-col gap-2">
                {pdfNotes.length === 0 && <p className="text-gray-400 text-sm">資料がありません</p>}
                
                {pdfNotes.map((note, index) => (
                    <button
                        key={note.id}
                        onClick={() => onJump(note.id)}
                        className="text-left p-3 bg-white border border-gray-200 rounded shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-colors flex items-center gap-2"
                    >
                        <span className="text-lg">📄</span>
                        <div className="flex-1 min-w-0">
                            {/* ファイル名とかがあればいいけど、今は text か index で代用 */}
                            <p className="text-sm font-bold truncate">資料 {index + 1}</p>
                            <p className="text-xs text-gray-500">Page 1</p>
                        </div>
                    </button>
                ))}
            </div>
            
            <div className="flex border-b-2">
                <button
                    onClick={() => setActiveTab('question')}
                    className={clsx('flex-1 py-2 text-sm font-bold', activeTab === 'question' ? 'bg-blue-100 text-blue-700' : 'text-gray-500')}
                >
                    質疑応答
                </button>
                <button
                    onClick={() => setActiveTab('comment')}
                    className={clsx('flex-1 py-2 text-sm font-bold', activeTab === 'comment' ? 'bg-red-100 text-red-700' : 'text-gray-500')}
                >
                    コメント
                </button>
            </div>

            <div className="sidebar-list-container">
                {filteredNotes.length > 0 ? (
                    <ul className="sidebar-list">
                        {filteredNotes.map(note => (
                            <li key={note.id} className={clsx('note-item', { 'is-read': note.isRead })}>
                                <div className="note-item-header">
                                    <div
                                        className="checkbox"
                                        onClick={() => onToggleReadStatus(note.id)}
                                    >
                                        {note.isRead ? '✅' : '⬜️'}
                                    </div>
                                    <p className="note-text">{note.text}</p>
                                </div>

                                <div className="replies-section">
                                    {note.replies?.map(reply => (
                                        <div key={reply.id} className="reply-item">
                                            {reply.text}
                                        </div>
                                    ))}
                                    
                                    {/* ↓↓↓ 返信フォームの表示ロジックを書き換え！ ↓↓↓ */}
                                    {replyingToId === note.id ? (
                                        <ReplyInput 
                                            onAddReply={(text) => {
                                                onAddReply(note.id, text);
                                                setReplyingToId(null); // 送信したらフォームを閉じる
                                            }}
                                            onCancel={() => setReplyingToId(null)} // キャンセルボタンでフォームを閉じる
                                        />
                                    ) : (
                                        <button 
                                            className="reply-button"
                                            onClick={() => setReplyingToId(note.id)}
                                        >
                                            返信する
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center text-gray-500 mt-8">
                        <p>該当する付箋はありません</p>
                    </div>
                )}
            </div>
        </aside>
    );
}