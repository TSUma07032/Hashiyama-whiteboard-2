// src/components/MainContent.tsx
// ✨ useImperativeHandle をちゃんとインポートに追加！
import React, { useCallback, useEffect, useRef, useMemo, useState, useImperativeHandle, forwardRef } from 'react';
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
  getNodesBounds,
  useStoreApi,
} from 'reactflow';
import 'reactflow/dist/style.css';

// --- Components ---
import CustomNoteNode from './CustomNoteNode';
import ContextMenu from './ContextMenu';
import type { NoteData, AgendaItem } from '@/types';

// 親から呼び出せる関数の型定義
export type MainContentHandle = {
    print: () => void;
    getBoundingClientRect: () => DOMRect | null;
};

type MainContentProps = {
    notes: NoteData[];
    onNotesChange: (id: string, x: number, y: number) => void;
    onAddNote: (text: string, color: string, x: number, y: number, icon?: string | null, agendaId?: string) => void;
    onEditNote: (id: string, text: string) => void;
    onAddReply: (noteId: string, replyText: string) => void;
    onDeleteNote: (id: string) => void;
    onDuplicateNote: (id: string) => void;
    onUpdateNote: (id: string, updates: Partial<NoteData>) => void;
    onToggleReadStatus: (id: string) => void;
    agendaList?: AgendaItem[];
    jumpTargetId?: string | null;
    onJumpComplete?: () => void;
    onUpdateReply: (noteId: string, replyId: string, newText: string) => void;
};

// 内部コンポーネント (Flow)
const Flow = forwardRef<MainContentHandle, MainContentProps>((props, ref) => {
    // ✨ notes stateの定義（エイリアス使用）
    const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState([]);
    const [_edges, _setEdges, onEdgesChange] = useEdgesState([]);

    // ✨ ここに必要な関数（setViewport, getNodes）を追加！
    const { screenToFlowPosition, setCenter, setViewport, getNodes } = useReactFlow(); 
    const store = useStoreApi();

    // コンテキストメニューの状態
    const [menu, setMenu] = useState<{ id: string, top?: number, left?: number } | null>(null);
    const flowRef = useRef<HTMLDivElement>(null); // refの名前を明確に flowRef に変更

    const nodeTypes = useMemo(() => ({ note: CustomNoteNode }), []);


    const extent: [[number, number], [number, number]] = [
        [-1000, 0], 
        [10000, Infinity]
    ];

    // --- 1. データ同期 ---
    useEffect(() => {
        if (!props.notes) return;
        const flowNodes: Node[] = props.notes.map((note) => ({
            id: note.id,
            type: 'note', 
            position: { x: note.x, y: note.y }, 
            draggable: note.type === 'pdf' ? false : !note.is_locked,
            zIndex: note.z_index || 0,
            data: { 
                ...note,
                onChangeText: (newText: string) => props.onEditNote(note.id, newText),
                onAddReply: (replyText: string) => props.onAddReply(note.id, replyText),
                onDelete: props.onDeleteNote, 
                onDuplicate: props.onDuplicateNote,
                onUpdateNote: props.onUpdateNote,
                onToggleReadStatus: () => props.onToggleReadStatus(note.id),
                agendaList: props.agendaList, 
                onUpdateAgendaId: (newId: string) => props.onUpdateNote(note.id, { agenda_id: newId }),
                onUpdateReply: (replyId: string, newText: string) => props.onUpdateReply(note.id, replyId, newText),
            }, 
            style: { width: note.width || 200, height: note.height || 100 },
        }));
        setNodes(flowNodes);
    }, [props.notes, setNodes, props.onEditNote, props.onAddReply, props.onDeleteNote, props.onDuplicateNote, props.onUpdateNote, props.onToggleReadStatus, props.agendaList]);

    // --- 2. イベントハンドラ ---
    const onNodeDragStop: NodeDragHandler = useCallback((_e, node) => {
        props.onNotesChange(node.id, node.position.x, node.position.y);
    }, [props.onNotesChange]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault(); 
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const reactFlowData = event.dataTransfer.getData('application/reactflow');
            if (!reactFlowData) return;

            const { color } = JSON.parse(reactFlowData);
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

            props.onAddNote('', color, position.x, position.y);
        },
        [screenToFlowPosition, props.onAddNote]
    );

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setMenu(null);
        props.onUpdateNote(node.id, { z_index: Date.now() });
    }, [props.onUpdateNote]);

    const onNodeDragStart: NodeDragHandler = useCallback((_event, node) => {
        setMenu(null);
        props.onUpdateNote(node.id, { z_index: Date.now() });
    }, [props.onUpdateNote]);

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

    // --- 3. ジャンプ機能 ---
    useEffect(() => {
        if (!props.jumpTargetId) return;
        const targetNode = props.notes.find(n => n.id === props.jumpTargetId);
        if (targetNode) {
            const targetX = targetNode.x + (targetNode.width || 200) / 2;
            const targetY = targetNode.y + (targetNode.height || 100) / 2;
            setCenter(targetX, targetY, { zoom: 1.0, duration: 800 });
        }
        if (props.onJumpComplete) props.onJumpComplete();
    }, [props.jumpTargetId, props.notes, setCenter, props.onJumpComplete]);

    // ▼▼▼ 印刷機能を親に公開！ ▼▼▼
    useImperativeHandle(ref, () => ({
        print: () => {

            // 1. ノードがあるかチェック
            const currentNodes = getNodes();
            if (currentNodes.length === 0) return;
            
            // 2. 全体の範囲を取得
            const bounds = getNodesBounds(currentNodes);
            
            // 3. 現在の視点（位置・ズーム）を保存
            // 修正済み: transformは配列 [x, y, zoom] です！
            const [prevX, prevY, prevZoom] = store.getState().transform;

            // 4. 印刷用にビューポートを強制変更！
            const padding = 50; // ちょっと余白
            // ズーム100%で、全体が左上に来るように移動
            setViewport({ x: -bounds.x + padding, y: -bounds.y + padding, zoom: 1 });

            // 5. キャンバスのDOM要素を強制的に広げる！
            // これでCSSの 'width: auto' と組み合わさって最強になる
            const wrapper = document.querySelector('.react-flow') as HTMLElement;
            const originalWidth = wrapper.style.width;
            const originalHeight = wrapper.style.height;

            wrapper.style.width = `${bounds.width + (padding * 2)}px`;
            wrapper.style.height = `${bounds.height + (padding * 2)}px`;

            // 6. 描画反映を待ってから印刷
            setTimeout(() => {
                window.print();

                // 7. お片付け（元に戻す）
                setViewport({ x: prevX, y: prevY, zoom: prevZoom });
                wrapper.style.width = originalWidth;
                wrapper.style.height = originalHeight;
            }, 500); // 0.5秒待機
        },
        getBoundingClientRect: () => {
            return flowRef.current?.getBoundingClientRect() ?? null;
        }
    }));

    return (
        <div ref={flowRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
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
                panOnScroll={false}
                zoomOnScroll={true}
                zoomOnPinch={true}
                panOnDrag={true}
                zoomOnDoubleClick={false}
            >
                <Background color="#aaa" gap={16} />
                <Controls />
                <MiniMap style={{ height: 120 }} zoomable pannable />
                
                {menu && (
                    <ContextMenu 
                        top={menu.top || 0} 
                        left={menu.left || 0}
                        onClose={() => setMenu(null)}
                        onDelete={() => { 
                            props.onDeleteNote(menu.id); 
                            setMenu(null); 
                        }}
                    />
                )}
            </ReactFlow>
        </div>
    );
});

// 外側からProviderで包む
const MainContent = forwardRef<MainContentHandle, MainContentProps>((props, ref) => {
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlowProvider>
                {/* 2. ここ！ここでバトン(ref)を Flow に渡す！ */}
                <Flow {...props} ref={ref} />
            </ReactFlowProvider>
        </div>
    );
});

// 3. 最後に export default
export default MainContent;