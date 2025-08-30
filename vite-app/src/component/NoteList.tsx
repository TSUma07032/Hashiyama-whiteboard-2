// NoteList.tsx
import React from "react";
import Note from "./Note";
import type { NoteData } from "./index.d";

/**
 * @filename NoteList.tsx
 * @fileoverview NoteListコンポーネントは、ノートのリストを表示し、ノートの追加・削除を管理します。
 * @author 守屋翼
 */

type NoteListProps = {
    notes: NoteData[];
    onDelete: (id: string) => void;
    onEdit: (id: string, newText: string) => void;
};

export default function NoteList({ notes, onDelete, onEdit }: NoteListProps) {
    return (
        <>
            {notes.map((note) => (
                <Note key={note.id} note={note} onDelete={onDelete} onEdit={onEdit} />
            ))}
        </>
    );
}