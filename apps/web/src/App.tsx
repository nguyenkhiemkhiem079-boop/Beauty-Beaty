import { useState } from 'react';
import { Landing } from './components/Landing';
import { Editor } from './components/Editor';
import './App.css';

function App() {
  const [mode, setMode] = useState<'landing' | 'editor'>('landing');

  return (
    <>
      {mode === 'landing' ? (
        <Landing onStart={() => setMode('editor')} />
      ) : (
        <Editor onExit={() => setMode('landing')} />
      )}
    </>
  );
}

export default App;
