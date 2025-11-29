import React, { useCallback, useEffect, useRef } from 'react';
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
};

// ▼▼▼ 【修正1】関数の「外」に出す！これで警告は消える！ ▼▼▼
const nodeTypes = { note: CustomNoteNode };

function Flow({ 
    notes, 
    onNotesChange, 
    onAddNote, 
    onEditNote, 
    onAddReply, 
    onDeleteNote, 
    onDuplicateNote, // もし使ってなくても受け取っておく
    onUpdateNote     // ◀ これだ！これを受け取ってるのに...
}: MainContentProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const { screenToFlowPosition } = useReactFlow(); 

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
                
                // ▼▼▼ 【修正2】ここだあああ！これを忘れてた！！ ▼▼▼
                // これがないと CustomNoteNode で data.onUpdateNote が undefined になる！
                onUpdateNote: onUpdateNote, 
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            }, 
            
            style: { 
                width: note.width || 200,
                height: note.height || 100,
            },
        }));
        setNodes(flowNodes);
    }, [notes, setNodes, onEditNote, onAddReply, onDeleteNote, onUpdateNote]); // 依存配列にも忘れずに！

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

    return (
        <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={nodes}
                onNodesChange={onNodesChangeReactFlow}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                fitView
                onDragOver={onDragOver}
                onDrop={onDrop}
                minZoom={0.1} // ズーム制限解除も忘れずに
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