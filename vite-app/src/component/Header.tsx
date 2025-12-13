import type { AgendaItem } from './index.d';
import '../styles/Header.css';

type HeaderProps = {
    className?: string;
    dataNoPan?: boolean;
    currentAgenda: AgendaItem | null;
    timer: number;
    onNext: () => void;
    onPrev: () => void;
    isTimerRunning: boolean;
    onToggleTimer: () => void;
    onPrint?: () => void;
    onDeleteAll?: () => void;
    icon?: string | null;
    
    // ▼▼▼ 追加！タイマーの排他制御用 ▼▼▼
    timerOwnerId: string | null; // 現在タイマーを回している人のID
    currentUserId: string;       // 自分のID
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
    isTimerRunning, 
    onToggleTimer,
    onPrint, 
    onDeleteAll,
    icon,
    timerOwnerId, // ◀ 受け取り
    currentUserId // ◀ 受け取り
}: HeaderProps) {
    
    // ▼ タイマー操作ができるか判定
    // 停止中は誰でも押せる。動いている時は「オーナー」しか押せない。
    const canControlTimer = !isTimerRunning || (timerOwnerId === currentUserId);

    return (
        <header 
            className={`header-container ${className || ''}`} 
            data-no-pan={dataNoPan ? 'true' : undefined}
        >
            {/* 左側：ロゴなし */}

            {/* --- 中央：アジェンダ＆タイマー --- */}
            <div className="header-center">
                {currentAgenda ? (
                    <div className="agenda-card">
                        <div className="presenter-info">
                            <div className="fg-badge-row">
                                <span className="fg-badge">FG</span>
                                <span>{currentAgenda.fg}</span>
                            </div>
                            <div className="presenter-name">
                                <span>🎤</span>
                                <span>{currentAgenda.presenter}</span>
                            </div>
                        </div>

                        <div className="divider"></div>

                        <div className="timer-area">
                            <span className={`timer-text ${timer < 60 ? 'warning' : ''}`}>
                                {formatTime(timer)}
                            </span>
                            
                            {/* ▼▼▼ 操作権限でボタンを制御 ▼▼▼ */}
                            <button 
                                onClick={onToggleTimer}
                                disabled={!canControlTimer} 
                                className={`timer-btn ${isTimerRunning ? 'pause' : 'start'}`}
                                style={{ 
                                    opacity: canControlTimer ? 1 : 0.3, 
                                    cursor: canControlTimer ? 'pointer' : 'not-allowed',
                                    filter: canControlTimer ? 'none' : 'grayscale(100%)'
                                }}
                                title={
                                    !canControlTimer 
                                        ? "他の人が操作中です" 
                                        : (isTimerRunning ? "一時停止" : "スタート")
                                }
                            >
                                {isTimerRunning ? '⏸' : '▶'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="waiting-text">ミーティング待機中...</div>
                )}
            </div>

            {/* --- 右側：操作ボタン --- */}
            <div className="header-right">
                {onPrint && <button onClick={onPrint} className="control-btn" title="保存">💾</button>}
                {onDeleteAll && <button onClick={onDeleteAll} className="control-btn" title="全削除">🗑️</button>}
                
                <button onClick={onPrev} className="control-btn" title="前の発表へ">⏮</button>
                <button onClick={onNext} className="control-btn" title="次の発表へ">⏭</button>
                
                {icon ? (
                    <img src={icon} alt="User" className="user-avatar" />
                ) : (
                    <div className="user-avatar" />
                )}
            </div>
        </header>
    );
}