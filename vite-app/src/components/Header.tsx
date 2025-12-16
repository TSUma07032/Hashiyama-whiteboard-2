// src/component/Header.tsx
import type { AgendaItem } from '../types'; // パスは環境に合わせてね
import '../styles/Header.css';

type HeaderProps = {
    className?: string;
    dataNoPan?: boolean;
    currentAgenda: AgendaItem | null;
    timer: number;      // 残り秒数
    onNext: () => void;
    onPrev: () => void;
    
    // ▼▼▼ 変更点 ▼▼▼
    endTimeStr: string | null; // 終了時刻 (これがnullなら停止中)
    onToggleTimer: () => void;
    
    onPrint?: () => void;
    onDeleteAll?: () => void;
    icon?: string | null;
    isPresenting: boolean;
    
    // ↓ もう使わないので削除でもいいけど、Layoutから渡ってくるなら残しておいて無視する
    timerOwnerId?: any; 
    currentUserId?: any;
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function Header({ 
    className, 
    dataNoPan, 
    currentAgenda, 
    timer, 
    onNext, 
    onPrev, 
    isPresenting,
    endTimeStr, // ◀ isTimerRunning の代わりにこれを使う
    onToggleTimer,
    onPrint, 
    onDeleteAll,
    icon,
}: HeaderProps) {
    
    const isRunning = !!endTimeStr;



    return (
        <header className={`header-container ${className || ''}`} data-no-pan={dataNoPan ? 'true' : undefined}>
            <div className="header-center">
                {currentAgenda ? (
                    <div className="agenda-card">
                        <div className="presenter-info">
                            <div className="fg-badge-row"><span className="fg-badge">FG</span><span>{currentAgenda.fg}</span></div>
                            <div className="presenter-name"><span>🎤</span><span>{currentAgenda.presenter}</span></div>
                        </div>
                        <div className="divider"></div>
                        <div className="timer-area">
                            <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                                <span className={`timer-text ${timer < 60 && isRunning ? 'warning' : ''}`}>
                                    {formatTime(timer)}
                                </span>
                                {endTimeStr && <span style={{fontSize:'10px', color:'#888'}}>終了: {endTimeStr}</span>}
                            </div>
                            
                            <button 
                                onClick={onToggleTimer}
                                className={`timer-btn ${isPresenting ? 'presenting' : 'ready'}`}
                                // 発表中は赤く光るとか、アニメーションさせるとか！
                                style={{
                                    backgroundColor: isPresenting ? '#ef4444' : '#2563eb',
                                    width: 'auto',
                                    padding: '0 12px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}
                            >
                                {isPresenting ? '🎤 発表中' : '▶ 発表開始'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="waiting-text">待機中...</div>
                )}
            </div>
            <div className="header-right">
                {onPrint && <button onClick={onPrint} className="control-btn" title="保存">💾</button>}
                {onDeleteAll && <button onClick={onDeleteAll} className="control-btn" title="全削除">🗑️</button>}
                
                <button onClick={onPrev} className="control-btn" title="前の発表へ">⏮</button>
                <button onClick={onNext} className="control-btn" title="次の発表へ">⏭</button>
                
                {icon ? <img src={icon} alt="User" className="user-avatar" /> : <div className="user-avatar" />}
            </div>
        </header>
    );
}