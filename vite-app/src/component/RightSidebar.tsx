import React, { useState } from 'react';
import type { NoteData, AgendaItem } from './index.d'; // AgendaItemをインポート
import clsx from 'clsx';
import '../styles/RightSidebar.css';
import '../styles/Note.css';

type RightSidebarProps = {
    className?: string;
    notes: NoteData[];
    onAddReply: (noteId: string, replyText: string) => void;
    onToggleReadStatus: (noteId: string) => void;
    onJump: (noteId: string) => void;
    
    // ▼▼▼ 追加！アジェンダ関連のProps ▼▼▼
    agendaList?: AgendaItem[];
    onUpdateAgenda?: (newAgenda: AgendaItem[]) => void;
};

// ... (ReplyInput はそのまま) ...
const ReplyInput = ({ onAddReply }: { onAddReply: (text: string) => void }) => {
    const [text, setText] = useState('');
    const handleSubmit = () => {
        if (text.trim()) { onAddReply(text); setText(''); }
    };
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    };
    return (
        <div className="mt-2 relative">
            <input type="text" className="w-full text-xs p-2 pr-8 border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition-colors" placeholder="返信..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={handleKeyDown} />
            <button onClick={handleSubmit} disabled={!text.trim()} className="absolute right-1 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center text-blue-500 hover:bg-blue-100 rounded-full transition-colors disabled:text-gray-300 disabled:hover:bg-transparent">➤</button>
        </div>
    );
};

export default function RightSidebar({ 
    className, notes, onAddReply, onToggleReadStatus, onJump,
    agendaList = [], onUpdateAgenda 
}: RightSidebarProps) {

    const [activeTab, setActiveTab] = useState<'index' | 'question' | 'comment'>('index');

    // ▼▼▼ 編集用のState ▼▼▼
    const [editingId, setEditingId] = useState<string | null>(null); // 編集中のID
    const [editPresenter, setEditPresenter] = useState('');
    const [editFg, setEditFg] = useState('');
    const [editTime, setEditTime] = useState('');

    // 新規登録用State
    const [newPresenter, setNewPresenter] = useState('');
    const [newFg, setNewFg] = useState('');
    const [newTime, setNewTime] = useState('10');

    // 新規追加
    const handleAddAgenda = () => {
        if (!newPresenter || !onUpdateAgenda) return;
        const newItem: AgendaItem = {
            id: Date.now().toString(),
            presenter: newPresenter,
            fg: newFg || '募集中',
            timeMinutes: parseInt(newTime) || 10,
        };
        onUpdateAgenda([...agendaList, newItem]);
        setNewPresenter(''); setNewFg('');
    };

    // 削除
    const handleDeleteAgenda = (id: string) => {
        if (!onUpdateAgenda) return;
        onUpdateAgenda(agendaList.filter(item => item.id !== id));
    };

    // ▼▼▼ 編集開始 ▼▼▼
    const startEditing = (item: AgendaItem) => {
        setEditingId(item.id);
        setEditPresenter(item.presenter);
        setEditFg(item.fg);
        setEditTime(item.timeMinutes.toString());
    };

    // ▼▼▼ 編集保存 ▼▼▼
    const saveEditing = () => {
        if (!onUpdateAgenda || !editingId) return;
        const updatedList = agendaList.map(item => {
            if (item.id === editingId) {
                return {
                    ...item,
                    presenter: editPresenter,
                    fg: editFg,
                    timeMinutes: parseInt(editTime) || item.timeMinutes
                };
            }
            return item;
        });
        onUpdateAgenda(updatedList);
        setEditingId(null); // 編集終了
    };

    // フィルタリング (既存)
    const pdfNotes = notes.filter(n => n.type === 'pdf' && n.page_index === 1).sort((a, b) => a.y - b.y);
    const displayNotes = notes.filter(note => {
        if (activeTab === 'question') return note.color === 'b';
        if (activeTab === 'comment') return note.color === 'r';
        return false;
    });

    return (
        <aside className={`w-full h-full bg-transparent p-2 flex flex-col overflow-y-auto ${className || ''}`}>
            
            {/* タブ */}
            <div className="flex border-b border-gray-300 mb-2 shrink-0">
                <button onClick={() => setActiveTab('index')} className={clsx('flex-1 py-2 text-xs font-bold transition-colors border-b-2', activeTab === 'index' ? 'border-gray-800 text-gray-800' : 'border-transparent text-gray-400 hover:text-gray-600')}>資料/進行</button>
                <button onClick={() => setActiveTab('question')} className={clsx('flex-1 py-2 text-xs font-bold transition-colors border-b-2', activeTab === 'question' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600')}>質疑</button>
                <button onClick={() => setActiveTab('comment')} className={clsx('flex-1 py-2 text-xs font-bold transition-colors border-b-2', activeTab === 'comment' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600')}>コメ</button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
                {activeTab === 'index' && (
                    <div className="flex flex-col gap-4 p-1">
                        
                        {/* ▼▼▼ アジェンダ登録フォーム ▼▼▼ */}
                        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">新規登録</h3>
                            <div className="flex flex-col gap-2">
                                <input type="text" placeholder="発表者" className="text-xs p-2 border rounded bg-gray-50" value={newPresenter} onChange={e => setNewPresenter(e.target.value)} />
                                <div className="flex gap-2">
                                    <input type="text" placeholder="FG" className="text-xs p-2 border rounded bg-gray-50 flex-1" value={newFg} onChange={e => setNewFg(e.target.value)} />
                                    <input type="number" placeholder="分" className="text-xs p-2 border rounded bg-gray-50 w-12 text-center" value={newTime} onChange={e => setNewTime(e.target.value)} />
                                </div>
                                <button onClick={handleAddAgenda} className="text-xs bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700 font-bold transition-colors">＋ 追加</button>
                            </div>
                        </div>

                        {/* ▼▼▼ 登録済みリスト (編集機能付き) ▼▼▼ */}
                        {agendaList.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <h3 className="text-xs font-bold text-gray-500 px-1">進行表</h3>
                                {agendaList.map((item, index) => (
                                    <div key={item.id} className="relative bg-white border border-gray-200 rounded-lg shadow-sm p-2 hover:shadow-md transition-shadow">
                                        
                                        {/* 編集モード */}
                                        {editingId === item.id ? (
                                            <div className="flex flex-col gap-2">
                                                <input type="text" className="text-xs p-1 border rounded" value={editPresenter} onChange={e => setEditPresenter(e.target.value)} autoFocus />
                                                <div className="flex gap-2">
                                                    <input type="text" className="text-xs p-1 border rounded flex-1" value={editFg} onChange={e => setEditFg(e.target.value)} />
                                                    <input type="number" className="text-xs p-1 border rounded w-10 text-center" value={editTime} onChange={e => setEditTime(e.target.value)} />
                                                </div>
                                                <div className="flex justify-end gap-2 mt-1">
                                                    <button onClick={saveEditing} className="text-xs bg-green-500 text-white px-2 py-1 rounded">保存</button>
                                                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">キャンセル</button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 表示モード */
                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-xs flex-shrink-0">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-sm text-gray-800 truncate">{item.presenter}</span>
                                                        <div className="text-xs text-gray-500 flex gap-2">
                                                            <span className="bg-gray-100 px-1 rounded">FG: {item.fg}</span>
                                                            <span>⏱ {item.timeMinutes}分</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* 操作ボタン (ホバーで表示) */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEditing(item)} className="p-1 text-gray-400 hover:text-blue-500" title="編集">✏️</button>
                                                    <button onClick={() => handleDeleteAgenda(item.id)} className="p-1 text-gray-400 hover:text-red-500" title="削除">🗑️</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <hr className="border-gray-200" />
                        
                        {/* 資料一覧 */}
                        <h3 className="text-xs font-bold text-gray-500 px-1">資料一覧</h3>
                        {pdfNotes.length === 0 && <p className="text-gray-400 text-xs text-center">資料がありません</p>}
                        {pdfNotes.map((note, index) => (
                            <button key={note.id} onClick={() => onJump(note.id)} className="text-left p-2 bg-white border border-gray-200 rounded hover:bg-blue-50 transition-colors flex items-center gap-2">
                                <span className="text-lg">📄</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate">資料 {index + 1}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                {/* ... (他タブはそのまま) ... */}
                {activeTab !== 'index' && displayNotes.length > 0 && (
                    /* ... 既存のリスト表示 ... */
                    <ul className="sidebar-list flex flex-col gap-2">
                        {displayNotes.map(note => (
                            <li key={note.id} className={clsx('note-item p-3 rounded border bg-white shadow-sm', { 'opacity-60': note.isRead })}>
                                <div className="note-item-header flex items-start gap-3 mb-2">
                                    <div className="flex-shrink-0">
                                        {note.icon ? <img src={note.icon} alt="user" className="rounded-full border border-gray-200 object-cover" style={{ width: '20px', height: '20px', minWidth: '20px' }} /> : <div className="rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500" style={{ width: '20px', height: '20px', minWidth: '20px' }}>?</div>}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <button onClick={() => onToggleReadStatus(note.id)} className={clsx('check-btn float-right ml-2', note.isRead ? 'checked' : 'unchecked')} style={{ position: 'static', transform: 'none', width: '16px', height: '16px', fontSize: '10px' }} title={note.isRead ? "未完了に戻す" : "完了にする"}>{note.isRead && '✓'}</button>
                                        <p className="note-text text-sm text-gray-800 break-words leading-tight">{note.text}</p>
                                    </div>
                                </div>
                                <div className="replies-section pl-4 border-l-2 border-gray-100 ml-2 mt-2">
                                    {note.replies?.map(reply => (
                                        <div key={reply.id} className="reply-item text-xs text-gray-600 mb-1 bg-gray-50 p-2 rounded break-words flex gap-2 items-start">
                                            <div className="flex-shrink-0">
                                                {reply.icon ? <img src={reply.icon} alt="user" className="rounded-full border border-gray-100 object-cover" style={{ width: '16px', height: '16px', minWidth: '16px' }} /> : <div className="rounded-full bg-gray-200 flex-shrink-0" style={{ width: '16px', height: '16px', minWidth: '16px' }} />}
                                            </div>
                                            <span className="flex-1 pt-0.5">{reply.text}</span>
                                        </div>
                                    ))}
                                    <ReplyInput onAddReply={(text) => onAddReply(note.id, text)} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {activeTab !== 'index' && displayNotes.length === 0 && (
                    <div className="text-center text-gray-500 mt-8 text-sm"><p>該当する付箋はありません</p></div>
                )}
            </div>
        </aside>
    );
}