// src/component/MainContent.tsx
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

// --- Components ---
import CustomNoteNode from './CustomNoteNode';
import ContextMenu from './ContextMenu'; // ✨独立したメニューをインポート！

// --- Types ---
import type { NoteData, AgendaItem } from '@/types'; // ✨修正したパスを使用

type MainContentProps = {
    notes: NoteData[];
    onNotesChange: (id: string, x: number, y: number) => void;
    onAddNote: (
        text: string, 
        color: string, 
        x: number, 
        y: number, 
        icon?: string | null, 
        agendaId?: string
    ) => void;
    onEditNote: (id: string, text: string) => void;
    onAddReply: (noteId: string, replyText: string) => void;
    onDeleteNote: (id: string) => void;
    onDuplicateNote: (id: string) => void;
    onUpdateNote: (id: string, updates: Partial<NoteData>) => void;
    onToggleReadStatus: (id: string) => void;
    agendaList?: AgendaItem[];
    jumpTargetId?: string | null;
    onJumpComplete?: () => void;
};

// 内部コンポーネント (Flow)
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
    agendaList = [],
    jumpTargetId,
    onJumpComplete
}: MainContentProps) {
    // React Flow の状態管理
    const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState([]);
    const [_edges, _setEdges, onEdgesChange] = useEdgesState([]);
    const { screenToFlowPosition, setCenter } = useReactFlow(); 

    // コンテキストメニューの状態
    const [menu, setMenu] = useState<{ id: string, top?: number, left?: number } | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    // Nodeタイプの定義 (再生成を防ぐため useMemo)
    const nodeTypes = useMemo(() => ({ note: CustomNoteNode }), []);

    // 移動可能範囲（結界）
    const extent: [[number, number], [number, number]] = [
        [-2000, -2000], 
        [20000, Infinity]
    ];

    // --- 1. データ同期: props.notes を React Flow の nodes に変換 ---
    useEffect(() => {
        if (!notes) return;
        const flowNodes: Node[] = notes.map((note) => ({
            id: note.id,
            type: 'note', 
            position: { x: note.x, y: note.y }, 
            draggable: note.type === 'pdf' ? false : !note.is_locked,
            zIndex: note.z_index || 0,
            data: { 
                ...note,
                onChangeText: (newText: string) => onEditNote(note.id, newText),
                onAddReply: (replyText: string) => onAddReply(note.id, replyText),
                onDelete: onDeleteNote, 
                onDuplicate: onDuplicateNote,
                onUpdateNote: onUpdateNote,
                onToggleReadStatus: () => onToggleReadStatus(note.id),
                
                // ★ここ超重要！これがないとボタンが出ない！
                agendaList: agendaList, 
                // ★宛先IDを更新する関数
                onUpdateAgendaId: (newId: string) => onUpdateNote(note.id, { agenda_id: newId }),
            }, 
            style: { width: note.width || 200, height: note.height || 100 },
        }));
        setNodes(flowNodes);
    }, [notes, setNodes, onEditNote, onAddReply, onDeleteNote, onDuplicateNote, onUpdateNote, onToggleReadStatus, agendaList]);

    // --- 2. イベントハンドラ ---

    // ノートのドラッグ終了
    const onNodeDragStop: NodeDragHandler = useCallback((_e, node) => {
        onNotesChange(node.id, node.position.x, node.position.y);
    }, [onNotesChange]);

    // ドロップ許可
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault(); 
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // 新規ドロップ
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const reactFlowData = event.dataTransfer.getData('application/reactflow');
            if (!reactFlowData) return;

            const { color } = JSON.parse(reactFlowData);
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

            onAddNote('', color, position.x, position.y);
        },
        [screenToFlowPosition, onAddNote]
    );

    // ノートクリック/ドラッグ開始（前面へ）
    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setMenu(null);
        onUpdateNote(node.id, { z_index: Date.now() });
    }, [onUpdateNote]);

    const onNodeDragStart: NodeDragHandler = useCallback((_event, node) => {
        setMenu(null);
        onUpdateNote(node.id, { z_index: Date.now() });
    }, [onUpdateNote]);

    // --- 3. ジャンプ機能 ---
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

    // --- 4. コンテキストメニュー制御 ---
    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault();
            
            setMenu({
                id: node.id,
                top: event.clientY,
                left: event.clientX,
            });
        },
        []
    );

    const onPaneClick = useCallback(() => setMenu(null), []);

    return (
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
                onNodeContextMenu={onNodeContextMenu}
                onPaneClick={onPaneClick}
                translateExtent={extent}
                minZoom={0.1}
                maxZoom={6}
                panOnScroll={false}      // false = ホイールでズーム (trueだとパンになる)
                zoomOnScroll={true}      // true = ホイールで拡大縮小
                zoomOnPinch={true}       // true = タッチパッドのピンチで拡大縮小
                panOnDrag={true}         // true = ドラッグで移動
                zoomOnDoubleClick={false} // ダブルクリックでのズームは誤爆するのでOFF推奨
            >
                <Background color="#aaa" gap={16} />
                <Controls />
                <MiniMap style={{ height: 120 }} zoomable pannable />
                
                {/* ✨ 切り出したContextMenuを表示 */}
                {menu && (
                    <ContextMenu 
                        top={menu.top || 0} 
                        left={menu.left || 0}
                        onClose={() => setMenu(null)}
                        onDelete={() => { 
                            onDeleteNote(menu.id); 
                            setMenu(null); 
                        }}
                        // agendaList とかはもう渡さない！削除！
                    />
                )}
            </ReactFlow>
        </div>
    );
}

// 外側からProviderで包む
export default function MainContent(props: MainContentProps) {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlowProvider>
                <Flow {...props} />
            </ReactFlowProvider>
        </div>
    );
}