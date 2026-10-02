import React, { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, Download, ArrowLeft, Upload, Loader2, Sparkles, UserRound, Droplets, Scissors, Minimize } from 'lucide-react';
import { faceLandmarkManager } from '../engine/FaceLandmarkManager';
import { segmenterManager } from '../engine/SegmenterManager';
import { ImageEngine } from '../engine/ImageEngine';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

type ToolCategory = 'skin' | 'face' | 'hair' | 'body';
type ToolType = 'skin_smooth' | 'face_slim' | 'hair_smooth' | 'chin_slim';

interface EditState {
  skin_smooth: number;
  face_slim: number;
  hair_smooth: number;
  chin_slim: number;
}

interface Props {
  onExit: () => void;
}

export const Editor: React.FC<Props> = ({ onExit }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('skin');
  const [activeTool, setActiveTool] = useState<ToolType>('skin_smooth');
  const [isDetecting, setIsDetecting] = useState(false);
  
  const [editState, setEditState] = useState<EditState>({ skin_smooth: 0, face_slim: 0, hair_smooth: 0, chin_slim: 0 });
  const [history, setHistory] = useState<EditState[]>([{ skin_smooth: 0, face_slim: 0, hair_smooth: 0, chin_slim: 0 }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ImageEngine | null>(null);
  const landmarksRef = useRef<NormalizedLandmark[][]>([]);

  useEffect(() => {
    faceLandmarkManager.initialize().catch(console.error);
    segmenterManager.initialize().catch(console.error);
  }, []);

  useEffect(() => {
    applyEffects();
  }, [editState]);

  const applyEffects = () => {
    if (!engineRef.current || !canvasRef.current) return;
    
    engineRef.current.reset();
    const landmarks = landmarksRef.current[0];
    
    if (editState.skin_smooth > 0 && landmarks) {
      engineRef.current.applySkinSmoothing(landmarks, editState.skin_smooth);
    }
    if (editState.face_slim > 0 && landmarks) {
      engineRef.current.applyFaceSlimming(landmarks, editState.face_slim);
    }
    if (editState.hair_smooth > 0) {
      engineRef.current.applyHairSmoothing(editState.hair_smooth);
    }
    
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
          const MAX_SIZE = 1200; // Increased max size for better premium feel
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
          
          engineRef.current = new ImageEngine(canvas);
          
          setIsDetecting(true);
          try {
            landmarksRef.current = await faceLandmarkManager.detectFaces(canvas);
            const mask = await segmenterManager.segment(canvas);
            if (mask) {
               engineRef.current.setSegmentationMask(mask);
            }
          } catch (err) {
            console.error("AI Analysis failed", err);
          }
          setIsDetecting(false);
          
          setEditState({ skin_smooth: 0, face_slim: 0, hair_smooth: 0, chin_slim: 0 });
          setHistory([{ skin_smooth: 0, face_slim: 0, hair_smooth: 0, chin_slim: 0 }]);
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

  return (
    <div className="editor-layout">
      {/* Top Navigation */}
      <header className="editor-nav">
        <div className="nav-left">
          <button className="btn-icon" onClick={onExit} title="Quay lại"><ArrowLeft size={20} /></button>
          <div className="brand" style={{ fontSize: '18px', marginLeft: '12px' }}>D'Beaty</div>
        </div>
        
        <div className="nav-center">
          {imageSrc && (
            <div className="history-controls">
              <button className="btn-icon" onClick={handleUndo} disabled={historyIndex === 0} title="Undo"><Undo2 size={18} /></button>
              <button className="btn-icon" onClick={handleRedo} disabled={historyIndex === history.length - 1} title="Redo"><Redo2 size={18} /></button>
            </div>
          )}
        </div>
        
        <div className="nav-right">
          {imageSrc && (
            <button className="btn-primary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> Lưu & Xuất
            </button>
          )}
        </div>
      </header>

      <main className="editor-workspace">
        {/* Main Canvas Area */}
        <div className="canvas-area">
          {!imageSrc ? (
            <div className="empty-state">
              <Upload size={48} className="empty-icon" />
              <h3>Bắt đầu sáng tạo</h3>
              <p>Tải lên một bức ảnh chân dung để trải nghiệm sức mạnh của D'Beaty AI.</p>
              <label className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '24px', cursor: 'pointer' }}>
                <Upload size={18} /> Chọn ảnh từ máy
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>
          ) : (
            <div className="canvas-container">
              {isDetecting && (
                <div className="loading-overlay">
                  <Loader2 className="spinner" size={32} />
                  <span>Đang phân tích AI...</span>
                </div>
              )}
              <canvas ref={canvasRef} className="main-canvas" />
            </div>
          )}
        </div>

        {/* Right Tools Panel */}
        {imageSrc && (
          <aside className="tools-panel">
            <div className="category-tabs">
              <button className={`tab ${activeCategory === 'skin' ? 'active' : ''}`} onClick={() => {setActiveCategory('skin'); setActiveTool('skin_smooth');}}><Droplets size={20} /><br/>Da</button>
              <button className={`tab ${activeCategory === 'face' ? 'active' : ''}`} onClick={() => {setActiveCategory('face'); setActiveTool('face_slim');}}><UserRound size={20} /><br/>Mặt</button>
              <button className={`tab ${activeCategory === 'hair' ? 'active' : ''}`} onClick={() => {setActiveCategory('hair'); setActiveTool('hair_smooth');}}><Scissors size={20} /><br/>Tóc</button>
            </div>

            <div className="tool-content">
              {activeCategory === 'skin' && (
                <div className="tool-group">
                  <h4 className="util-label">Làm đẹp da</h4>
                  <div className={`tool-btn ${activeTool === 'skin_smooth' ? 'active' : ''}`} onClick={() => setActiveTool('skin_smooth')}>
                    <Sparkles size={16} /> Mịn da tự nhiên
                  </div>
                </div>
              )}

              {activeCategory === 'face' && (
                <div className="tool-group">
                  <h4 className="util-label">Định hình khuôn mặt</h4>
                  <div className={`tool-btn ${activeTool === 'face_slim' ? 'active' : ''}`} onClick={() => setActiveTool('face_slim')}>
                    <Minimize size={16} /> Thon mặt (V-Line)
                  </div>
                  <div className={`tool-btn ${activeTool === 'chin_slim' ? 'active' : ''}`} onClick={() => setActiveTool('chin_slim')} style={{opacity: 0.5}}>
                    <Minimize size={16} /> Giảm nọng cằm (WIP)
                  </div>
                </div>
              )}
              
              {activeCategory === 'hair' && (
                <div className="tool-group">
                  <h4 className="util-label">Chăm sóc tóc</h4>
                  <div className={`tool-btn ${activeTool === 'hair_smooth' ? 'active' : ''}`} onClick={() => setActiveTool('hair_smooth')}>
                    <Sparkles size={16} /> Mượt tóc
                  </div>
                </div>
              )}

              <div className="parameter-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Cường độ</span>
                  <span style={{ fontSize: '14px', color: 'var(--color-accent)' }}>{editState[activeTool]}</span>
                </div>
                <input 
                  type="range" 
                  className="premium-slider"
                  min="0" max="100" 
                  value={editState[activeTool] || 0} 
                  onChange={handleSliderChange}
                  onMouseUp={commitHistory}
                  onTouchEnd={commitHistory}
                />
              </div>
            </div>
            
            <div className="panel-footer">
              <label className="btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
                Đổi ảnh khác
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
};
