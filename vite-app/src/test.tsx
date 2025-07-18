import "./App.css";
import NoteList from "./component/NoteList";

function App() {
  return (
    <NoteList
        initialNotes={[
            { id: "1", text: "ノート1 (ドラッグできます)", x: 100, y: 100 },
            { id: "2", text: "ノート2 (削除できます)", x: 300, y: 150 },]}
    />
  );
}

export default App;
