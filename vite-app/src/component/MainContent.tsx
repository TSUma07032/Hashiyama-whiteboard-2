import React, { useCallback, useEffect,useRef, useMemo } from 'react';
import ReactFlow, { 
  ReactFlowProvider, // ◀ Providerが必要！
  useReactFlow,      // ◀ フックを使うため
  Background,
  Controls, 
  useNodesState, 
  useEdgesState,
  type Node,
  type NodeChange,
  applyNodeChanges,
  type NodeDragHandler
} from 'reactflow';
import 'reactflow/dist/style.css'; // ◀ 必須スタイル！
import CustomNoteNode from './CustomNoteNode'; // ◀ 後で作るやつ！
import type { NoteData } from './index.d';

// ▼▼▼ プロップスの定義 ▼▼▼
type MainContentProps = {
    notes: NoteData[];
    onNotesChange: (id: string, x: number, y: number) => void; // 座標更新用
    onAddNote: (text: string, color: string, x: number, y: number) => void;
    onEditNote: (id: string, text: string) => void;
    onAddReply: (noteId: string, replyText: string) => void;
    onDeleteNote: (id: string) => void;
    onDuplicateNote: (id: string) => void;
    onUpdateNote: (id: string, updates: Partial<NoteData>) => void;
};

// ▼▼▼ カスタムノードの登録 ▼▼▼
// "note" という名前で CustomNoteNode を使うぞ！という宣言
const nodeTypes = {
  note: CustomNoteNode,
};

function Flow({ notes, onNotesChange, onAddNote, onEditNote, onAddReply, onDeleteNote, onDuplicateNote, onUpdateNote }: MainContentProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    
    // ▼▼▼ これを使うために、このコンポーネントを分けたんだ！ ▼▼▼
    const { screenToFlowPosition } = useReactFlow(); 

    // --- データ同期 (useEffect) ---
    useEffect(() => {
        if (!notes) return;
        const flowNodes = notes.map((note) => ({
            id: note.id,
            type: 'note', 
            position: { x: note.x, y: note.y }, 
            draggable: !note.is_locked, 
            // ▼▼▼ Z-Index：zIndex プロパティにマッピング！ ▼▼▼
            zIndex: note.z_index || 0,
            
            // ▼▼▼ data の中に関数を混ぜ込む！ ▼▼▼
            data: { 
                ...note,
                // ノードの中から呼び出せるようにするぞ！
                onChangeText: (newText: string) => onEditNote(note.id, newText),
                onAddReply: (replyText: string) => onAddReply(note.id, replyText),
                onDelete: onDeleteNote,
                onDuplicate: onDuplicateNote,
                onUpdateNote: onUpdateNote
            }, 
            
            style: { 
                width: note.width || 200,
                height: note.height || 100,
            },
        }));
        setNodes(flowNodes);
    }, [notes, setNodes, onEditNote]); // ◀ onEditNote も依存配列に入れる

    // --- ドラッグ終了 ---
    const onNodeDragStop: NodeDragHandler = useCallback((e, node) => {
        onNotesChange(node.id, node.position.x, node.position.y);
    }, [onNotesChange]);

    // --- ドロップ許可 ---
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault(); 
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // --- ドロップ処理 ---
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const reactFlowData = event.dataTransfer.getData('application/reactflow');
            if (!reactFlowData) return;

            const { type, color } = JSON.parse(reactFlowData);

            // ここで screenToFlowPosition が火を吹く！
            const position = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            onAddNote('', color, position.x, position.y);
        },
        [screenToFlowPosition, onAddNote]
    );

    // クリックした時にも最前面にしたいよな？
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        // 現在の時刻を Z-Index に設定！これで絶対一番上に来る！
        // DBのカラムが int8 (bigint) なら桁あふれしないから大丈夫だ！
        onUpdateNote(node.id, { z_index: Date.now() });
    }, [onUpdateNote]);

    // ドラッグ開始時にも最前面にする！
    const onNodeDragStart: NodeDragHandler = useCallback((event, node) => {
        onUpdateNote(node.id, { z_index: Date.now() });
    }, [onUpdateNote]);

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
                onNodeClick={onNodeClick}      // クリックしたら最前面
                onNodeDragStart={onNodeDragStart} // ドラッグ開始したら最前面
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
            {/* ここで Flow を呼ぶことで、Flow 内部でフックが使えるようになる！ */}
            <Flow
                notes={props.notes}
                onNotesChange={props.onNotesChange}
                onAddNote={props.onAddNote}
                onEditNote={props.onEditNote}
                onAddReply={props.onAddReply}
                onDeleteNote={props.onDeleteNote}
                onDuplicateNote={props.onDuplicateNote}
                onUpdateNote={props.onUpdateNote}
            />
        </ReactFlowProvider>
    );
}
        
