// src/hooks/useFlowNodes.ts
import { useEffect } from 'react';
import { useNodesState, type Node } from 'reactflow';
import type { NoteData, AgendaItem } from '@/types';

type UseFlowNodesProps = {
    notes: NoteData[];
    onEditNote: (id: string, text: string) => void;
    onAddReply: (noteId: string, replyText: string) => void;
    onDeleteNote: (id: string) => void;
    onDuplicateNote: (id: string) => void;
    onUpdateNote: (id: string, updates: Partial<NoteData>) => void;
    onToggleReadStatus: (id: string) => void;
    agendaList?: AgendaItem[];
    onUpdateReply: (noteId: string, replyId: string, newText: string) => void;
};

export const useFlowNodes = (props: UseFlowNodesProps) => {
    // 内部でReact FlowのStateを持つ
    const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState([]);

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
    }, [
        props.notes, 
        setNodes, 
        props.onEditNote, 
        props.onAddReply, 
        props.onDeleteNote, 
        props.onDuplicateNote, 
        props.onUpdateNote, 
        props.onToggleReadStatus, 
        props.agendaList,
        props.onUpdateReply
    ]);

    return { nodes, onNodesChangeReactFlow };
};