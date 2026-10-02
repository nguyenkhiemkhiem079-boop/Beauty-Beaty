import { useState, useRef, useEffect } from 'react';
import './App.css';
import { faceLandmarkManager } from './engine/FaceLandmarkManager';
import { ImageEngine } from './engine/ImageEngine';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

type ToolType = 'skin' | 'hair' | 'face' | 'chin';

interface EditState {
  skin: number;
  face: number;
}

function App() {
  const [mode, setMode] = useState<'landing' | 'editor'>('landing');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('skin');
  const [isDetecting, setIsDetecting] = useState(false);
  
  // Edit state and history
  const [editState, setEditState] = useState<EditState>({ skin: 0, face: 0 });
  const [history, setHistory] = useState<EditState[]>([{ skin: 0, face: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ImageEngine | null>(null);
  const landmarksRef = useRef<NormalizedLandmark[][]>([]);

  useEffect(() => {
    // Pre-initialize landmarker
    faceLandmarkManager.initialize().catch(console.error);
  }, []);

  useEffect(() => {
    applyEffects();
  }, [editState]);

  const applyEffects = () => {
    if (!engineRef.current || !canvasRef.current) return;
    
    // Reset to original before applying ordered effects
    engineRef.current.reset();
    
    const landmarks = landmarksRef.current[0]; // assume 1 face for now
    
    if (editState.skin > 0 && landmarks) {
      engineRef.current.applySkinSmoothing(landmarks, editState.skin);
    }
    if (editState.face > 0 && landmarks) {
      engineRef.current.applyFaceSlimming(landmarks, editState.face);
    }
    
    // Draw back to visible canvas
    const ctx = canvasRef.current.getContext('2d');
    const workCanvas = engineRef.current.getCanvas();
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(workCanvas, 0, 0);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      
      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > MAX_SIZE || height > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Init engine
          engineRef.current = new ImageEngine(canvas);
          
          // Detect landmarks
          setIsDetecting(true);
          try {
            landmarksRef.current = await faceLandmarkManager.detectFaces(canvas);
            console.log("Landmarks detected:", landmarksRef.current.length > 0 ? "Yes" : "No");
          } catch (err) {
            console.error("Landmark detection failed", err);
          }
          setIsDetecting(false);
          
          // Reset state
          setEditState({ skin: 0, face: 0 });
          setHistory([{ skin: 0, face: 0 }]);
          setHistoryIndex(0);
        }
      };
      img.src = url;
    }
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'DBeaty_Export.png';
      a.click();
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setEditState(prev => ({ ...prev, [activeTool]: val }));
  };

  const commitHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(editState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setEditState(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setEditState(history[historyIndex + 1]);
    }
  };

  if (mode === 'editor') {
    return (
      <div className="editor-layout">
        <header className="editor-nav">
          <div className="brand">D'Beaty</div>
          <div>
            {imageSrc && (
              <>
                <button className="btn-primary" style={{ background: '#ddd', color: '#000', marginRight: '8px' }} onClick={handleUndo} disabled={historyIndex === 0}>Undo</button>
                <button className="btn-primary" style={{ background: '#ddd', color: '#000', marginRight: '16px' }} onClick={handleRedo} disabled={historyIndex === history.length - 1}>Redo</button>
                <button className="btn-primary" onClick={handleExport} style={{ marginRight: '16px' }}>Lưu & Xuất</button>
              </>
            )}
            <button className="btn-primary" onClick={() => setMode('landing')} style={{ background: 'var(--color-text-primary)' }}>Thoát</button>
          </div>
        </header>
        <main className="editor-workspace">
          <div className="sidebar">
            <div className="tool-list">
              <button className={`tool-item ${activeTool === 'skin' ? 'active' : ''}`} onClick={() => setActiveTool('skin')}>✨ Mịn da (Skin)</button>
              <button className={`tool-item ${activeTool === 'face' ? 'active' : ''}`} onClick={() => setActiveTool('face')}>👱‍♀️ Thon mặt (Face)</button>
              {/* Other tools disabled for spike */}
              <button className="tool-item" style={{ opacity: 0.5 }}>💆‍♀️ Mượt tóc (WIP)</button>
              <button className="tool-item" style={{ opacity: 0.5 }}>👇 Giảm nọng (WIP)</button>
            </div>
            
            <div style={{ marginTop: '40px' }}>
              <label className="btn-primary" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
                Chọn ảnh mới
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
          <div className="canvas-area">
            {!imageSrc ? (
              <div className="empty-state">
                <p>Chưa có ảnh nào được chọn</p>
                <label className="btn-primary" style={{ display: 'inline-block', marginTop: '16px', cursor: 'pointer' }}>
                  Nhập ảnh từ máy
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {isDetecting && <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>Đang phân tích khuôn mặt...</div>}
                <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
              </div>
            )}
          </div>
          <div className="parameter-panel">
            {imageSrc && (
              <>
                <h3>Cường độ: {activeTool === 'skin' ? 'Mịn da' : 'Thon mặt'}</h3>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={editState[activeTool as keyof EditState] || 0} 
                  onChange={handleSliderChange}
                  onMouseUp={commitHistory}
                  onTouchEnd={commitHistory}
                  style={{ width: '100%', marginTop: '16px' }} 
                />
                
                <p className="util-label" style={{ marginTop: '24px' }}>Trạng thái</p>
                <ul style={{ paddingLeft: '20px', fontSize: '14px', opacity: 0.8 }}>
                  <li>Faces detected: {landmarksRef.current.length}</li>
                  <li>Skin effect: {editState.skin}%</li>
                  <li>Face effect: {editState.face}%</li>
                </ul>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-page">
      <nav className="glass-nav">
        <div className="nav-container">
          <div className="brand">D'Beaty</div>
          <div className="menu">
            <a href="#features" className="util-label">Tính năng</a>
            <a href="#gallery" className="util-label">Thư viện</a>
            <a href="#pricing" className="util-label">Bảng giá</a>
          </div>
          <button className="btn-primary" onClick={() => setMode('editor')}>Mở Editor</button>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1 className="display">
              Vẻ đẹp <br /> <span className="accent-italic">hoàn mỹ</span> <br /> trong tầm tay
            </h1>
            <p className="hero-body">
              Công cụ chỉnh sửa ảnh chân dung chuyên nghiệp, mang đến vẻ đẹp tự nhiên chỉ với vài cú click. Ưu tiên xử lý Local-First, riêng tư & an toàn tuyệt đối.
            </p>
            <button className="cta-link" onClick={() => setMode('editor')}>
              Bắt đầu chỉnh sửa ngay &rarr;
            </button>
          </div>
          <div className="hero-visual">
            <div className="demo-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            </div>
            <div className="floating-badge">
              <span className="badge-number">01</span>
              <span className="badge-text">Mịn da AI</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
