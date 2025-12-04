import React, { useCallback, useEffect, useRef, useMemo } from 'react'; // useMemo 追加
import ReactFlow, { 
  ReactFlowProvider, 
  useReactFlow,      
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  type NodeDragHandler
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
};

function Flow({ 
    notes, 
    onNotesChange, 
    onAddNote, 
    onEditNote, 
    onAddReply, 
    onDeleteNote, 
    onDuplicateNote,
    onUpdateNote,
    onToggleReadStatus
}: MainContentProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { screenToFlowPosition } = useReactFlow(); 

    // ▼▼▼ 【修正1】useMemo で警告を完全封殺！ ▼▼▼
    const nodeTypes = useMemo(() => ({ note: CustomNoteNode }), []);

    useEffect(() => {
        if (!notes) return;
        const flowNodes = notes.map((note) => ({
            id: note.id,
            type: 'note', 
            position: { x: note.x, y: note.y }, 
            
            draggable: !note.is_locked, 
            zIndex: note.z_index || 0,
            
            data: { 
                ...note,
                onChangeText: (newText: string) => onEditNote(note.id, newText),
                onAddReply: (replyText: string) => onAddReply(note.id, replyText),
                onDelete: onDeleteNote,
                onDuplicate: onDuplicateNote,
                onUpdateNote: onUpdateNote, 
                onToggleReadStatus: () => onToggleReadStatus(note.id),
            }, 
            
            // width/height は style に渡す！（これも重要！）
            style: { 
                width: note.width || 200,
                height: note.height || 100,
            },
        }));
        setNodes(flowNodes);
    }, [notes, setNodes, onEditNote, onAddReply, onDeleteNote, onDuplicateNote, onUpdateNote]);

    const onNodeDragStop: NodeDragHandler = useCallback((e, node) => {
        onNotesChange(node.id, node.position.x, node.position.y);
    }, [onNotesChange]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault(); 
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const reactFlowData = event.dataTransfer.getData('application/reactflow');
            if (!reactFlowData) return;

            const { type, color } = JSON.parse(reactFlowData);
            const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

            onAddNote('', color, position.x, position.y);
        },
        [screenToFlowPosition, onAddNote]
    );

    // ▼▼▼ クリック・ドラッグで最前面へ（前回の追加分） ▼▼▼
    const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
        onUpdateNote(node.id, { z_index: Date.now() });
    }, [onUpdateNote]);

    const onNodeDragStart: NodeDragHandler = useCallback((event, node) => {
        onUpdateNote(node.id, { z_index: Date.now() });
    }, [onUpdateNote]);

    return (
        <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }} className="main-content-area">
            <ReactFlow
                nodes={nodes}
                onNodesChange={onNodesChangeReactFlow}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes} // useMemoしたやつを渡す
                fitView
                onDragOver={onDragOver}
                onDrop={onDrop}
                onNodeClick={onNodeClick}
                onNodeDragStart={onNodeDragStart}
                minZoom={0.1}
                maxZoom={4}
            >
                <Background color="#aaa" gap={16} />
                <Controls />
            </ReactFlow>
        </div>
    );
}

export default function MainContent(props: MainContentProps) {
    return (
        <ReactFlowProvider>
            <Flow {...props} />
        </ReactFlowProvider>
    );
}