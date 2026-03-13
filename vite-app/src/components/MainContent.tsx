// src/components/MainContent.tsx
import  {  useRef, useMemo,  useImperativeHandle, forwardRef } from 'react';
import ReactFlow, { 
  ReactFlowProvider, 
  useReactFlow,      
  Background, 
  Controls, 
  useEdgesState,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

// --- Components ---
import CustomNoteNode from './CustomNoteNode';
import ContextMenu from './ContextMenu';
import type { NoteData, AgendaItem } from '@/types';
import { useFlowNodes } from '@/hooks/useFlowNodes';
import { useFlowEvents } from '@/hooks/useFlowEvents'; 
import { useFlowJump } from '@/hooks/useFlowJump';     

// 親から呼び出せる関数の型定義
export type MainContentHandle = {
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

const Flow = forwardRef<MainContentHandle, MainContentProps>((props, ref) => {
// 1. ノードの状態管理フック
    const { nodes, onNodesChangeReactFlow } = useFlowNodes(props);

    const [_edges, _setEdges, onEdgesChange] = useEdgesState([]);
    const { screenToFlowPosition, setCenter } = useReactFlow(); 

    // 2. イベントハンドラフック ✨ (ごっそり呼び出す)
    const {
        menu, setMenu, onNodeDragStop, onDragOver, onDrop,
        onNodeClick, onNodeDragStart, onNodeContextMenu, onPaneClick
    } = useFlowEvents({
        onNotesChange: props.onNotesChange,
        onAddNote: props.onAddNote,
        onUpdateNote: props.onUpdateNote,
        screenToFlowPosition
    });

    // 3. ジャンプ機能フック ✨ (呼び出すだけ！)
    useFlowJump({
        jumpTargetId: props.jumpTargetId,
        notes: props.notes,
        setCenter,
        onJumpComplete: props.onJumpComplete
    });

    const flowRef = useRef<HTMLDivElement>(null);
    const nodeTypes = useMemo(() => ({ note: CustomNoteNode }), []);

    const extent: [[number, number], [number, number]] = [
        [-1000, 0], 
        [10000, Infinity]
    ];

    useImperativeHandle(ref, () => ({
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
                panOnScroll={true}   
                zoomOnScroll={false} 
                zoomOnPinch={true}
                panOnDrag={true}
                zoomOnDoubleClick={false}
                selectionOnDrag={true}  
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