import { useState } from 'react';
import { Landing } from './components/Landing';
import { Editor } from './components/Editor';
import { AppProvider } from './context';
import './App.css';

function AppContent() {
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

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
