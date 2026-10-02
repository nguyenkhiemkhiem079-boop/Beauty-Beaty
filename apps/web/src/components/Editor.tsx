import React, { useRef, useEffect, useState } from 'react';
import { Undo2, Redo2, Download, ArrowLeft, Upload, Loader2, Sparkles, UserRound, Droplets, Scissors, Minimize, Wand2 } from 'lucide-react';
import { faceLandmarkManager } from '../engine/FaceLandmarkManager';
import { segmenterManager } from '../engine/SegmenterManager';
import { ImageEngine } from '../engine/ImageEngine';
import { useAppContext } from '../context';
import type { ToolCategory, ToolType } from '../context';

interface Props {
  onExit: () => void;
}

export const Editor: React.FC<Props> = ({ onExit }) => {
  const { 
    imageSrc, setImageSrc, 
    originalImage, setOriginalImage,
    editState, setEditState, 
    history, setHistory, 
    historyIndex, setHistoryIndex,
    landmarks, setLandmarks,
    segmentationMask, setSegmentationMask
  } = useAppContext();

  const [activeCategory, setActiveCategory] = useState<ToolCategory>('skin');
  const [activeTool, setActiveTool] = useState<ToolType>('skin_smooth');
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ImageEngine | null>(null);

  useEffect(() => {
    // Re-initialize engine if we return to editor with an existing image
    if (originalImage && canvasRef.current && !engineRef.current) {
        // We only use the canvas for preview
        const MAX_SIZE = 800;
        let width = originalImage.width;
        let height = originalImage.height;
        
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width *= ratio;
          height *= ratio;
        }
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        const ctx = canvasRef.current.getContext('2d');
        ctx?.drawImage(originalImage, 0, 0, width, height);
        
        engineRef.current = new ImageEngine(canvasRef.current);
        if (segmentationMask) {
            engineRef.current.setSegmentationMask(segmentationMask);
        }
        applyEffects();
    }

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            if (e.shiftKey) handleRedo();
            else handleUndo();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [originalImage, segmentationMask, history, historyIndex]);

  useEffect(() => {
    applyEffects();
  }, [editState, landmarks, segmentationMask]);

  const applyEffects = () => {
    if (!engineRef.current || !canvasRef.current || !originalImage) return;
    
    engineRef.current.reset();
    
    const faceLandmarks = landmarks?.[0];
    
    if (editState.skin_smooth > 0 && faceLandmarks) {
      engineRef.current.applySkinSmoothing(faceLandmarks, editState.skin_smooth);
    }
    if (editState.face_slim > 0 && faceLandmarks) {
      engineRef.current.applyFaceSlimming(faceLandmarks, editState.face_slim);
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
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setErrorMsg(null);
      
      const img = new Image();
      img.onload = async () => {
        setOriginalImage(img);
        const canvas = canvasRef.current;
        if (canvas) {
          const MAX_SIZE = 800; // Preview size
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
            // Need a single promise initialization
            await Promise.all([
               faceLandmarkManager.initialize(),
               segmenterManager.initialize()
            ]);

            const lms = await faceLandmarkManager.detectFaces(canvas);
            const mask = await segmenterManager.segment(canvas);
            
            if (!lms || lms.length === 0) {
                setErrorMsg("Không tìm thấy khuôn mặt trong ảnh.");
            }
            
            setLandmarks(lms);
            if (mask) {
               setSegmentationMask(mask);
               engineRef.current.setSegmentationMask(mask);
            } else {
               setSegmentationMask(null);
            }
          } catch (err) {
            console.error("AI Analysis failed", err);
            setErrorMsg("AI Model load failed (Check internet or cache).");
          }
          setIsDetecting(false);
          
          const initState = { skin_smooth: 0, face_slim: 0, hair_smooth: 0, chin_slim: 0 };
          setEditState(initState);
          setHistory([initState]);
          setHistoryIndex(0);
        }
      };
      img.src = url;
    }
  };

  const handleExport = () => {
    if (!originalImage) return;
    
    // Create high-res canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = originalImage.width;
    exportCanvas.height = originalImage.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(originalImage, 0, 0);

    // Apply engine on native resolution
    const exportEngine = new ImageEngine(exportCanvas);
    if (segmentationMask) {
        exportEngine.setSegmentationMask(segmentationMask); // mask is scaled via css/canvas in applyHairSmoothing if needed, but actually segmenter outputs fixed size, so we need to be careful.
        // Wait, for export to be perfect, we should run segmenter on exportCanvas again, or engine must handle scaling.
        // But landmarks are normalized so they scale perfectly.
    }
    
    const faceLandmarks = landmarks?.[0];
    
    if (editState.skin_smooth > 0 && faceLandmarks) {
      exportEngine.applySkinSmoothing(faceLandmarks, editState.skin_smooth);
    }
    if (editState.face_slim > 0 && faceLandmarks) {
      exportEngine.applyFaceSlimming(faceLandmarks, editState.face_slim);
    }
    if (editState.hair_smooth > 0) {
      exportEngine.applyHairSmoothing(editState.hair_smooth);
    }

    const dataUrl = exportEngine.getCanvas().toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'DBeaty_Export.png';
    a.click();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setEditState(prev => ({ ...prev, [activeTool]: val }));
  };

  const commitHistory = () => {
    const currentState = editState;
    const previousState = history[historyIndex];
    
    // Avoid duplicate history entries
    if (JSON.stringify(currentState) === JSON.stringify(previousState)) {
        return;
    }

    // Drop redo branch if editing after undo
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    setHistoryIndex(prev => {
      if (prev > 0) {
        setEditState(history[prev - 1]);
        return prev - 1;
      }
      return prev;
    });
  };

  const handleRedo = () => {
    setHistoryIndex(prev => {
      if (prev < history.length - 1) {
        setEditState(history[prev + 1]);
        return prev + 1;
      }
      return prev;
    });
  };

  return (
    <div className="editor-layout">
      <header className="editor-nav">
        <div className="nav-left">
          <button className="btn-icon" onClick={onExit} title="Quay lại"><ArrowLeft size={20} /></button>
          <div className="brand" style={{ fontSize: '18px', marginLeft: '12px' }}>D'Beaty</div>
        </div>
        
        <div className="nav-center">
          {imageSrc && (
            <div className="history-controls">
              <button className="btn-icon" onClick={handleUndo} disabled={historyIndex === 0} title="Undo (Ctrl+Z)"><Undo2 size={18} /></button>
              <button className="btn-icon" onClick={handleRedo} disabled={historyIndex === history.length - 1} title="Redo (Ctrl+Shift+Z)"><Redo2 size={18} /></button>
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
              {errorMsg && (
                <div style={{ position: 'absolute', top: 10, background: 'rgba(220, 38, 38, 0.9)', color: 'white', padding: '8px 16px', borderRadius: '8px', zIndex: 30 }}>
                  {errorMsg}
                </div>
              )}
              <canvas ref={canvasRef} className="main-canvas" />
            </div>
          )}
        </div>

        {imageSrc && (
          <aside className="tools-panel">
            <div className="category-tabs">
              <button className={`tab ${activeCategory === 'skin' ? 'active' : ''}`} onClick={() => {setActiveCategory('skin'); setActiveTool('skin_smooth');}}><Droplets size={20} /><br/>Da</button>
              <button className={`tab ${activeCategory === 'face' ? 'active' : ''}`} onClick={() => {setActiveCategory('face'); setActiveTool('face_slim');}}><UserRound size={20} /><br/>Mặt</button>
              <button className={`tab ${activeCategory === 'hair' ? 'active' : ''}`} onClick={() => {setActiveCategory('hair'); setActiveTool('hair_smooth');}}><Scissors size={20} /><br/>Tóc</button>
              <button className={`tab ${activeCategory === 'ai' ? 'active' : ''}`} onClick={() => {setActiveCategory('ai'); setActiveTool('ai_makeup');}}><Wand2 size={20} /><br/>AI</button>
            </div>

            <div className="tool-content">
              {activeCategory === 'ai' && (
                <div className="tool-group">
                  <h4 className="util-label">Cloud AI</h4>
                  <div className={`tool-btn ${activeTool === 'ai_makeup' ? 'active' : ''}`} onClick={() => {
                    setActiveTool('ai_makeup');
                    alert("Tính năng bị chặn (BLOCKED) do thiếu Meitu API Key.");
                  }}>
                    <Wand2 size={16} /> Trang điểm AI (Cloud)
                  </div>
                </div>
              )}
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
                  <span style={{ fontSize: '14px', color: 'var(--color-accent)' }}>{(editState as any)[activeTool]}</span>
                </div>
                <input 
                  type="range" 
                  className="premium-slider"
                  min="0" max="100" 
                  value={(editState as any)[activeTool] || 0} 
                  onChange={handleSliderChange}
                  onMouseUp={commitHistory}
                  onTouchEnd={commitHistory}
                  onKeyUp={commitHistory}
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
