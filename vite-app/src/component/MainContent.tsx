import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import ReactFlow, { 
  ReactFlowProvider, 
  useReactFlow,      
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  type NodeDragHandler,
  MiniMap,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNoteNode from './CustomNoteNode';
import type { NoteData } from './index.d';

type MainContentProps = {
    notes: NoteData[];
    onNotesChange: (id: string, x: number, y: number) => void;
    onAddNote: (text: string, color: string, x: number, y: number) => void;
    onEditNote: (id: string, text: string) => void;
    onAddReply: (noteId: string, replyText: string) => void;
    onDeleteNote: (id: string) => void;
    onDuplicateNote: (id: string) => void;
    onUpdateNote: (id: string, updates: Partial<NoteData>) => void;
    onToggleReadStatus: (id: string) => void;
    // ジャンプ機能用
    jumpTargetId?: string | null;
    onJumpComplete?: () => void;
};

//  コンテキストメニュー（右クリックメニュー）コンポーネント 
function ContextMenu({ 
    top, left, onDelete, onClose
}: { 
    top: number, left: number, onDelete: () => void, onClose: () => void
}) {
    return (
        <div 
            style={{ top, left }} 
            className="context-menu-container" // ◀ CSSクラス適用
            // ▼▼▼ ここが重要！マウスダウンをここで止める！ ▼▼▼
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={(e) => e.stopPropagation()}
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        >
            <div className="context-menu-card">
                <div className="context-menu-header">
                    <span className="text-xs font-bold text-gray-500">操作メニュー</span>
                </div>

                <div className="context-menu-body">
                    {/* 削除ボタン */}
                    <button 
                        className="context-menu-btn delete"
                        onClick={() => {
                            if (window.confirm("本当に削除しますか？")) {
                                onDelete();
                            }
                            onClose();
                        }}
                    >
                        <span style={{ fontSize: '1.2em' }}>🗑️</span> 削除する
                    </button>

                    {/* キャンセルボタン */}
                    <button 
                        className="context-menu-btn cancel" 
                        onClick={onClose}
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    );
}

function Flow({ 
    notes, 
    onNotesChange, 
    onAddNote, 
    onEditNote, 
    onAddReply, 
    onDeleteNote, 
    onDuplicateNote,
    onUpdateNote,
    onToggleReadStatus,
    jumpTargetId,
    onJumpComplete
}: MainContentProps) {
    const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState([]);
    const [_edges, _setEdges, onEdgesChange] = useEdgesState([]);
    const { screenToFlowPosition, setCenter } = useReactFlow(); 

    // --- コンテキストメニューの状態管理 ---
    const [menu, setMenu] = useState<{ id: string, top?: number, left?: number, right?: number, bottom?: number } | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    // useMemo で警告回避
    const nodeTypes = useMemo(() => ({ note: CustomNoteNode }), []);

    // 結界（広域仕様）
    const extent: [[number, number], [number, number]] = [
        [-2000, -2000], 
        [20000, Infinity] // 横20000, 縦無限
    ];

    // データ同期
    useEffect(() => {
        if (!notes) return;
        const flowNodes: Node[] = notes.map((note) => ({
            id: note.id,
            type: 'note', 
            position: { x: note.x, y: note.y }, 

            draggable: note.type === 'pdf' ? false : !note.is_locked,
            
            // ロック中でも、右クリック削除は可能にするため、draggableだけ制御する
            zIndex: note.z_index || 0,
            
            data: { 
                ...note,
                onChangeText: (newText: string) => onEditNote(note.id, newText),
                onAddReply: (replyText: string) => onAddReply(note.id, replyText),
                onDelete: onDeleteNote, // ← CustomNoteNode内のボタン用（残しておいて損はない）
                onDuplicate: onDuplicateNote,
                onUpdateNote: onUpdateNote,
                onToggleReadStatus: () => onToggleReadStatus(note.id),
            }, 
            
            style: { 
                width: note.width || 200,
                height: note.height || 100,
            },
        }));
        setNodes(flowNodes);
    }, [notes, setNodes, onEditNote, onAddReply, onDeleteNote, onDuplicateNote, onUpdateNote, onToggleReadStatus]);

    // ドラッグ終了時
    const onNodeDragStop: NodeDragHandler = useCallback((_e, node) => {
        onNotesChange(node.id, node.position.x, node.position.y);
    }, [onNotesChange]);

    // ドロップ許可
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault(); 
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // ドロップ処理
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const reactFlowData = event.dataTransfer.getData('application/reactflow');
            if (!reactFlowData) return;

            const {color } = JSON.parse(reactFlowData);
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

            onAddNote('', color, position.x, position.y);
        },
        [screenToFlowPosition, onAddNote]
    );

    // クリック・ドラッグで最前面へ
    const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
        setMenu(null); // クリックしたらメニュー閉じる
        onUpdateNote(node.id, { z_index: Date.now() });
    }, [onUpdateNote]);

    const onNodeDragStart: NodeDragHandler = useCallback((_event, node) => {
        setMenu(null); // ドラッグしたらメニュー閉じる
        onUpdateNote(node.id, { z_index: Date.now() });
    }, [onUpdateNote]);

    // ジャンプ機能
    useEffect(() => {
        if (!jumpTargetId) return;
        const targetNode = notes.find(n => n.id === jumpTargetId);
        if (targetNode) {
            const targetX = targetNode.x + (targetNode.width || 200) / 2;
            const targetY = targetNode.y + (targetNode.height || 100) / 2;
            setCenter(targetX, targetY, { zoom: 1.0, duration: 800 });
        }
        if (onJumpComplete) onJumpComplete();
    }, [jumpTargetId, notes, setCenter, onJumpComplete]);

    // ▼▼▼ 右クリックメニューのハンドラ ▼▼▼
    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();

            // コンテナの位置を取得
            const pane = ref.current?.getBoundingClientRect();
            
            setMenu({
                id: node.id,
                // マウス位置からコンテナの左上を引いて「相対座標」にする！
                // これでズレなくなるはずだ！
                top: event.clientY - (pane?.top || 0),
                left: event.clientX - (pane?.left || 0),
            });
        },
        [setMenu],
    );
    // 画面のどこかをクリックしたらメニューを閉じる
    const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

    return (
        // ref をここに設定して、座標計算に使う
        <div ref={ref} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ReactFlow
                nodes={nodes}
                onNodesChange={onNodesChangeReactFlow}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                fitView
                onDragOver={onDragOver}
                onDrop={onDrop}
                onNodeClick={onNodeClick}
                onNodeDragStart={onNodeDragStart}
                
                // ▼▼▼ 右クリックイベント ▼▼▼
                onNodeContextMenu={onNodeContextMenu}
                // ▼▼▼ 背景クリックでメニュー閉じる ▼▼▼
                onPaneClick={onPaneClick}

                translateExtent={extent}
                minZoom={0.1}
                maxZoom={4}
            >
                <Background color="#aaa" gap={16} />
                <Controls />
                {/* <MiniMap style={{ height: 120 }} zoomable pannable /> */}
                
                {/* ▼▼▼ メニュー表示 ▼▼▼ */}
                {menu && (
                    <ContextMenu
                        // メニュー自体をクリックしても閉じないように制御は内部でするが、外側クリック用
                        top={menu.top || 0}
                        left={menu.left || 0}
                        onDelete={() => {
                            onDeleteNote(menu.id);
                            setMenu(null);
                        }}
                        onClose={() => setMenu(null)}
                    />
                )}
            </ReactFlow>
            <MiniMap style={{ height: 120 }} zoomable pannable />
        </div>
    );
}

export default function MainContent(props: MainContentProps) {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlowProvider>
                <Flow {...props} />
            </ReactFlowProvider>
        </div>
    );
}