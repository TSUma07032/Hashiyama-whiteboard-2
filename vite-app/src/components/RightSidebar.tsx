// src/components/RightSidebar.tsx
import React, { useState } from 'react'; // Ensure React is imported for JSX runtime
import type { NoteData, AgendaItem } from '@/types';
import { supabase } from './supabaseClient';
import '@/styles/RightSidebar.css';
import '@/styles/Note.css';

type RightSidebarProps = {
    className?: string;
    notes: NoteData[];
    onAddReply: (noteId: string, replyText: string) => void;
    onToggleReadStatus: (noteId: string) => void;
    onJump: (noteId: string) => void;
    agendaList?: AgendaItem[];
    onUpdateAgenda?: (newAgenda: AgendaItem[]) => void;
    currentAgendaId?: string;
};

// サブコンポーネント: 返信入力フォーム
const ReplyInput = ({ onAddReply }: { onAddReply: (text: string) => void }) => {
    const [text, setText] = useState('');
    const handleSubmit = () => {
        if (text.trim()) { onAddReply(text); setText(''); }
    };
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    };
    return (
        <div className="reply-input-wrapper">
            <input 
                type="text" 
                className="reply-input-field" 
                placeholder="返信..." 
                value={text} 
                onChange={(e) => setText(e.target.value)} 
                onKeyDown={handleKeyDown} 
            />
            <button 
                onClick={handleSubmit} 
                disabled={!text.trim()} 
                className="reply-send-btn"
            >
                ➤
            </button>
        </div>
    );
};

export default function RightSidebar({ 
    className, notes, onAddReply, onToggleReadStatus, onJump,
    agendaList = [], currentAgendaId,
}: RightSidebarProps) {

    const [activeTab, setActiveTab] = useState<'index' | 'question' | 'comment'>('index');

    // 編集用State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPresenter, setEditPresenter] = useState('');
    const [editFg, setEditFg] = useState('');
    const [editTime, setEditTime] = useState('');

    // 新規登録用State
    const [newPresenter, setNewPresenter] = useState('');
    const [newFg, setNewFg] = useState('');
    const [newTime, setNewTime] = useState('10:00'); 

    // 新規追加
    const handleAddAgenda = async () => {
        if (!newPresenter) return;
        const newItem = {
            id: crypto.randomUUID(), // ブラウザ標準のUUID生成
            presenter: newPresenter,
            fg: newFg || '募集中',
            end_time: newTime || '12:00', // DBのカラム名はスネークケース(end_time)に注意！
        };
        
        const { error } = await supabase.from('agenda_items').insert(newItem);
        if (error) {
            console.error('追加失敗:', error);
            alert('追加できなかった💦');
        } else {
            setNewPresenter(''); setNewFg('');
        }
    };

    // 削除
    const handleDeleteAgenda = async (id: string) => {
        if (!window.confirm("本当に削除する？")) return;
        await supabase.from('agenda_items').delete().eq('id', id);
    };

    // 編集保存
    const saveEditing = async () => {
        if (!editingId) return;
        const { error } = await supabase.from('agenda_items').update({
            presenter: editPresenter,
            fg: editFg,
            end_time: editTime // DBは end_time
        }).eq('id', editingId);

        if (error) alert('更新失敗💦');
        else setEditingId(null);
    };

    const startEditing = (item: AgendaItem) => {
        setEditingId(item.id);
        setEditPresenter(item.presenter);
        setEditFg(item.fg);
        setEditTime(item.end_time);
    };

    // フィルタリング
    const pdfNotes = notes.filter(n => n.type === 'pdf' && n.page_index === 1).sort((a, b) => a.y - b.y);
    const displayNotes = notes.filter(note => {
        // 1. タブによるフィルタ (質問 or コメント)
        if (activeTab === 'index') return false; // indexタブはノート出さない
        
        const isQuestion = activeTab === 'question' && note.color === 'b';
        const isComment = activeTab === 'comment' && note.color === 'r';
        
        if (!isQuestion && !isComment) return false;

        // 2. アジェンダによるフィルタ (超重要！)
        // agenda_id が設定されているノートは、今の発表者と一致するものだけ表示！
        // (agenda_id がない古いノートは全員に見せるか、隠すか。今回は「隠す」設定でいくよ！)
        if (currentAgendaId && note.agenda_id && note.agenda_id !== currentAgendaId) {
            return false; 
        }
        
        // ※ もし「agenda_idがないノートも表示したい」なら、条件を緩めてね
        return true;
    });

    return (
        <aside className={`sidebar-container ${className || ''}`}>
            {/* タブ */}
            <div className="sidebar-tabs">
                <button onClick={() => setActiveTab('index')} className={`tab-button ${activeTab === 'index' ? 'active-index' : ''}`}>資料/進行</button>
                <button onClick={() => setActiveTab('question')} className={`tab-button ${activeTab === 'question' ? 'active-question' : ''}`}>質疑</button>
                <button onClick={() => setActiveTab('comment')} className={`tab-button ${activeTab === 'comment' ? 'active-comment' : ''}`}>コメ</button>
            </div>

            <div className="sidebar-content">
                {activeTab === 'index' && (
                    <>
                        {/* アジェンダ登録フォーム */}
                        <div className="agenda-form-card">
                            <h3 className="section-title">新規登録</h3>
                            <div className="form-row">
                                <input type="text" placeholder="発表者" className="sidebar-input" value={newPresenter} onChange={e => setNewPresenter(e.target.value)} />
                                <div className="form-row-horizontal">
                                    <input type="text" placeholder="FG" className="sidebar-input" style={{flex: 1}} value={newFg} onChange={e => setNewFg(e.target.value)} />
                                    <input type="time" placeholder="00:00" className="sidebar-input" style={{width: '60px', textAlign: 'center'}} value={newTime} onChange={e => setNewTime(e.target.value)} />
                                </div>
                                <button onClick={handleAddAgenda} className="sidebar-btn-add">＋ 追加</button>
                            </div>
                        </div>

                        {/* アジェンダリスト */}
                        {agendaList.length > 0 && (
                            <div className="agenda-list">
                                <h3 className="section-title">進行表</h3>
                                {agendaList.map((item, index) => (
                                    <div key={item.id} className="agenda-item">
                                        {editingId === item.id ? (
                                            /* 編集モード */
                                            <div className="form-row">
                                                <input type="text" className="sidebar-input" value={editPresenter} onChange={e => setEditPresenter(e.target.value)} autoFocus />
                                                <div className="form-row-horizontal">
                                                    <input type="text" className="sidebar-input" style={{flex: 1}} value={editFg} onChange={e => setEditFg(e.target.value)} />
                                                    <input type="text" className="sidebar-input" style={{width: '60px'}} value={editTime} onChange={e => setEditTime(e.target.value)} />
                                                </div>
                                                <div className="form-row-horizontal" style={{justifyContent: 'flex-end'}}>
                                                    <button onClick={saveEditing} className="sidebar-btn-add" style={{backgroundColor: '#10b981'}}>保存</button>
                                                    <button onClick={() => setEditingId(null)} className="sidebar-btn-add" style={{backgroundColor: '#9ca3af'}}>中止</button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* 表示モード */
                                            <div className="agenda-content">
                                                <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                                                    <div className="agenda-number">{index + 1}</div>
                                                    <div className="agenda-info">
                                                        <span className="agenda-presenter">{item.presenter}</span>
                                                        <div className="agenda-meta">
                                                            <span className="agenda-tag">FG: {item.fg}</span>
                                                            <span>⏱ {item.end_time}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="agenda-actions">
                                                    <button onClick={() => startEditing(item)} className="agenda-action-btn edit" title="編集">✏️</button>
                                                    <button onClick={() => handleDeleteAgenda(item.id)} className="agenda-action-btn delete" title="削除">🗑️</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />

                        {/* 資料リスト */}
                        <div className="agenda-list">
                            <h3 className="section-title">資料一覧</h3>
                            {pdfNotes.length === 0 && <p className="empty-state">資料がありません</p>}
                            {pdfNotes.map((note, index) => (
                                <button key={note.id} onClick={() => onJump(note.id)} className="pdf-item">
                                    <span className="pdf-icon">📄</span>
                                    <span className="pdf-title">資料 {index + 1}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* 質問・コメントリスト */}
                {activeTab !== 'index' && (
                    <>
                        {displayNotes.length > 0 ? (
                            <ul className="note-list">
                                {displayNotes.map(note => (
                                    <li key={note.id} className={`note-list-item ${note.isRead ? 'read' : ''}`}>
                                        <div className="note-header">
                                            <div className="note-avatar">
                                                {note.icon ? <img src={note.icon} alt="user" style={{width:'100%', height:'100%', borderRadius:'50%'}} /> : "?"}
                                            </div>
                                            <div className="note-body">
                                                <button onClick={() => onToggleReadStatus(note.id)} className={`check-btn-inline ${note.isRead ? 'checked' : ''}`} title={note.isRead ? "未完了に戻す" : "完了にする"}>
                                                    {note.isRead && '✓'}
                                                </button>
                                                <p className="note-text">{note.text}</p>
                                            </div>
                                        </div>
                                        <div className="replies-section">
                                            {note.replies?.map(reply => (
                                                <div key={reply.id} className="reply-item">
                                                    <div className="note-avatar" style={{width: 16, height: 16, fontSize: 8}}>
                                                        {reply.icon ? <img src={reply.icon} alt="user" style={{width:'100%', height:'100%', borderRadius:'50%'}} /> : ""}
                                                    </div>
                                                    <span style={{flex: 1, wordBreak: 'break-all'}}>{reply.text}</span>
                                                </div>
                                            ))}
                                            <ReplyInput onAddReply={(text) => onAddReply(note.id, text)} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="empty-state">該当する付箋はありません</div>
                        )}
                    </>
                )}
            </div>
        </aside>
    );
}