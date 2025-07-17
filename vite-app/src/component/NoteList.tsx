import React, { useState } from "react";
import Note from "./Note";
import NoteInput from "./NoteInput";
import type { NoteData } from "./index.d";
import { nanoid } from "nanoid"; // gemini君が指示した、乱数生成のためのライブラリ
import { DndContext, type DragEndEvent } from "@dnd-kit/core";

/**
 * @filename NoteList.tsx
 * @fileoverview NoteListコンポーネントは、ノートのリストを表示し、ノートの追加・削除を管理します。
 * @author 守屋翼
 */

type NoteListProps = {
    initialNotes?: NoteData[];
};

// 新しいノートが追加されるデフォルトの座標
const DEFAULT_NOTE_POSITION = { x: 50, y: 150 };





export default function NoteList({ initialNotes = [] }: NoteListProps) { 
    // 引数として何も渡されなければ、初期ノートは空の配列になる

    // 複数のノートを配列で管理するように変更
    const [notes, setNotes] = useState<NoteData[]>(initialNotes);

    // ノート追加処理 (NoteInputから呼ばれる)
    const handleAddNote = (text: string) => {
        const newNote: NoteData = {
            id: nanoid(), // ユニークIDを生成
            text,
            x: DEFAULT_NOTE_POSITION.x,
            y: DEFAULT_NOTE_POSITION.y,
        };
        setNotes((prevNotes) => [...prevNotes, newNote]);
    };

    // ノート削除処理 (Noteから呼ばれる)
    // イミュータブルな削除を実現しているらしい
    const handleDelete = (idToDelete: string) => {
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== idToDelete));
        console.log(`ノート (id: ${idToDelete}) を削除しました。`);
    };

    // ドラッグ終了時のハンドラ
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, delta } = event;
        setNotes((prevNotes) =>
            prevNotes.map((note) =>
                note.id === active.id ? { ...note, x: note.x + delta.x, y: note.y + delta.y } : note
            )
        );
    };

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <NoteInput onAddNote={handleAddNote} />
            {notes.map((note) => (
                <Note key={note.id} note={note} onDelete={handleDelete} />
            ))}
        </DndContext>
    );
}