import React, { useState } from 'react';
import type { NoteData} from './index.d'; 
import clsx from 'clsx';
import '../styles/RightSidebar.css';
import '../styles/Note.css'; // 共通スタイル

type RightSidebarProps = {
    className?: string;
    notes: NoteData[];
    onAddReply: (noteId: string, replyText: string) => void;
    onToggleReadStatus: (noteId: string) => void;
    onJump: (noteId: string) => void; 
};

// ▼▼▼ 入力フォーム (チャット風・常駐用) ▼▼▼
const ReplyInput = ({ onAddReply }: { onAddReply: (text: string) => void }) => {
    const [text, setText] = useState('');
    
    const handleSubmit = () => {
        if (text.trim()) {
            onAddReply(text);
            setText('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="mt-2 relative">
            <input
                type="text"
                className="w-full text-xs p-2 pr-8 border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition-colors"
                placeholder="返信を書き込む..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button 
                onClick={handleSubmit}
                disabled={!text.trim()}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center text-blue-500 hover:bg-blue-100 rounded-full transition-colors disabled:text-gray-300 disabled:hover:bg-transparent"
            >
                ➤
            </button>
        </div>
    );
};

export default function RightSidebar({ className, notes, onAddReply, onToggleReadStatus, onJump }: RightSidebarProps) {

    const [activeTab, setActiveTab] = useState<'index' | 'question' | 'comment'>('index');

    // フィルタリング
    const pdfNotes = notes.filter(n => n.type === 'pdf' && n.page_index === 1).sort((a, b) => a.y - b.y);
    const questionNotes = notes.filter(n => n.color === 'b');
    const commentNotes = notes.filter(n => n.color === 'r');

    const displayNotes = activeTab === 'question' ? questionNotes : activeTab === 'comment' ? commentNotes : [];

    return (
        <aside className={`w-full h-full bg-transparent p-2 flex flex-col overflow-y-auto ${className || ''}`}>
            
            {/* タブ */}
            <div className="flex border-b border-gray-300 mb-2 shrink-0">
                <button
                    onClick={() => setActiveTab('index')}
                    className={clsx('flex-1 py-2 text-xs font-bold transition-colors border-b-2', activeTab === 'index' ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600')}
                >
                    資料
                </button>
                <button
                    onClick={() => setActiveTab('question')}
                    className={clsx('flex-1 py-2 text-xs font-bold transition-colors border-b-2', activeTab === 'question' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600')}
                >
                    質疑
                </button>
                <button
                    onClick={() => setActiveTab('comment')}
                    className={clsx('flex-1 py-2 text-xs font-bold transition-colors border-b-2', activeTab === 'comment' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600')}
                >
                    コメ
                </button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto min-h-0">
                
                {/* 1. 資料タブ */}
                {activeTab === 'index' && (
                    <div className="flex flex-col gap-2 p-1">
                        {pdfNotes.length === 0 && <p className="text-gray-400 text-xs text-center mt-4">資料がありません</p>}
                        {pdfNotes.map((note, index) => (
                            <button
                                key={note.id}
                                onClick={() => onJump(note.id)}
                                className="text-left p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center gap-3 group"
                            >
                                <span className="text-xl group-hover:scale-110 transition-transform">📄</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-700 truncate">資料 {index + 1}</p>
                                    <p className="text-xs text-gray-400">Page 1</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* 2. 質疑・コメタブ */}
                {activeTab !== 'index' && (
                    displayNotes.length > 0 ? (
                        <ul className="sidebar-list flex flex-col gap-2">
                            {displayNotes.map(note => (
                                <li key={note.id} className={clsx('note-item p-3 rounded border bg-white shadow-sm', { 'opacity-60': note.isRead })}>
                                    
                                    {/* ヘッダー */}
                                    <div className="note-item-header flex items-start gap-3 mb-2">
                                        
                                        {/* ▼▼▼ アイコン (styleでサイズ強制！) ▼▼▼ */}
                                        <div className="flex-shrink-0">
                                            {note.icon ? (
                                                <img 
                                                    src={note.icon} 
                                                    alt="user" 
                                                    className="rounded-full border border-gray-200 object-cover"
                                                    style={{ width: '20px', height: '20px', minWidth: '20px' }} // ◀◀◀ これで絶対小さくなる！
                                                />
                                            ) : (
                                                <div 
                                                    className="rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500"
                                                    style={{ width: '20px', height: '20px', minWidth: '20px' }} // ◀◀◀ こっちも！
                                                >
                                                    ?
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 pt-0.5">
                                            {/* チェックボックス (配置修正) */}
                                            <button
                                                onClick={() => onToggleReadStatus(note.id)}
                                                className={clsx('check-btn float-right ml-2', note.isRead ? 'checked' : 'unchecked')}
                                                style={{ position: 'static', transform: 'none', width: '16px', height: '16px', fontSize: '10px' }}
                                                title={note.isRead ? "未完了に戻す" : "完了にする"}
                                            >
                                                {note.isRead && '✓'}
                                            </button>
                                            
                                            <p className="note-text text-sm text-gray-800 break-words leading-tight">{note.text}</p>
                                        </div>
                                    </div>

                                    {/* 返信エリア */}
                                    <div className="replies-section pl-4 border-l-2 border-gray-100 ml-2 mt-2">
                                        {note.replies?.map(reply => (
                                            <div key={reply.id} className="reply-item text-xs text-gray-600 mb-1 bg-gray-50 p-2 rounded break-words flex gap-2 items-start">
                                                
                                                {/* ▼▼▼ 返信アイコン (ここもサイズ強制！) ▼▼▼ */}
                                                <div className="flex-shrink-0">
                                                    {reply.icon ? (
                                                        <img 
                                                            src={reply.icon} 
                                                            alt="user" 
                                                            className="rounded-full border border-gray-100 object-cover"
                                                            style={{ width: '16px', height: '16px', minWidth: '16px' }} // ◀◀◀ 激小！
                                                        />
                                                    ) : (
                                                        <div 
                                                            className="rounded-full bg-gray-200 flex-shrink-0" 
                                                            style={{ width: '16px', height: '16px', minWidth: '16px' }}
                                                        />
                                                    )}
                                                </div>
                                                
                                                <span className="flex-1 pt-0.5">{reply.text}</span>
                                            </div>
                                        ))}
                                        
                                        {/* ▼▼▼ 常時表示の入力フォーム (復活！) ▼▼▼ */}
                                        <ReplyInput onAddReply={(text) => onAddReply(note.id, text)} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center text-gray-500 mt-8 text-sm">
                            <p>該当する付箋はありません</p>
                        </div>
                    )
                )}
            </div>
        </aside>
    );
}