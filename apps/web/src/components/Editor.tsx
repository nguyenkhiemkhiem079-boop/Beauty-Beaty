import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  Undo2, Redo2, Download, ArrowLeft, Upload, Loader2, Sparkles, 
  UserRound, Droplets, Scissors, Minimize, Wand2, Eye, Smile, 
  Sliders, Palette, LayoutTemplate, SplitSquareVertical
} from 'lucide-react';
import { faceLandmarkManager } from '../engine/FaceLandmarkManager';
import { segmenterManager } from '../engine/SegmenterManager';
import { ImageEngine } from '../engine/ImageEngine';
import { useAppContext, DEFAULT_EDIT_STATE } from '../context';
import type { ToolCategory, ToolType } from '../context';
import { COLOR_FILTERS } from '../presets/filters';
import { POSTER_TEMPLATES } from '../presets/templates';

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
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('all');
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ImageEngine | null>(null);
  const uploadTokenRef = useRef(0);

  // Filter list by category
  const filteredFilters = useMemo(() => {
    if (activeFilterCategory === 'all') return COLOR_FILTERS;
    return COLOR_FILTERS.filter(f => f.category === activeFilterCategory);
  }, [activeFilterCategory]);

  const handleUndo = () => {
    setHistoryIndex(prev => {
      if (prev > 0) {
        setEditState({ ...history[prev - 1] });
        return prev - 1;
      }
      return prev;
    });
  };

  const handleRedo = () => {
    setHistoryIndex(prev => {
      if (prev < history.length - 1) {
        setEditState({ ...history[prev + 1] });
        return prev + 1;
      }
      return prev;
    });
  };

  const renderTemplateOverlay = (
    ctx: CanvasRenderingContext2D, 
    w: number, 
    h: number, 
    tpl: (typeof POSTER_TEMPLATES)[0]
  ) => {
    ctx.save();
    const scale = Math.max(w, h) / 800;

    // Optional border frame
    if (tpl.decorations.showBorders) {
      const pad = (tpl.decorations.framePadding || 5) * 0.01 * Math.min(w, h);
      ctx.strokeStyle = tpl.textColor;
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    }

    // Title / Headline
    ctx.textAlign = 'center';
    ctx.fillStyle = tpl.textColor;
    ctx.font = `900 ${32 * scale}px 'League Spartan', sans-serif`;
    ctx.letterSpacing = `${4 * scale}px`;
    ctx.fillText(tpl.title, w / 2, 60 * scale);

    // Subtitle
    ctx.fillStyle = tpl.accentColor;
    ctx.font = `700 ${12 * scale}px sans-serif`;
    ctx.letterSpacing = `${2 * scale}px`;
    ctx.fillText(tpl.subtitle, w / 2, 85 * scale);

    // Date Text
    ctx.font = `500 ${10 * scale}px sans-serif`;
    ctx.fillText(tpl.dateText, w / 2, 105 * scale);

    // Tagline near bottom
    ctx.fillStyle = tpl.textColor;
    ctx.font = `italic 600 ${13 * scale}px sans-serif`;
    ctx.fillText(tpl.tagline, w / 2, h - 55 * scale);

    // Footer credits
    ctx.font = `500 ${9 * scale}px sans-serif`;
    ctx.fillStyle = tpl.accentColor;
    ctx.fillText(tpl.footer, w / 2, h - 25 * scale);

    ctx.restore();
  };

  const showOriginal = () => {
    if (!canvasRef.current || !originalImage) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(originalImage, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const applyEffects = () => {
    if (!engineRef.current || !canvasRef.current || !originalImage) return;
    
    const faceLandmarks = landmarks?.[0];
    engineRef.current.applyPipeline(editState, faceLandmarks);
    
    const ctx = canvasRef.current.getContext('2d');
    const workCanvas = engineRef.current.getCanvas();
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(workCanvas, 0, 0);

      // Render Template overlay if active
      if (editState.template_id) {
        const tpl = POSTER_TEMPLATES.find(t => t.id === editState.template_id);
        if (tpl) {
          renderTemplateOverlay(ctx, canvasRef.current.width, canvasRef.current.height, tpl);
        }
      }
    }
  };

  useEffect(() => {
    // Re-initialize engine if we return to editor with an existing image
    if (originalImage && canvasRef.current && !engineRef.current) {
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
    if (!isComparing) {
      applyEffects();
    } else {
      showOriginal();
    }
  }, [editState, landmarks, segmentationMask, isComparing]);

  // Clean up WebGL on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setErrorMsg(null);
      
      const currentToken = ++uploadTokenRef.current;

      const img = new Image();
      img.onload = async () => {
        if (currentToken !== uploadTokenRef.current) return;

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
          
          // Dispose previous engine instance
          if (engineRef.current) {
            engineRef.current.dispose();
          }
          engineRef.current = new ImageEngine(canvas);
          
          setIsDetecting(true);
          try {
            await Promise.all([
               faceLandmarkManager.initialize(),
               segmenterManager.initialize()
            ]);
            
            if (currentToken !== uploadTokenRef.current) return;

            const lms = await faceLandmarkManager.detectFaces(canvas);
            const mask = await segmenterManager.segment(canvas);
            
            if (currentToken !== uploadTokenRef.current) return;

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
          
          if (currentToken !== uploadTokenRef.current) return;
          setIsDetecting(false);
          
          const initState = { ...DEFAULT_EDIT_STATE };
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
    
    // Create high-res canvas at native original dimensions
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = originalImage.width;
    exportCanvas.height = originalImage.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(originalImage, 0, 0);

    // Apply engine on native resolution
    const exportEngine = new ImageEngine(exportCanvas);
    if (segmentationMask) {
      exportEngine.setSegmentationMask(segmentationMask);
    }
    
    const faceLandmarks = landmarks?.[0];
    exportEngine.applyPipeline(editState, faceLandmarks);

    const resultCanvas = exportEngine.getCanvas();
    const resultCtx = resultCanvas.getContext('2d');

    // Overlay template if chosen
    if (resultCtx && editState.template_id) {
      const tpl = POSTER_TEMPLATES.find(t => t.id === editState.template_id);
      if (tpl) {
        renderTemplateOverlay(resultCtx, resultCanvas.width, resultCanvas.height, tpl);
      }
    }

    const dataUrl = resultCanvas.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `DBeaty_Export_${Date.now()}.png`;
    a.click();
    
    exportEngine.dispose();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setEditState(prev => ({ ...prev, [activeTool]: val }));
  };

  const commitHistory = () => {
    const currentState = editState;
    const previousState = history[historyIndex];
    
    if (JSON.stringify(currentState) === JSON.stringify(previousState)) {
      return;
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ ...currentState });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const resetCurrentCategory = () => {
    setEditState(prev => {
      const next = { ...prev };
      if (activeCategory === 'skin') {
        next.skin_smooth = 0;
        next.skin_brighten = 0;
      } else if (activeCategory === 'face') {
        next.face_slim = 0;
        next.chin_slim = 0;
      } else if (activeCategory === 'eyes') {
        next.eye_enlarge = 0;
      } else if (activeCategory === 'mouth') {
        next.teeth_whiten = 0;
      } else if (activeCategory === 'hair') {
        next.hair_smooth = 0;
      } else if (activeCategory === 'adjust') {
        next.brightness = 0;
        next.contrast = 0;
        next.saturation = 0;
        next.temperature = 0;
      } else if (activeCategory === 'filters') {
        next.filter_id = '';
      } else if (activeCategory === 'templates') {
        next.template_id = '';
      }
      return next;
    });
    setTimeout(commitHistory, 50);
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
            <div className="history-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="btn-icon" onClick={handleUndo} disabled={historyIndex === 0} title="Undo (Ctrl+Z)"><Undo2 size={18} /></button>
              <button className="btn-icon" onClick={handleRedo} disabled={historyIndex === history.length - 1} title="Redo (Ctrl+Shift+Z)"><Redo2 size={18} /></button>
              
              <button 
                className={`btn-compare ${isComparing ? 'active' : ''}`}
                onMouseDown={() => setIsComparing(true)}
                onMouseUp={() => setIsComparing(false)}
                onTouchStart={() => setIsComparing(true)}
                onTouchEnd={() => setIsComparing(false)}
                title="Nhấn giữ để xem ảnh gốc"
              >
                <SplitSquareVertical size={16} /> So sánh
              </button>
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
              <p>Tải lên một bức ảnh chân dung để trải nghiệm trọn bộ 82 công cụ D'Beaty AI.</p>
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
                  <span>Đang phân tích khuôn mặt & nhận diện AI...</span>
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
            {/* Category Navigation Bar */}
            <div className="category-tabs">
              <button className={`tab ${activeCategory === 'skin' ? 'active' : ''}`} onClick={() => { setActiveCategory('skin'); setActiveTool('skin_smooth'); }}>
                <Droplets size={18} />Da
              </button>
              <button className={`tab ${activeCategory === 'face' ? 'active' : ''}`} onClick={() => { setActiveCategory('face'); setActiveTool('face_slim'); }}>
                <UserRound size={18} />Mặt
              </button>
              <button className={`tab ${activeCategory === 'eyes' ? 'active' : ''}`} onClick={() => { setActiveCategory('eyes'); setActiveTool('eye_enlarge'); }}>
                <Eye size={18} />Mắt
              </button>
              <button className={`tab ${activeCategory === 'mouth' ? 'active' : ''}`} onClick={() => { setActiveCategory('mouth'); setActiveTool('teeth_whiten'); }}>
                <Smile size={18} />Môi & Răng
              </button>
              <button className={`tab ${activeCategory === 'hair' ? 'active' : ''}`} onClick={() => { setActiveCategory('hair'); setActiveTool('hair_smooth'); }}>
                <Scissors size={18} />Tóc
              </button>
              <button className={`tab ${activeCategory === 'adjust' ? 'active' : ''}`} onClick={() => { setActiveCategory('adjust'); setActiveTool('brightness'); }}>
                <Sliders size={18} />Chỉnh màu
              </button>
              <button className={`tab ${activeCategory === 'filters' ? 'active' : ''}`} onClick={() => { setActiveCategory('filters'); }}>
                <Palette size={18} />Bộ lọc (200+)
              </button>
              <button className={`tab ${activeCategory === 'templates' ? 'active' : ''}`} onClick={() => { setActiveCategory('templates'); }}>
                <LayoutTemplate size={18} />Khung & Bìa
              </button>
              <button className={`tab ${activeCategory === 'ai' ? 'active' : ''}`} onClick={() => { setActiveCategory('ai'); setActiveTool('ai_makeup'); }}>
                <Wand2 size={18} />Cloud AI
              </button>
            </div>

            <div className="tool-content">
              {/* SKIN CATEGORY */}
              {activeCategory === 'skin' && (
                <div className="tool-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="util-label">Làm đẹp da</h4>
                    <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none' }}>Đặt lại</button>
                  </div>
                  <div className={`tool-btn ${activeTool === 'skin_smooth' ? 'active' : ''}`} onClick={() => setActiveTool('skin_smooth')}>
                    <Sparkles size={16} /> B001: Mịn da tự nhiên
                  </div>
                  <div className={`tool-btn ${activeTool === 'skin_brighten' ? 'active' : ''}`} onClick={() => setActiveTool('skin_brighten')}>
                    <Sparkles size={16} /> B004: Sáng da & Nâng tone
                  </div>
                </div>
              )}

              {/* FACE CATEGORY */}
              {activeCategory === 'face' && (
                <div className="tool-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="util-label">Định hình khuôn mặt</h4>
                    <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none' }}>Đặt lại</button>
                  </div>
                  <div className={`tool-btn ${activeTool === 'face_slim' ? 'active' : ''}`} onClick={() => setActiveTool('face_slim')}>
                    <Minimize size={16} /> B013: Thon mặt (V-Line)
                  </div>
                  <div className={`tool-btn ${activeTool === 'chin_slim' ? 'active' : ''}`} onClick={() => setActiveTool('chin_slim')}>
                    <Minimize size={16} /> B019: Giảm nọng cằm Submental
                  </div>
                </div>
              )}

              {/* EYES CATEGORY */}
              {activeCategory === 'eyes' && (
                <div className="tool-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="util-label">Đôi mắt</h4>
                    <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none' }}>Đặt lại</button>
                  </div>
                  <div className={`tool-btn ${activeTool === 'eye_enlarge' ? 'active' : ''}`} onClick={() => setActiveTool('eye_enlarge')}>
                    <Eye size={16} /> B025: Mắt to tự nhiên (Radial Bulge)
                  </div>
                </div>
              )}

              {/* MOUTH & TEETH CATEGORY */}
              {activeCategory === 'mouth' && (
                <div className="tool-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="util-label">Môi & Răng</h4>
                    <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none' }}>Đặt lại</button>
                  </div>
                  <div className={`tool-btn ${activeTool === 'teeth_whiten' ? 'active' : ''}`} onClick={() => setActiveTool('teeth_whiten')}>
                    <Smile size={16} /> B043: Trắng răng tự nhiên
                  </div>
                </div>
              )}

              {/* HAIR CATEGORY */}
              {activeCategory === 'hair' && (
                <div className="tool-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="util-label">Chăm sóc tóc</h4>
                    <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none' }}>Đặt lại</button>
                  </div>
                  <div className={`tool-btn ${activeTool === 'hair_smooth' ? 'active' : ''}`} onClick={() => setActiveTool('hair_smooth')}>
                    <Scissors size={16} /> B063: Mượt tóc (Hair Segmentation)
                  </div>
                </div>
              )}

              {/* ADJUSTMENTS CATEGORY */}
              {activeCategory === 'adjust' && (
                <div className="tool-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="util-label">Chỉnh sửa toàn diện</h4>
                    <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none' }}>Đặt lại</button>
                  </div>
                  <div className={`tool-btn ${activeTool === 'brightness' ? 'active' : ''}`} onClick={() => setActiveTool('brightness')}>
                    <Sliders size={16} /> X018: Độ sáng
                  </div>
                  <div className={`tool-btn ${activeTool === 'contrast' ? 'active' : ''}`} onClick={() => setActiveTool('contrast')}>
                    <Sliders size={16} /> X018: Độ tương phản
                  </div>
                  <div className={`tool-btn ${activeTool === 'saturation' ? 'active' : ''}`} onClick={() => setActiveTool('saturation')}>
                    <Sliders size={16} /> X019: Độ bão hòa màu
                  </div>
                  <div className={`tool-btn ${activeTool === 'temperature' ? 'active' : ''}`} onClick={() => setActiveTool('temperature')}>
                    <Sliders size={16} /> X020: Nhiệt độ ấm / lạnh
                  </div>
                </div>
              )}

              {/* CURATED COLOR FILTERS (200+) */}
              {activeCategory === 'filters' && (
                <div className="tool-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 className="util-label">200+ Bộ lọc màu nghệ thuật</h4>
                    {editState.filter_id && (
                      <button onClick={() => setEditState(prev => ({ ...prev, filter_id: '' }))} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none' }}>Bỏ chọn</button>
                    )}
                  </div>
                  
                  {/* Category Chips */}
                  <div className="chip-container">
                    <button className={`filter-chip ${activeFilterCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('all')}>Tất cả (200)</button>
                    <button className={`filter-chip ${activeFilterCategory === 'film' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('film')}>Phim ảnh (35)</button>
                    <button className={`filter-chip ${activeFilterCategory === 'portrait' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('portrait')}>Chân dung (35)</button>
                    <button className={`filter-chip ${activeFilterCategory === 'cinematic' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('cinematic')}>Điện ảnh (35)</button>
                    <button className={`filter-chip ${activeFilterCategory === 'vintage' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('vintage')}>Cổ điển (30)</button>
                    <button className={`filter-chip ${activeFilterCategory === 'nature' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('nature')}>Thiên nhiên (35)</button>
                    <button className={`filter-chip ${activeFilterCategory === 'artistic' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('artistic')}>Nghệ thuật (30)</button>
                  </div>

                  {/* Filter Grid */}
                  <div className="filter-grid">
                    {filteredFilters.map(filter => (
                      <div 
                        key={filter.id}
                        className={`filter-card ${editState.filter_id === filter.id ? 'active' : ''}`}
                        onClick={() => {
                          setEditState(prev => ({ ...prev, filter_id: filter.id }));
                          setTimeout(commitHistory, 50);
                        }}
                      >
                        <div className="filter-name">{filter.nameVi}</div>
                        <div className="filter-category">{filter.name}</div>
                      </div>
                    ))}
                  </div>

                  {editState.filter_id && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Độ đậm bộ lọc</span>
                        <span style={{ fontSize: '13px', color: 'var(--color-accent)' }}>{editState.filter_intensity ?? 100}%</span>
                      </div>
                      <input 
                        type="range" 
                        className="premium-slider"
                        min="0" max="100" 
                        value={editState.filter_intensity ?? 100} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setEditState(prev => ({ ...prev, filter_intensity: val }));
                        }}
                        onMouseUp={commitHistory}
                        onTouchEnd={commitHistory}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* MAGAZINE & POSTER TEMPLATES */}
              {activeCategory === 'templates' && (
                <div className="tool-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 className="util-label">12 Khung Bìa & Poster</h4>
                    {editState.template_id && (
                      <button onClick={() => setEditState(prev => ({ ...prev, template_id: '' }))} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none' }}>Tắt khung</button>
                    )}
                  </div>
                  <div className="template-grid">
                    {POSTER_TEMPLATES.map(tpl => (
                      <div 
                        key={tpl.id}
                        className={`template-card ${editState.template_id === tpl.id ? 'active' : ''}`}
                        onClick={() => {
                          setEditState(prev => ({ ...prev, template_id: prev.template_id === tpl.id ? '' : tpl.id }));
                          setTimeout(commitHistory, 50);
                        }}
                      >
                        <div className="template-title">{tpl.nameVi}</div>
                        <div className="template-desc">{tpl.subtitle} • Tỷ lệ {tpl.aspectRatio}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CLOUD AI CATEGORY */}
              {activeCategory === 'ai' && (
                <div className="tool-group">
                  <h4 className="util-label">Cloud AI (Meitu API Integration)</h4>
                  <div className={`tool-btn ${activeTool === 'ai_makeup' ? 'active' : ''}`} onClick={() => {
                    setActiveTool('ai_makeup');
                    alert("Yêu cầu Meitu API Key & Worker Adapter. Theo kiến trúc độc lập, cloud API trả lỗi BLOCKED / NOT_IMPLEMENTED nếu thiếu entitlement của khách hàng.");
                  }}>
                    <Wand2 size={16} /> Trang điểm AI (Cloud Meitu)
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(38,38,38,0.6)', marginTop: '16px', lineHeight: 1.5 }}>
                    Mọi tác vụ AI đám mây đều được bảo vệ bởi ownershipToken, giới hạn tải lên 25MB, và xử lý bất đồng bộ chống treo ứng dụng.
                  </div>
                </div>
              )}

              {/* PARAMETER SLIDER (Active for adjustable tools) */}
              {activeCategory !== 'filters' && activeCategory !== 'templates' && activeCategory !== 'ai' && (
                <div className="parameter-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Cường độ</span>
                    <span style={{ fontSize: '14px', color: 'var(--color-accent)' }}>{(editState as any)[activeTool]}</span>
                  </div>
                  <input 
                    type="range" 
                    className="premium-slider"
                    min={activeCategory === 'adjust' ? "-100" : "0"} 
                    max="100" 
                    value={(editState as any)[activeTool] || 0} 
                    onChange={handleSliderChange}
                    onMouseUp={commitHistory}
                    onTouchEnd={commitHistory}
                    onKeyUp={commitHistory}
                  />
                </div>
              )}
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
