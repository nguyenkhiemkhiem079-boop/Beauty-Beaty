import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  Undo2, Redo2, Download, ArrowLeft, Upload, Loader2, Sparkles, 
  UserRound, Droplets, Scissors, Minimize, Wand2, Eye, Smile, 
  Sliders, Palette, LayoutTemplate, SplitSquareVertical, Crop,
  LayoutGrid, Save, Bookmark, CircleDot
} from 'lucide-react';
import { faceLandmarkManager } from '../engine/FaceLandmarkManager';
import { segmenterManager } from '../engine/SegmenterManager';
import { ImageEngine } from '../engine/ImageEngine';
import { useAppContext, DEFAULT_EDIT_STATE } from '../context';
import type { ToolCategory, ToolType, TemplateCustomText, CropOperation, HealingOperation, EditState } from '../context';
import { COLOR_FILTERS } from '../presets/filters';
import { POSTER_TEMPLATES } from '../presets/templates';
import { CollageMaker } from './CollageMaker';
import { saveDraft, loadLatestDraft, clearAllDrafts, type AppDraft } from '../utils/draftStorage';

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
  const [isCollageOpen, setIsCollageOpen] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState<AppDraft | null>(null);
  const [draftToast, setDraftToast] = useState<string | null>(null);
  const [blemishRadius, setBlemishRadius] = useState(16);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ImageEngine | null>(null);
  const uploadTokenRef = useRef(0);
  const originalDataUrlRef = useRef<string | null>(null);

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
    tpl: (typeof POSTER_TEMPLATES)[0],
    customText?: TemplateCustomText,
    placement: 'top' | 'center' | 'bottom' = 'top'
  ) => {
    ctx.save();
    const scale = Math.max(w, h) / 800;

    const title = customText?.title ?? tpl.title;
    const subtitle = customText?.subtitle ?? tpl.subtitle;
    const dateText = customText?.dateText ?? tpl.dateText;
    const tagline = customText?.tagline ?? tpl.tagline;
    const footer = customText?.footer ?? tpl.footer;

    // Optional border frame
    if (tpl.decorations.showBorders) {
      const pad = (tpl.decorations.framePadding || 5) * 0.01 * Math.min(w, h);
      ctx.strokeStyle = tpl.textColor;
      ctx.lineWidth = 2 * scale;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    }

    let topOffset = 0;
    if (placement === 'center') topOffset = h * 0.35;
    else if (placement === 'bottom') topOffset = h * 0.65;

    // Title / Headline
    ctx.textAlign = 'center';
    ctx.fillStyle = tpl.textColor;
    ctx.font = `900 ${32 * scale}px 'League Spartan', sans-serif`;
    ctx.fillText(title, w / 2, (60 * scale) + topOffset);

    // Subtitle
    ctx.fillStyle = tpl.accentColor;
    ctx.font = `700 ${12 * scale}px sans-serif`;
    ctx.fillText(subtitle, w / 2, (85 * scale) + topOffset);

    // Date Text
    ctx.font = `500 ${10 * scale}px sans-serif`;
    ctx.fillText(dateText, w / 2, (105 * scale) + topOffset);

    // Tagline & Footer near bottom
    if (placement !== 'bottom') {
      ctx.fillStyle = tpl.textColor;
      ctx.font = `italic 600 ${13 * scale}px sans-serif`;
      ctx.fillText(tagline, w / 2, h - 55 * scale);

      ctx.font = `500 ${9 * scale}px sans-serif`;
      ctx.fillStyle = tpl.accentColor;
      ctx.fillText(footer, w / 2, h - 25 * scale);
    }

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

  const getOriginalDataUrl = (): string | null => {
    if (originalDataUrlRef.current) return originalDataUrlRef.current;
    if (!originalImage) return null;
    try {
      const c = document.createElement('canvas');
      c.width = originalImage.width;
      c.height = originalImage.height;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(originalImage, 0, 0);
      const dataUrl = c.toDataURL('image/png');
      originalDataUrlRef.current = dataUrl;
      return dataUrl;
    } catch (e) {
      console.warn('Failed to generate original data URL:', e);
      return null;
    }
  };

  const applyEffects = () => {
    if (!engineRef.current || !canvasRef.current || !originalImage) return;
    
    const faceLandmarks = landmarks?.[0];
    engineRef.current.applyPipeline(editState, faceLandmarks);
    
    const workCanvas = engineRef.current.getCanvas();
    if (canvasRef.current.width !== workCanvas.width || canvasRef.current.height !== workCanvas.height) {
      canvasRef.current.width = workCanvas.width;
      canvasRef.current.height = workCanvas.height;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(workCanvas, 0, 0);

      // Render Template overlay if active
      if (editState.template_id) {
        const tpl = POSTER_TEMPLATES.find(t => t.id === editState.template_id);
        if (tpl) {
          renderTemplateOverlay(
            ctx, 
            canvasRef.current.width, 
            canvasRef.current.height, 
            tpl,
            editState.template_custom_text,
            editState.template_placement || 'top'
          );
        }
      }
    }
  };

  // Re-initialize engine if we return to editor with an existing image
  useEffect(() => {
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

  // Check for saved draft in IndexedDB on initial mount
  useEffect(() => {
    loadLatestDraft().then(draft => {
      if (draft && !originalImage) {
        setDraftAvailable(draft);
      }
    });
  }, []);

  // Auto-save draft to IndexedDB on edits
  useEffect(() => {
    if (!originalImage) return;
    const timer = setTimeout(async () => {
      const origUrl = getOriginalDataUrl();
      if (!origUrl) return;
      try {
        const draft: AppDraft = {
          id: 'latest_active_draft',
          originalDataUrl: origUrl,
          originalWidth: originalImage.width,
          originalHeight: originalImage.height,
          editState,
          history,
          historyIndex,
          timestamp: Date.now()
        };
        await saveDraft(draft);
      } catch (e) {
        console.warn('Auto-save draft failed:', e);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [editState, history, historyIndex, originalImage]);

  const handleManualSaveDraft = async () => {
    const origUrl = getOriginalDataUrl();
    if (!origUrl || !originalImage) {
      setErrorMsg('Không tìm thấy ảnh gốc để lưu bản thảo.');
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    try {
      const draft: AppDraft = {
        id: 'latest_active_draft',
        originalDataUrl: origUrl,
        originalWidth: originalImage.width,
        originalHeight: originalImage.height,
        editState,
        history,
        historyIndex,
        timestamp: Date.now()
      };
      const res = await saveDraft(draft);
      if (res.success) {
        setDraftToast('Đã lưu bản thảo vào IndexedDB thành công!');
        setTimeout(() => setDraftToast(null), 3000);
      } else {
        setErrorMsg(res.error || 'Lưu bản thảo thất bại');
        setTimeout(() => setErrorMsg(null), 4000);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || 'Lỗi lưu bản thảo');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleRestoreDraft = (draft: AppDraft) => {
    const img = new Image();
    img.onload = async () => {
      setOriginalImage(img);
      originalDataUrlRef.current = draft.originalDataUrl;
      setImageSrc(draft.originalDataUrl);
      setEditState(draft.editState);
      setHistory(draft.history);
      setHistoryIndex(draft.historyIndex);
      setDraftAvailable(null);

      const MAX_SIZE = 800;
      let width = img.width;
      let height = img.height;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
        width *= ratio;
        height *= ratio;
      }

      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        const ctx = canvasRef.current.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        if (engineRef.current) {
          engineRef.current.dispose();
        }
        engineRef.current = new ImageEngine(canvasRef.current);

        setIsDetecting(true);
        try {
          await Promise.all([
            faceLandmarkManager.initialize(),
            segmenterManager.initialize()
          ]);
          const [detectedLandmarks, segResult] = await Promise.all([
            faceLandmarkManager.detectFaces(canvasRef.current),
            segmenterManager.segment(canvasRef.current)
          ]);
          setLandmarks(detectedLandmarks);
          setSegmentationMask(segResult || null);
          if (engineRef.current && segResult) {
            engineRef.current.setSegmentationMask(segResult);
          }
          if (engineRef.current) {
            engineRef.current.applyPipeline(draft.editState, detectedLandmarks?.[0]);
            const work = engineRef.current.getCanvas();
            canvasRef.current.width = work.width;
            canvasRef.current.height = work.height;
            const c = canvasRef.current.getContext('2d');
            c?.drawImage(work, 0, 0);
          }
        } catch (err: any) {
          console.warn('AI init on restore error:', err);
        } finally {
          setIsDetecting(false);
        }
      }
    };
    img.src = draft.originalDataUrl;
  };

  const handleDiscardDraft = async () => {
    await clearAllDrafts();
    setDraftAvailable(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const currentToken = ++uploadTokenRef.current;
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setLandmarks(null);
      setSegmentationMask(null);
      setErrorMsg(null);

      // Read file to preserve original immutable data URL
      const reader = new FileReader();
      reader.onload = () => {
        originalDataUrlRef.current = reader.result as string;
      };
      reader.readAsDataURL(file);
      setImageSrc(url);
      setLandmarks(null);
      setSegmentationMask(null);
      setErrorMsg(null);
      
      const img = new Image();
      img.onload = async () => {
        if (currentToken !== uploadTokenRef.current) return;

        setOriginalImage(img);

        const MAX_SIZE = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width *= ratio;
          height *= ratio;
        }

        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
          const ctx = canvasRef.current.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          if (engineRef.current) {
            engineRef.current.dispose();
          }
          engineRef.current = new ImageEngine(canvasRef.current);

          setIsDetecting(true);
          try {
            await Promise.all([
              faceLandmarkManager.initialize(),
              segmenterManager.initialize()
            ]);

            if (currentToken !== uploadTokenRef.current) return;

            const [detectedLandmarks, segResult] = await Promise.all([
              faceLandmarkManager.detectFaces(canvasRef.current),
              segmenterManager.segment(canvasRef.current)
            ]);

            if (currentToken !== uploadTokenRef.current) return;

            setLandmarks(detectedLandmarks);
            setSegmentationMask(segResult || null);
            if (engineRef.current && segResult) {
              engineRef.current.setSegmentationMask(segResult);
            }

            if (detectedLandmarks.length === 0) {
              setErrorMsg("Không tìm thấy khuôn mặt trong ảnh. Bạn vẫn có thể sử dụng các công cụ chỉnh màu, bộ lọc và ghép poster.");
            }
          } catch (err: any) {
            if (currentToken === uploadTokenRef.current) {
              console.error("AI Model Error:", err);
              setErrorMsg("Khởi tạo mô hình AI thất bại. Hãy thử lại.");
            }
          } finally {
            if (currentToken === uploadTokenRef.current) {
              setIsDetecting(false);
            }
          }

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
    
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = originalImage.width;
    exportCanvas.height = originalImage.height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(originalImage, 0, 0);

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
        renderTemplateOverlay(
          resultCtx, 
          resultCanvas.width, 
          resultCanvas.height, 
          tpl,
          editState.template_custom_text,
          editState.template_placement || 'top'
        );
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

  const commitHistory = (stateToCommit?: EditState | React.SyntheticEvent | unknown) => {
    const currentState = (stateToCommit && typeof stateToCommit === 'object' && 'skin_smooth' in stateToCommit)
      ? (stateToCommit as EditState)
      : editState;
    const previousState = history[historyIndex];
    
    if (JSON.stringify(currentState) === JSON.stringify(previousState)) {
      return;
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ ...currentState });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Spot Blemish Healing on Canvas Click (B002) - Declarative Graph Operation
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'skin_blemish' || !canvasRef.current || !engineRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;

    // Coordinate mapping: from current canvas space into uncropped original image normalized space
    const cropX = editState.crop?.x ?? 0;
    const cropY = editState.crop?.y ?? 0;
    const cropW = editState.crop?.width ?? 1;
    const cropH = editState.crop?.height ?? 1;

    const origX = cropX + u * cropW;
    const origY = cropY + v * cropH;
    const radiusNorm = (blemishRadius / canvasRef.current.height) * cropH;

    const newOp: HealingOperation = {
      id: 'heal_' + Date.now(),
      x: origX,
      y: origY,
      radiusNorm
    };

    const nextState: EditState = {
      ...editState,
      healings: [...(editState.healings || []), newOp]
    };

    setEditState(nextState);
    commitHistory(nextState);
  };

  // Direct Aspect Ratio Crop (B090 / X020) - Declarative Graph Operation
  const handleApplyCrop = (ratio: '1:1' | '4:5' | '3:4' | '9:16' | 'original') => {
    if (!originalImage) return;

    let cropOp: CropOperation = {
      aspectRatio: ratio,
      x: 0,
      y: 0,
      width: 1,
      height: 1
    };

    if (ratio !== 'original') {
      let targetRatio = 1.0;
      switch (ratio) {
        case '1:1': targetRatio = 1.0; break;
        case '4:5': targetRatio = 4 / 5; break;
        case '3:4': targetRatio = 3 / 4; break;
        case '9:16': targetRatio = 9 / 16; break;
      }
      const origW = originalImage.width;
      const origH = originalImage.height;
      const currentRatio = origW / origH;

      let w_n = 1.0, h_n = 1.0, x_n = 0.0, y_n = 0.0;
      if (currentRatio > targetRatio) {
        w_n = targetRatio / currentRatio;
        h_n = 1.0;
        x_n = (1.0 - w_n) / 2;
        y_n = 0.0;
      } else {
        w_n = 1.0;
        h_n = currentRatio / targetRatio;
        x_n = 0.0;
        y_n = (1.0 - h_n) / 2;
      }

      cropOp = {
        aspectRatio: ratio,
        x: x_n,
        y: y_n,
        width: w_n,
        height: h_n
      };
    }

    const nextState: EditState = {
      ...editState,
      crop: cropOp
    };

    setEditState(nextState);
    commitHistory(nextState);
  };

  const resetCurrentCategory = () => {
    setEditState(prev => {
      const next = { ...prev };
      if (activeCategory === 'skin') {
        next.skin_smooth = 0;
        next.skin_brighten = 0;
        next.skin_oil = 0;
        next.skin_tone = 0;
        next.nasolabial = 0;
        next.dark_circles = 0;
        next.skin_detail = 0;
      } else if (activeCategory === 'face') {
        next.face_slim = 0;
        next.chin_slim = 0;
        next.jaw_slim = 0;
        next.chin_vline = 0;
        next.body_slim = 0;
      } else if (activeCategory === 'eyes') {
        next.eye_enlarge = 0;
        next.eye_bright = 0;
        next.eye_catchlight = 0;
      } else if (activeCategory === 'mouth') {
        next.teeth_whiten = 0;
      } else if (activeCategory === 'hair') {
        next.hair_smooth = 0;
        next.hair_shine = 0;
      } else if (activeCategory === 'adjust') {
        next.brightness = 0;
        next.contrast = 0;
        next.saturation = 0;
        next.temperature = 0;
        next.tint = 0;
        next.collarbone = 0;
      } else if (activeCategory === 'filters') {
        next.filter_id = '';
      } else if (activeCategory === 'templates') {
        next.template_id = '';
        next.template_custom_text = undefined;
      }
      return next;
    });
    setTimeout(commitHistory, 50);
  };

  // If collage maker is open, render collage workspace
  if (isCollageOpen) {
    return <CollageMaker onBack={() => setIsCollageOpen(false)} />;
  }

  return (
    <div className="editor-layout">
      {/* Draft Available Banner */}
      {draftAvailable && !imageSrc && (
        <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', border: '1px solid #d4af37', padding: '12px 24px', borderRadius: '8px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <Bookmark size={20} color="#d4af37" />
          <span style={{ fontSize: '13px', color: '#f8fafc' }}>Tìm thấy bản thảo chưa hoàn tất từ phiên làm việc trước ({new Date(draftAvailable.timestamp).toLocaleTimeString()}).</span>
          <button onClick={() => handleRestoreDraft(draftAvailable)} style={{ background: '#d4af37', color: '#000', fontWeight: 600, border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}>Khôi phục</button>
          <button onClick={handleDiscardDraft} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Bỏ qua</button>
        </div>
      )}

      {/* Draft Saved Toast */}
      {draftToast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#10b981', color: '#ffffff', padding: '10px 18px', borderRadius: '6px', zIndex: 100, fontWeight: 500, fontSize: '13px', boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}>
          {draftToast}
        </div>
      )}

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

              <button 
                onClick={handleManualSaveDraft}
                className="btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '12px' }}
                title="Lưu bản thảo vào IndexedDB"
              >
                <Save size={14} /> Lưu nháp
              </button>
            </div>
          )}
        </div>
        
        <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => setIsCollageOpen(true)}
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px' }}
          >
            <LayoutGrid size={15} color="#d4af37" /> Ghép ảnh
          </button>
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
              <canvas 
                ref={canvasRef} 
                className="main-canvas" 
                onClick={handleCanvasClick}
                style={{ cursor: activeTool === 'skin_blemish' ? 'crosshair' : 'default' }}
              />
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
              <button className={`tab ${activeCategory === 'crop' ? 'active' : ''}`} onClick={() => { setActiveCategory('crop'); setActiveTool('crop'); }}>
                <Crop size={18} />Cắt ảnh
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
                    <Sparkles size={16} /> B009: Sáng da &amp; Nâng tone
                  </div>
                  <div className={`tool-btn ${activeTool === 'skin_oil' ? 'active' : ''}`} onClick={() => setActiveTool('skin_oil')}>
                    <Droplets size={16} /> B006: Khử bóng dầu Matte
                  </div>
                  <div className={`tool-btn ${activeTool === 'skin_tone' ? 'active' : ''}`} onClick={() => setActiveTool('skin_tone')}>
                    <Palette size={16} /> B008: Tông da (Ấm ↔ Hồng)
                  </div>
                  <div className={`tool-btn ${activeTool === 'nasolabial' ? 'active' : ''}`} onClick={() => setActiveTool('nasolabial')}>
                    <Sparkles size={16} /> B005: Giảm rãnh cười
                  </div>
                  <div className={`tool-btn ${activeTool === 'dark_circles' ? 'active' : ''}`} onClick={() => setActiveTool('dark_circles')}>
                    <Eye size={16} /> B011: Giảm quầng thâm mắt
                  </div>
                  <div className={`tool-btn ${activeTool === 'skin_detail' ? 'active' : ''}`} onClick={() => setActiveTool('skin_detail')}>
                    <Sparkles size={16} /> B010: Khôi phục chi tiết da
                  </div>
                  <div className={`tool-btn ${activeTool === 'skin_blemish' ? 'active' : ''}`} onClick={() => setActiveTool('skin_blemish')}>
                    <CircleDot size={16} /> B002: Chấm xóa thâm mụn (Healing Brush)
                  </div>
                  {activeTool === 'skin_blemish' && (
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', marginTop: '10px', fontSize: '12px', border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>Cọ xóa thâm mụn:</p>
                      <p style={{ margin: '0 0 8px 0', color: '#64748b' }}>Nhấp chuột trực tiếp lên nốt mụn/vết thâm trên ảnh để loại bỏ tự nhiên.</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span>Kích thước cọ:</span>
                        <span>{blemishRadius}px</span>
                      </div>
                      <input type="range" min="6" max="35" value={blemishRadius} onChange={e => setBlemishRadius(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--color-accent)' }} />
                    </div>
                  )}
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
                  <div className={`tool-btn ${activeTool === 'jaw_slim' ? 'active' : ''}`} onClick={() => setActiveTool('jaw_slim')}>
                    <Minimize size={16} /> B016: Định hình đường hàm
                  </div>
                  <div className={`tool-btn ${activeTool === 'chin_vline' ? 'active' : ''}`} onClick={() => setActiveTool('chin_vline')}>
                    <Minimize size={16} /> B017: Cằm V-Line thanh tú
                  </div>
                  <div className={`tool-btn ${activeTool === 'chin_slim' ? 'active' : ''}`} onClick={() => setActiveTool('chin_slim')}>
                    <Minimize size={16} /> B019: Giảm nọng cằm Submental
                  </div>
                  <div className={`tool-btn ${activeTool === 'body_slim' ? 'active' : ''}`} onClick={() => setActiveTool('body_slim')}>
                    <UserRound size={16} /> B075: Thon eo (Body Slim)
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
                  <div className={`tool-btn ${activeTool === 'eye_bright' ? 'active' : ''}`} onClick={() => setActiveTool('eye_bright')}>
                    <Eye size={16} /> B028: Sáng mắt (Sclera Brightening)
                  </div>
                  <div className={`tool-btn ${activeTool === 'eye_catchlight' ? 'active' : ''}`} onClick={() => setActiveTool('eye_catchlight')}>
                    <Sparkles size={16} /> B034: Điểm sáng mắt long lanh (Catchlight)
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
                  <div className={`tool-btn ${activeTool === 'hair_shine' ? 'active' : ''}`} onClick={() => setActiveTool('hair_shine')}>
                    <Sparkles size={16} /> B064: Bóng tóc salon (Hair Shine)
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
                    <Sliders size={16} /> X022: Độ sáng
                  </div>
                  <div className={`tool-btn ${activeTool === 'contrast' ? 'active' : ''}`} onClick={() => setActiveTool('contrast')}>
                    <Sliders size={16} /> X022: Độ tương phản
                  </div>
                  <div className={`tool-btn ${activeTool === 'saturation' ? 'active' : ''}`} onClick={() => setActiveTool('saturation')}>
                    <Sliders size={16} /> X022: Độ bão hòa màu
                  </div>
                  <div className={`tool-btn ${activeTool === 'temperature' ? 'active' : ''}`} onClick={() => setActiveTool('temperature')}>
                    <Sliders size={16} /> X022: Nhiệt độ ấm / lạnh
                  </div>
                  <div className={`tool-btn ${activeTool === 'tint' ? 'active' : ''}`} onClick={() => setActiveTool('tint')}>
                    <Sliders size={16} /> X022: Cân bằng sắc thái Tint
                  </div>
                  <div className={`tool-btn ${activeTool === 'collarbone' ? 'active' : ''}`} onClick={() => setActiveTool('collarbone')}>
                    <UserRound size={16} /> X006: Xương quai xanh nổi bật
                  </div>
                </div>
              )}

              {/* CROP ASPECT RATIO CATEGORY (B090) */}
              {activeCategory === 'crop' && (
                <div className="tool-group">
                  <h4 className="util-label">Cắt ảnh chuẩn tỷ lệ (B090)</h4>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>Chọn tỷ lệ khung hình chuẩn để cắt ảnh gọn gàng:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {[
                      { id: 'original', label: 'Nguyên bản (Original)' },
                      { id: '1:1', label: '1:1 Vuông (Instagram)' },
                      { id: '4:5', label: '4:5 Chân dung (Portrait)' },
                      { id: '3:4', label: '3:4 Bìa ảnh (Standard)' },
                      { id: '9:16', label: '9:16 Story / TikTok' }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleApplyCrop(item.id as any)}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '8px',
                          border: (editState.crop?.aspectRatio || 'original') === item.id ? '2px solid var(--color-accent)' : '1px solid #e2e8f0',
                          background: (editState.crop?.aspectRatio || 'original') === item.id ? 'rgba(212, 175, 55, 0.1)' : '#fff',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '12px'
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
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

              {/* MAGAZINE & POSTER TEMPLATES WITH FULL EDITABILITY */}
              {activeCategory === 'templates' && (
                <div className="tool-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 className="util-label">12 Khung Bìa & Poster</h4>
                    {editState.template_id && (
                      <button onClick={() => setEditState(prev => ({ ...prev, template_id: '', template_custom_text: undefined }))} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none' }}>Tắt khung</button>
                    )}
                  </div>
                  <div className="template-grid">
                    {POSTER_TEMPLATES.map(tpl => (
                      <div 
                        key={tpl.id}
                        className={`template-card ${editState.template_id === tpl.id ? 'active' : ''}`}
                        onClick={() => {
                          const isSame = editState.template_id === tpl.id;
                          setEditState(prev => ({ 
                            ...prev, 
                            template_id: isSame ? '' : tpl.id,
                            template_custom_text: isSame ? undefined : {
                              title: tpl.title,
                              subtitle: tpl.subtitle,
                              dateText: tpl.dateText,
                              tagline: tpl.tagline,
                              footer: tpl.footer
                            }
                          }));
                          setTimeout(commitHistory, 50);
                        }}
                      >
                        <div className="template-title">{tpl.nameVi}</div>
                        <div className="template-desc">{tpl.subtitle} • Tỷ lệ {tpl.aspectRatio}</div>
                      </div>
                    ))}
                  </div>

                  {/* EDITABLE TEXT & PLACEMENT FORM */}
                  {editState.template_id && (() => {
                    const currentTpl = POSTER_TEMPLATES.find(t => t.id === editState.template_id);
                    if (!currentTpl) return null;
                    const customText = editState.template_custom_text || {
                      title: currentTpl.title,
                      subtitle: currentTpl.subtitle,
                      dateText: currentTpl.dateText,
                      tagline: currentTpl.tagline,
                      footer: currentTpl.footer
                    };

                    const handleFieldChange = (field: keyof TemplateCustomText, val: string) => {
                      setEditState(prev => ({
                        ...prev,
                        template_custom_text: {
                          ...customText,
                          [field]: val
                        }
                      }));
                    };

                    return (
                      <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Tùy Chỉnh Chữ & Bố Cục Bìa</h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Tiêu đề chính (Title)</label>
                            <input 
                              type="text" 
                              value={customText.title || ''} 
                              onChange={e => handleFieldChange('title', e.target.value)} 
                              onBlur={commitHistory}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Phụ đề (Subtitle)</label>
                            <input 
                              type="text" 
                              value={customText.subtitle || ''} 
                              onChange={e => handleFieldChange('subtitle', e.target.value)} 
                              onBlur={commitHistory}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Ngày tháng / Số phát hành</label>
                            <input 
                              type="text" 
                              value={customText.dateText || ''} 
                              onChange={e => handleFieldChange('dateText', e.target.value)} 
                              onBlur={commitHistory}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Khẩu hiệu (Tagline)</label>
                            <input 
                              type="text" 
                              value={customText.tagline || ''} 
                              onChange={e => handleFieldChange('tagline', e.target.value)} 
                              onBlur={commitHistory}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Chân trang (Footer Credits)</label>
                            <input 
                              type="text" 
                              value={customText.footer || ''} 
                              onChange={e => handleFieldChange('footer', e.target.value)} 
                              onBlur={commitHistory}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                            />
                          </div>

                          {/* Text Placement Selection */}
                          <div style={{ marginTop: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Vị trí chữ</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {(['top', 'center', 'bottom'] as const).map(p => (
                                <button
                                  key={p}
                                  onClick={() => {
                                    setEditState(prev => ({ ...prev, template_placement: p }));
                                    setTimeout(commitHistory, 50);
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: '6px 0',
                                    borderRadius: '4px',
                                    border: (editState.template_placement || 'top') === p ? '1px solid var(--color-accent)' : '1px solid #cbd5e1',
                                    background: (editState.template_placement || 'top') === p ? 'rgba(212, 175, 55, 0.15)' : '#fff',
                                    fontWeight: (editState.template_placement || 'top') === p ? 600 : 400,
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {p === 'top' ? 'Trên cùng' : p === 'center' ? 'Ở giữa' : 'Dưới cùng'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
              {activeCategory !== 'filters' && activeCategory !== 'templates' && activeCategory !== 'crop' && activeCategory !== 'ai' && activeTool !== 'skin_blemish' && (
                <div className="parameter-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Cường độ</span>
                    <span style={{ fontSize: '14px', color: 'var(--color-accent)' }}>{(editState as any)[activeTool] ?? 0}</span>
                  </div>
                  <input 
                    type="range" 
                    className="premium-slider"
                    min={(['brightness', 'contrast', 'saturation', 'temperature', 'tint', 'skin_tone'] as ToolType[]).includes(activeTool) ? '-100' : '0'} 
                    max="100" 
                    value={(editState as any)[activeTool] ?? 0} 
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
