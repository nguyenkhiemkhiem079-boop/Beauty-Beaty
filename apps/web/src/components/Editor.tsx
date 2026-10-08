import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  Undo2, Redo2, Download, ArrowLeft, Upload, Loader2, Sparkles, 
  UserRound, Droplets, Scissors, Eye, Smile, 
  Sliders, Palette, LayoutTemplate, SplitSquareVertical, Crop,
  LayoutGrid, Save, Bookmark, Search, X, RotateCcw, ShieldCheck,
  ZoomIn, ZoomOut, Move, MousePointer2
} from 'lucide-react';
import { faceLandmarkManager } from '../engine/FaceLandmarkManager';
import { segmenterManager } from '../engine/SegmenterManager';
import { ImageEngine } from '../engine/ImageEngine';
import { useAppContext, DEFAULT_EDIT_STATE } from '../context';
import type { ToolCategory, ToolType, TemplateCustomText, CropOperation, HealingOperation, EditState, LocalBrushOperation, LocalWarpOperation } from '../context';
import { COLOR_FILTERS } from '../presets/filters';
import { POSTER_TEMPLATES } from '../presets/templates';
import { CollageMaker } from './CollageMaker';
import { saveDraft, loadLatestDraft, clearAllDrafts, type AppDraft } from '../utils/draftStorage';
import { 
  PUBLIC_TOOLS, 
  type PublicToolDef, 
  getToolValue, 
  setToolValue, 
  resetToolValue, 
  resetCategoryValues 
} from '../config/publicTools';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('all');
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [isCollageOpen, setIsCollageOpen] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState<AppDraft | null>(null);
  const [draftToast, setDraftToast] = useState<string | null>(null);
  const [blemishRadius, setBlemishRadius] = useState(16);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [interactionMode, setInteractionMode] = useState<'retouch' | 'pan'>('retouch');
  const [directRadius, setDirectRadius] = useState(64);
  const [directStrength, setDirectStrength] = useState(55);
  const [pointerPreview, setPointerPreview] = useState<{ u: number; v: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ImageEngine | null>(null);
  const uploadTokenRef = useRef(0);
  const originalDataUrlRef = useRef<string | null>(null);
  const gestureRef = useRef<{
    kind: 'brush' | 'heal' | 'warp' | 'pan' | null;
    pointerId: number | null;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
    startSource?: { x: number; y: number };
    lastClientX: number;
    lastClientY: number;
  }>({
    kind: null,
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
    lastClientX: 0,
    lastClientY: 0
  });
  const gestureStateRef = useRef<EditState | null>(null);

  const directRetouchTools: ToolType[] = ['skin_smooth', 'skin_blemish', 'face_slim', 'chin_slim', 'body_slim'];
  const supportsDirectRetouch = directRetouchTools.includes(activeTool);

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
    if (!canvasRef.current || !originalImage || !engineRef.current) return;
    const faceLandmarks = landmarks?.[0];
    engineRef.current.applyPipeline(DEFAULT_EDIT_STATE, faceLandmarks);
    const workCanvas = engineRef.current.getCanvas();
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(workCanvas, 0, 0);
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
    
    const t0 = performance.now();
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
    
    const t1 = performance.now();
    if (typeof window !== 'undefined') {
      (window as any).__perfMeasurements = (window as any).__perfMeasurements || [];
      (window as any).__perfMeasurements.push(t1 - t0);
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
              setErrorMsg("Khởi tạo mô hình AI thất bại. Đảm bảo kết nối mạng hoặc thử lại.");
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

  const handleRetryInit = async () => {
    setErrorMsg(null);
    setIsDetecting(true);
    try {
      await Promise.all([
        faceLandmarkManager.initialize(),
        segmenterManager.initialize()
      ]);
      if (canvasRef.current) {
        const [detectedLandmarks, segResult] = await Promise.all([
          faceLandmarkManager.detectFaces(canvasRef.current),
          segmenterManager.segment(canvasRef.current)
        ]);
        setLandmarks(detectedLandmarks);
        setSegmentationMask(segResult || null);
        if (engineRef.current && segResult) {
          engineRef.current.setSegmentationMask(segResult);
        }
        if (detectedLandmarks.length === 0) {
          setErrorMsg("Không tìm thấy khuôn mặt trong ảnh. Bạn vẫn có thể sử dụng các công cụ chỉnh màu, bộ lọc và ghép poster.");
        }
      }
    } catch (err) {
      console.error("AI Model Retry Error:", err);
      setErrorMsg("Khởi tạo mô hình AI thất bại. Đảm bảo kết nối mạng hoặc thử lại.");
    } finally {
      setIsDetecting(false);
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
    if (activeTool === 'eye_color') {
      setEditState(prev => ({ ...prev, eye_color_intensity: val }));
    } else {
      setEditState(prev => setToolValue(prev, activeTool, val));
    }
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

  const getCanvasSourcePoint = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const u = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const v = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const cropX = editState.crop?.x ?? 0;
    const cropY = editState.crop?.y ?? 0;
    const cropW = editState.crop?.width ?? 1;
    const cropH = editState.crop?.height ?? 1;
    return {
      u,
      v,
      x: cropX + u * cropW,
      y: cropY + v * cropH,
      radiusNorm: (directRadius / rect.height) * cropH
    };
  };

  const appendDirectBrushPoint = (clientX: number, clientY: number) => {
    const p = getCanvasSourcePoint(clientX, clientY);
    if (!p) return;

    if (activeTool === 'skin_blemish') {
      const op: HealingOperation = {
        id: `heal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        x: p.x,
        y: p.y,
        radiusNorm: Math.max(0.002, p.radiusNorm * 0.45)
      };
      setEditState(prev => {
        const next = { ...prev, healings: [...(prev.healings || []), op] };
        gestureStateRef.current = next;
        return next;
      });
      return;
    }

    if (activeTool === 'skin_smooth') {
      const op: LocalBrushOperation = {
        id: `smooth_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tool: 'skin_smooth',
        x: p.x,
        y: p.y,
        radiusNorm: Math.max(0.006, p.radiusNorm),
        intensity: directStrength
      };
      setEditState(prev => {
        const next = { ...prev, localBrushes: [...(prev.localBrushes || []), op] };
        gestureStateRef.current = next;
        return next;
      });
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    canvasRef.current.setPointerCapture(e.pointerId);

    const shouldPan = interactionMode === 'pan' || e.button === 1;
    if (shouldPan) {
      gestureRef.current = {
        kind: 'pan',
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
        lastClientX: e.clientX,
        lastClientY: e.clientY
      };
      return;
    }

    if (!supportsDirectRetouch) return;
    const p = getCanvasSourcePoint(e.clientX, e.clientY);
    if (!p) return;

    const kind = activeTool === 'skin_smooth' ? 'brush' : activeTool === 'skin_blemish' ? 'heal' : 'warp';
    gestureRef.current = {
      kind,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      startSource: { x: p.x, y: p.y },
      lastClientX: e.clientX,
      lastClientY: e.clientY
    };

    if (kind === 'brush' || kind === 'heal') {
      appendDirectBrushPoint(e.clientX, e.clientY);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getCanvasSourcePoint(e.clientX, e.clientY);
    if (p) setPointerPreview({ u: p.u, v: p.v });

    const gesture = gestureRef.current;
    if (gesture.pointerId !== e.pointerId || !gesture.kind) return;

    if (gesture.kind === 'pan') {
      setPan({
        x: gesture.startPanX + (e.clientX - gesture.startClientX),
        y: gesture.startPanY + (e.clientY - gesture.startClientY)
      });
      return;
    }

    if (gesture.kind === 'brush' || gesture.kind === 'heal') {
      const minDistance = Math.max(10, directRadius * 0.32);
      const distance = Math.hypot(e.clientX - gesture.lastClientX, e.clientY - gesture.lastClientY);
      if (distance >= minDistance) {
        gesture.lastClientX = e.clientX;
        gesture.lastClientY = e.clientY;
        appendDirectBrushPoint(e.clientX, e.clientY);
      }
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current;
    if (gesture.pointerId !== e.pointerId || !gesture.kind) return;

    if (gesture.kind === 'warp' && gesture.startSource) {
      const end = getCanvasSourcePoint(e.clientX, e.clientY);
      if (end) {
        const dx = end.x - gesture.startSource.x;
        const dy = end.y - gesture.startSource.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0.0015 && (activeTool === 'face_slim' || activeTool === 'chin_slim' || activeTool === 'body_slim')) {
          const op: LocalWarpOperation = {
            id: `warp_${Date.now()}`,
            tool: activeTool,
            x: gesture.startSource.x,
            y: gesture.startSource.y,
            dx,
            dy,
            radiusNorm: Math.max(0.01, end.radiusNorm),
            intensity: Math.max(0.15, Math.min(1, directStrength / 100))
          };
          const nextState: EditState = {
            ...editState,
            localWarps: [...(editState.localWarps || []), op]
          };
          setEditState(nextState);
          gestureStateRef.current = nextState;
        }
      }
    }

    if (gesture.kind !== 'pan') {
      const stateToCommit = gestureStateRef.current;
      if (stateToCommit) commitHistory(stateToCommit);
    }

    gestureRef.current.kind = null;
    gestureRef.current.pointerId = null;
    gestureStateRef.current = null;
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom(prev => Math.min(5, Math.max(1, prev * factor)));
  };

  const resetCanvasView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setInteractionMode('retouch');
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

  const handleResetTool = (toolId: ToolType) => {
    let committed: EditState | null = null;
    setEditState(prev => {
      let next = resetToolValue(prev, toolId);
      if (toolId === 'skin_smooth') {
        next = { ...next, localBrushes: (next.localBrushes || []).filter(op => op.tool !== 'skin_smooth') };
      } else if (toolId === 'skin_blemish') {
        next = { ...next, healings: [] };
      } else if (toolId === 'face_slim' || toolId === 'chin_slim' || toolId === 'body_slim') {
        next = { ...next, localWarps: (next.localWarps || []).filter(op => op.tool !== toolId) };
      }
      committed = next;
      return next;
    });
    setTimeout(() => committed && commitHistory(committed), 0);
  };

  const resetCurrentCategory = () => {
    let committed: EditState | null = null;
    setEditState(prev => {
      let next = resetCategoryValues(prev, activeCategory);
      if (activeCategory === 'skin') {
        next = { ...next, localBrushes: [], healings: [] };
      } else if (activeCategory === 'face') {
        next = { ...next, localWarps: (next.localWarps || []).filter(op => op.tool === 'body_slim') };
      } else if (activeCategory === 'body') {
        next = { ...next, localWarps: (next.localWarps || []).filter(op => op.tool !== 'body_slim') };
      }
      committed = next;
      return next;
    });
    setTimeout(() => committed && commitHistory(committed), 0);
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
          <button data-testid="btn-restore-draft" onClick={() => handleRestoreDraft(draftAvailable)} style={{ background: '#d4af37', color: '#000', fontWeight: 600, border: 'none', padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }}>Khôi phục</button>
          <button data-testid="btn-discard-draft" onClick={handleDiscardDraft} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #475569', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Bỏ qua</button>
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
              <button className="btn-icon" data-testid="btn-undo" onClick={handleUndo} disabled={historyIndex === 0} title="Undo (Ctrl+Z)"><Undo2 size={18} /></button>
              <button className="btn-icon" data-testid="btn-redo" onClick={handleRedo} disabled={historyIndex === history.length - 1} title="Redo (Ctrl+Shift+Z)"><Redo2 size={18} /></button>
              
              <button 
                className={`btn-compare ${isComparing ? 'active' : ''}`}
                data-testid="btn-compare"
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
                data-testid="btn-save-draft"
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
            data-testid="btn-open-collage"
            className="btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '13px' }}
          >
            <LayoutGrid size={15} color="#d4af37" /> Ghép ảnh
          </button>
          {imageSrc && (
            <button className="btn-primary" data-testid="btn-export" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> Lưu & Xuất
            </button>
          )}
        </div>
      </header>

      <main className="editor-workspace">
        <div className="canvas-area">
          {!imageSrc ? (
            <div className="empty-state" style={{ maxWidth: '520px', padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(228, 164, 189, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Sparkles size={30} color="var(--color-accent)" />
              </div>
              <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                Đẹp theo cách của bạn.
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
                Chỉnh sửa chân dung ngay trên trình duyệt — nhanh, riêng tư và dễ sử dụng.
              </p>
              <label className="btn-primary btn-large" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '20px' }}>
                <Upload size={18} /> Chọn ảnh
                <input type="file" data-testid="file-upload-input" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>

              {/* Secondary areas */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#ffffff', borderRadius: '999px', fontSize: '12px', color: '#475569', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <UserRound size={13} color="#d4af37" /> Làm đẹp khuôn mặt
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#ffffff', borderRadius: '999px', fontSize: '12px', color: '#475569', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <Sliders size={13} color="#d4af37" /> Chỉnh màu
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#ffffff', borderRadius: '999px', fontSize: '12px', color: '#475569', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <Palette size={13} color="#d4af37" /> Bộ lọc
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: '#ffffff', borderRadius: '999px', fontSize: '12px', color: '#475569', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <LayoutGrid size={13} color="#d4af37" /> Ghép ảnh
                </span>
              </div>

              {/* Privacy notice */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', color: '#64748b', background: 'rgba(255,255,255,0.7)', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(226,232,240,0.8)' }}>
                <ShieldCheck size={15} color="#10b981" />
                <span>Ảnh của bạn được xử lý trực tiếp trên trình duyệt đối với các công cụ chỉnh sửa cục bộ.</span>
              </div>
            </div>
          ) : (
            <div className="canvas-container">
              {isDetecting && (
                <div className="loading-overlay">
                  <Loader2 className="spinner" size={32} />
                  <span>Đang phân tích khuôn mặt...</span>
                </div>
              )}
              {errorMsg && (
                <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(220, 38, 38, 0.9)', color: 'white', padding: '8px 16px', borderRadius: '8px', zIndex: 30, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {errorMsg}
                  {errorMsg.includes('thất bại') && (
                    <button 
                      onClick={handleRetryInit} 
                      style={{ padding: '4px 8px', background: 'white', color: 'red', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Thử lại
                    </button>
                  )}
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  zIndex: 25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.92)',
                  boxShadow: '0 4px 16px rgba(15,23,42,0.12)',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <button
                  type="button"
                  aria-label="Thu nhỏ ảnh"
                  onClick={() => setZoom(v => Math.max(1, v / 1.2))}
                  style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 5 }}
                ><ZoomOut size={16} /></button>
                <button
                  type="button"
                  aria-label="Đặt lại mức thu phóng"
                  onClick={resetCanvasView}
                  style={{ border: 0, background: 'transparent', cursor: 'pointer', minWidth: 52, fontSize: 12, fontWeight: 700 }}
                >{Math.round(zoom * 100)}%</button>
                <button
                  type="button"
                  aria-label="Phóng to ảnh"
                  onClick={() => setZoom(v => Math.min(5, v * 1.2))}
                  style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 5 }}
                ><ZoomIn size={16} /></button>
                {supportsDirectRetouch && (
                  <button
                    type="button"
                    data-testid="btn-direct-interaction-mode"
                    aria-label={interactionMode === 'retouch' ? 'Chuyển sang di chuyển ảnh' : 'Chuyển sang chỉnh trực tiếp'}
                    onClick={() => setInteractionMode(m => m === 'retouch' ? 'pan' : 'retouch')}
                    style={{
                      border: '1px solid rgba(148,163,184,0.35)',
                      background: interactionMode === 'retouch' ? 'rgba(228,164,189,0.22)' : 'white',
                      borderRadius: 8,
                      cursor: 'pointer',
                      padding: '5px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 700
                    }}
                  >
                    {interactionMode === 'retouch' ? <MousePointer2 size={14} /> : <Move size={14} />}
                    {interactionMode === 'retouch' ? 'Chỉnh vùng' : 'Di chuyển'}
                  </button>
                )}
              </div>

              {supportsDirectRetouch && interactionMode === 'retouch' && (
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 25,
                    width: 190,
                    padding: '9px 11px',
                    borderRadius: 12,
                    background: 'rgba(38,38,38,0.82)',
                    color: '#fff',
                    fontSize: 11,
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 5 }}>
                    Vuốt trực tiếp trên vùng cần chỉnh
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 34px', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span>Vùng</span>
                    <input
                      aria-label="Kích thước vùng chỉnh trực tiếp"
                      type="range"
                      min="24"
                      max="120"
                      value={directRadius}
                      onChange={e => setDirectRadius(Number(e.target.value))}
                    />
                    <span>{directRadius}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 34px', alignItems: 'center', gap: 6 }}>
                    <span>Cường độ</span>
                    <input
                      aria-label="Cường độ chỉnh trực tiếp"
                      type="range"
                      min="15"
                      max="100"
                      value={directStrength}
                      onChange={e => setDirectStrength(Number(e.target.value))}
                    />
                    <span>{directStrength}</span>
                  </div>
                </div>
              )}

              <div
                data-testid="canvas-transform-stage"
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  willChange: 'transform'
                }}
              >
                <canvas
                  ref={canvasRef}
                  data-testid="main-canvas"
                  className="main-canvas"
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  onPointerCancel={handleCanvasPointerUp}
                  onPointerLeave={() => setPointerPreview(null)}
                  onWheel={handleCanvasWheel}
                  style={{
                    touchAction: 'none',
                    cursor: interactionMode === 'pan'
                      ? 'grab'
                      : supportsDirectRetouch
                        ? (activeTool === 'skin_blemish' || activeTool === 'skin_smooth' ? 'crosshair' : 'cell')
                        : 'default'
                  }}
                />
                {supportsDirectRetouch && interactionMode === 'retouch' && pointerPreview && (
                  <div
                    aria-hidden="true"
                    style={{
                      pointerEvents: 'none',
                      position: 'absolute',
                      left: `${pointerPreview.u * 100}%`,
                      top: `${pointerPreview.v * 100}%`,
                      width: `${(directRadius * 2) / zoom}px`,
                      height: `${(directRadius * 2) / zoom}px`,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      border: `${1.5 / zoom}px solid rgba(255,255,255,0.95)`,
                      boxShadow: `0 0 0 ${1 / zoom}px rgba(228,164,189,0.9), 0 0 ${8 / zoom}px rgba(0,0,0,0.2)`
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {imageSrc && (() => {
          const currentToolDef = PUBLIC_TOOLS.find(t => t.id === activeTool);
          const activeToolVal = getToolValue(editState, activeTool);

          const searchResults = searchQuery.trim() 
            ? PUBLIC_TOOLS.filter(t => 
                t.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) || 
                (t.subgroup && t.subgroup.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
                t.desc.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                t.searchTerms.some(term => term.toLowerCase().includes(searchQuery.toLowerCase().trim()))
              )
            : [];

          const renderToolButton = (tool: PublicToolDef) => {
            const val = getToolValue(editState, tool.id);
            const isModified = val !== 0;
            const Icon = tool.icon;

            return (
              <div 
                key={tool.id} 
                data-testid={`tool-item-${tool.id}`}
                className={`tool-btn-compact ${activeTool === tool.id ? 'active' : ''}`}
                onClick={() => {
                  if (tool.id === 'teeth_whiten' && landmarks && landmarks.length > 0) {
                    const face = landmarks[0];
                    const topLip = face[13];
                    const bottomLip = face[14];
                    if (topLip && bottomLip) {
                      const dist = Math.hypot(topLip.x - bottomLip.x, topLip.y - bottomLip.y);
                      if (dist < 0.015) {
                        setErrorMsg('Không tìm thấy môi/răng hở, tính năng tạm ẩn');
                        setTimeout(() => setErrorMsg(null), 3000);
                        return;
                      }
                    }
                  }
                  setActiveTool(tool.id);
                  if (activeCategory !== tool.category) {
                    setActiveCategory(tool.category);
                  }
                }}
              >
                <div className="tool-btn-left">
                  <Icon size={15} />
                  <span>{tool.name}</span>
                </div>
                {isModified && (
                  <span className="tool-value-badge">
                    {val > 0 ? `+${val}` : val}
                  </span>
                )}
              </div>
            );
          };

          return (
            <aside className="tools-panel">
              {/* Tool Search Bar */}
              <div className="tool-search-container">
                <div className="tool-search-input-wrapper">
                  <Search size={15} color="#94a3b8" />
                  <input 
                    type="text" 
                    className="tool-search-input"
                    placeholder="Tìm công cụ chỉnh sửa..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Navigation Bar (when not searching) */}
              {!searchQuery.trim() && (
                <div className="category-tabs">
                  <button data-testid="tab-skin" className={`tab ${activeCategory === 'skin' ? 'active' : ''}`} onClick={() => { setActiveCategory('skin'); setActiveTool('skin_smooth'); }}>
                    <Droplets size={16} />Da
                  </button>
                  <button data-testid="tab-face" className={`tab ${activeCategory === 'face' ? 'active' : ''}`} onClick={() => { setActiveCategory('face'); setActiveTool('face_slim'); }}>
                    <UserRound size={16} />Khuôn mặt
                  </button>
                  <button data-testid="tab-makeup" className={`tab ${activeCategory === 'makeup' ? 'active' : ''}`} onClick={() => { setActiveCategory('makeup'); setActiveTool('makeup_preset'); }}>
                    <Sparkles size={16} />Trang điểm
                  </button>
                  <button data-testid="tab-eyes" className={`tab ${activeCategory === 'eyes' ? 'active' : ''}`} onClick={() => { setActiveCategory('eyes'); setActiveTool('eye_enlarge'); }}>
                    <Eye size={16} />Mắt
                  </button>
                  <button data-testid="tab-mouth" className={`tab ${activeCategory === 'mouth' ? 'active' : ''}`} onClick={() => { setActiveCategory('mouth'); setActiveTool('teeth_whiten'); }}>
                    <Smile size={16} />Môi & Răng
                  </button>
                  <button data-testid="tab-hair" className={`tab ${activeCategory === 'hair' ? 'active' : ''}`} onClick={() => { setActiveCategory('hair'); setActiveTool('hair_smooth'); }}>
                    <Scissors size={16} />Tóc
                  </button>
                  <button data-testid="tab-body" className={`tab ${activeCategory === 'body' ? 'active' : ''}`} onClick={() => { setActiveCategory('body'); setActiveTool('body_slim'); }}>
                    <UserRound size={16} />Cơ thể
                  </button>
                  <button data-testid="tab-adjust" className={`tab ${activeCategory === 'adjust' ? 'active' : ''}`} onClick={() => { setActiveCategory('adjust'); setActiveTool('brightness'); }}>
                    <Sliders size={16} />Chỉnh màu
                  </button>
                  <button data-testid="tab-crop" className={`tab ${activeCategory === 'crop' ? 'active' : ''}`} onClick={() => { setActiveCategory('crop'); setActiveTool('crop'); }}>
                    <Crop size={16} />Cắt ảnh
                  </button>
                  <button data-testid="tab-filters" className={`tab ${activeCategory === 'filters' ? 'active' : ''}`} onClick={() => { setActiveCategory('filters'); }}>
                    <Palette size={16} />Bộ lọc
                  </button>
                  <button data-testid="tab-templates" className={`tab ${activeCategory === 'templates' ? 'active' : ''}`} onClick={() => { setActiveCategory('templates'); }}>
                    <LayoutTemplate size={16} />Mẫu
                  </button>
                </div>
              )}

              <div className="tool-content">
                {/* Search Results Mode */}
                {searchQuery.trim() ? (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Kết quả tìm kiếm ({searchResults.length})
                    </div>
                    {searchResults.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: '13px' }}>
                        Không tìm thấy công cụ phù hợp với "{searchQuery}".
                      </div>
                    ) : (
                      searchResults.map(renderToolButton)
                    )}
                  </div>
                ) : (
                  <>
                    {/* Active Tool Parameter Controller Card */}
                    {activeCategory !== 'filters' && activeCategory !== 'templates' && activeCategory !== 'crop' && activeCategory !== 'ai' && currentToolDef && (
                      <div className="active-tool-card">
                        <div className="active-tool-header">
                          <div className="active-tool-name">
                            <span>{currentToolDef.name}</span>
                          </div>
                        </div>
                        <div className="active-tool-desc">{currentToolDef.desc}</div>

                        {activeTool === 'eye_color' ? (
                          <div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                              {[
                                { id: '#3d6b8c', name: 'Lam Sapphire' },
                                { id: '#2a6f97', name: 'Xanh Đại dương' },
                                { id: '#2e6f40', name: 'Lục Hazel' },
                                { id: '#8b4513', name: 'Nâu Hổ phách' },
                                { id: '#5d6b74', name: 'Xám Khói' }
                              ].map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setEditState(prev => ({ ...prev, eye_color: c.id, eye_color_intensity: prev.eye_color_intensity || 60 }));
                                    setTimeout(commitHistory, 50);
                                  }}
                                  title={c.name}
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    backgroundColor: c.id,
                                    border: (editState.eye_color || '#3d6b8c') === c.id ? '2px solid var(--color-accent)' : '2px solid #ffffff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                                    cursor: 'pointer'
                                  }}
                                />
                              ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Cường độ</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)' }}>
                                {editState.eye_color_intensity ?? 0}
                              </span>
                            </div>
                            <div className="active-tool-slider-row">
                              <span className="slider-bound-label">0</span>
                              <input 
                                type="range"
                                data-testid="tool-slider"
                                className="premium-slider"
                                min="0"
                                max="100"
                                value={editState.eye_color_intensity ?? 0}
                                onChange={handleSliderChange}
                                onMouseUp={commitHistory}
                                onTouchEnd={commitHistory}
                                onKeyUp={commitHistory}
                              />
                              <span className="slider-bound-label" style={{ textAlign: 'right' }}>100</span>
                            </div>
                          </div>
                        ) : activeTool === 'makeup_preset' ? (
                          <div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                              {[
                                { id: 'natural', name: 'Tự nhiên' },
                                { id: 'korean', name: 'Hàn Quốc' },
                                { id: 'douyin', name: 'Douyin' },
                                { id: 'western', name: 'Tây Âu' }
                              ].map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setEditState(prev => ({ ...prev, makeup_preset: c.id, makeup_preset_intensity: prev.makeup_preset_intensity || 60 }));
                                    setTimeout(commitHistory, 50);
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '16px',
                                    border: (editState.makeup_preset || 'natural') === c.id ? '2px solid var(--color-accent)' : '1px solid #e2e8f0',
                                    background: (editState.makeup_preset || 'natural') === c.id ? 'rgba(212, 175, 55, 0.1)' : '#fff',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 500
                                  }}
                                >
                                  {c.name}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Cường độ</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)' }}>
                                {editState.makeup_preset_intensity ?? 0}
                              </span>
                            </div>
                            <div className="active-tool-slider-row">
                              <span className="slider-bound-label">0</span>
                              <input 
                                type="range"
                                data-testid="tool-slider"
                                className="premium-slider"
                                min="0"
                                max="100"
                                value={editState.makeup_preset_intensity ?? 0}
                                onChange={handleSliderChange}
                                onMouseUp={commitHistory}
                                onTouchEnd={commitHistory}
                                onKeyUp={commitHistory}
                              />
                              <span className="slider-bound-label" style={{ textAlign: 'right' }}>100</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                              <button data-testid="btn-reset-tool" onClick={() => handleResetTool(activeTool)} className="btn-reset-tool">
                                <RotateCcw size={12} /> Đặt lại
                              </button>
                            </div>
                          </div>
                        ) : activeTool === 'makeup_lipstick' || activeTool === 'makeup_blush' || activeTool === 'makeup_eyeshadow' ? (
                          <div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                              {(
                                activeTool === 'makeup_lipstick' ? [
                                  { id: '#ff0000', name: 'Đỏ thuần' },
                                  { id: '#ff4d4d', name: 'Đỏ tươi' },
                                  { id: '#b30000', name: 'Đỏ rượu' },
                                  { id: '#cc3300', name: 'Đỏ đất' },
                                  { id: '#993333', name: 'Nâu đỏ' },
                                  { id: '#ff9966', name: 'Cam san hô' },
                                  { id: '#ff6600', name: 'Cam cháy' },
                                  { id: '#ff80df', name: 'Hồng phấn' },
                                  { id: '#ff3399', name: 'Hồng cánh sen' },
                                  { id: '#cc6699', name: 'Hồng đất' }
                                ] : activeTool === 'makeup_blush' ? [
                                  { id: '#ffb3b3', name: 'Hồng đào' },
                                  { id: '#ff80df', name: 'Hồng phấn' },
                                  { id: '#ff66b3', name: 'Hồng sen' },
                                  { id: '#ff9966', name: 'Cam san hô' },
                                  { id: '#ff8c66', name: 'Cam đất' },
                                  { id: '#e67300', name: 'Cam gạch' },
                                  { id: '#cc6699', name: 'Mận chín' },
                                  { id: '#d98cb3', name: 'Tím nhạt' }
                                ] : [
                                  { id: '#ffe6cc', name: 'Trắng ngà' },
                                  { id: '#ffcc99', name: 'Be nhạt' },
                                  { id: '#d9b38c', name: 'Nâu nhạt' },
                                  { id: '#bf8040', name: 'Nâu đồng' },
                                  { id: '#8b4513', name: 'Nâu đậm' },
                                  { id: '#ffb3b3', name: 'Hồng phấn' },
                                  { id: '#ff9966', name: 'Cam đào' },
                                  { id: '#cc3300', name: 'Đỏ gạch' },
                                  { id: '#4d4d4d', name: 'Xám khói' },
                                  { id: '#000000', name: 'Đen tuyền' }
                                ]
                              ).map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => {
                                    setEditState(prev => ({ 
                                      ...prev, 
                                      [`${activeTool}_color`]: c.id, 
                                      [activeTool]: (prev as any)[activeTool] || 50 
                                    }));
                                    setTimeout(commitHistory, 50);
                                  }}
                                  title={c.name}
                                  style={{
                                    width: '26px', height: '26px', borderRadius: '50%',
                                    backgroundColor: c.id,
                                    border: (editState as any)[`${activeTool}_color`] === c.id ? '2px solid var(--color-accent)' : '2px solid #ffffff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)', cursor: 'pointer'
                                  }}
                                />
                              ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Cường độ</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)' }}>
                                {(editState as any)[activeTool] ?? 0}
                              </span>
                            </div>
                            <div className="active-tool-slider-row">
                              <span className="slider-bound-label">0</span>
                              <input 
                                type="range" data-testid="tool-slider" className="premium-slider" min="0" max="100"
                                value={(editState as any)[activeTool] ?? 0}
                                onChange={handleSliderChange}
                                onMouseUp={commitHistory} onTouchEnd={commitHistory} onKeyUp={commitHistory}
                              />
                              <span className="slider-bound-label" style={{ textAlign: 'right' }}>100</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                              <button data-testid="btn-reset-tool" onClick={() => handleResetTool(activeTool)} className="btn-reset-tool">
                                <RotateCcw size={12} /> Đặt lại
                              </button>
                            </div>
                          </div>
                        ) : activeTool === 'skin_blemish' ? (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                              <span style={{ color: '#64748b' }}>Kích thước cọ:</span>
                              <span style={{ fontWeight: 600 }}>{blemishRadius}px</span>
                            </div>
                            <input 
                              type="range"
                              data-testid="tool-slider"
                              className="premium-slider"
                              min="6"
                              max="35"
                              value={blemishRadius}
                              onChange={e => setBlemishRadius(Number(e.target.value))}
                            />
                            <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8' }}>
                              Nhấp chuột trực tiếp lên nốt mụn trên ảnh để xóa.
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                              <button 
                                data-testid="btn-reset-tool"
                                onClick={() => handleResetTool(activeTool)}
                                className="btn-reset-tool"
                                title="Đặt lại công cụ này"
                              >
                                <RotateCcw size={12} /> Đặt lại
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Cường độ</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-accent)' }}>
                                {activeToolVal > 0 ? `+${activeToolVal}` : activeToolVal}
                              </span>
                            </div>
                            <div className="active-tool-slider-row">
                              <span className="slider-bound-label">
                                {currentToolDef.min === -100 ? '-100' : '0'}
                              </span>
                              <input 
                                type="range"
                                data-testid="tool-slider"
                                className="premium-slider"
                                min={currentToolDef.min === -100 ? '-100' : '0'}
                                max="100"
                                value={activeToolVal}
                                onChange={handleSliderChange}
                                onMouseUp={commitHistory}
                                onTouchEnd={commitHistory}
                                onKeyUp={commitHistory}
                              />
                              <span className="slider-bound-label" style={{ textAlign: 'right' }}>+100</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                              <button 
                                data-testid="btn-reset-tool"
                                onClick={() => handleResetTool(activeTool)}
                                className="btn-reset-tool"
                                title="Đặt lại công cụ này"
                              >
                                <RotateCcw size={12} /> Đặt lại
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SKIN CATEGORY */}
                    {activeCategory === 'skin' && (
                      <div className="tool-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 className="util-label" style={{ margin: 0 }}>Da</h4>
                          <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Đặt lại tất cả</button>
                        </div>

                        <div className="tool-subgroup-title">Chăm sóc da</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'skin' && t.subgroup === 'Làn da').map(renderToolButton)}

                        <div className="tool-subgroup-title">Khuyết điểm</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'skin' && t.subgroup === 'Khuyết điểm').map(renderToolButton)}
                      </div>
                    )}

                    {/* FACE CATEGORY */}
                    {activeCategory === 'face' && (
                      <div className="tool-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 className="util-label" style={{ margin: 0 }}>Khuôn mặt</h4>
                          <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Đặt lại tất cả</button>
                        </div>

                        <div className="tool-subgroup-title">Dáng mặt</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'face' && t.subgroup === 'Dáng mặt').map(renderToolButton)}

                        <div className="tool-subgroup-title">Hàm & cằm</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'face' && t.subgroup === 'Hàm & cằm').map(renderToolButton)}
                      </div>
                    )}

                    {/* EYES CATEGORY */}
                    {activeCategory === 'eyes' && (
                      <div className="tool-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 className="util-label" style={{ margin: 0 }}>Mắt</h4>
                          <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Đặt lại tất cả</button>
                        </div>

                        <div className="tool-subgroup-title">Hình dáng mắt</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'eyes' && t.subgroup === 'Hình dáng mắt').map(renderToolButton)}

                        <div className="tool-subgroup-title">Trang điểm mắt</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'eyes' && t.subgroup === 'Trang điểm mắt').map(renderToolButton)}
                      </div>
                    )}

                    {/* MAKEUP CATEGORY */}
                    {activeCategory === 'makeup' && (
                      <div className="tool-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 className="util-label" style={{ margin: 0 }}>Trang điểm</h4>
                          <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Đặt lại tất cả</button>
                        </div>

                        <div className="tool-subgroup-title">Tổng thể</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'makeup' && t.subgroup === 'Tổng thể').map(renderToolButton)}

                        <div className="tool-subgroup-title">Mặt</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'makeup' && t.subgroup === 'Mặt').map(renderToolButton)}

                        <div className="tool-subgroup-title">Môi</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'makeup' && t.subgroup === 'Môi').map(renderToolButton)}

                        <div className="tool-subgroup-title">Má & khối</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'makeup' && t.subgroup === 'Má & khối').map(renderToolButton)}

                        <div className="tool-subgroup-title">Mắt</div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'makeup' && t.subgroup === 'Mắt').map(renderToolButton)}
                      </div>
                    )}

                    {/* MOUTH CATEGORY */}
                    {activeCategory === 'mouth' && (
                      <div className="tool-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 className="util-label" style={{ margin: 0 }}>Môi & Răng</h4>
                          <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Đặt lại</button>
                        </div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'mouth').map(renderToolButton)}
                      </div>
                    )}

                    {/* HAIR CATEGORY */}
                    {activeCategory === 'hair' && (
                      <div className="tool-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 className="util-label" style={{ margin: 0 }}>Tóc</h4>
                          <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Đặt lại</button>
                        </div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'hair').map(renderToolButton)}
                      </div>
                    )}

                    {/* BODY CATEGORY */}
                    {activeCategory === 'body' && (
                      <div className="tool-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 className="util-label" style={{ margin: 0 }}>Cơ thể</h4>
                          <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Đặt lại</button>
                        </div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'body').map(renderToolButton)}
                      </div>
                    )}

                    {/* ADJUSTMENTS CATEGORY */}
                    {activeCategory === 'adjust' && (
                      <div className="tool-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 className="util-label" style={{ margin: 0 }}>Chỉnh màu</h4>
                          <button onClick={resetCurrentCategory} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Đặt lại tất cả</button>
                        </div>
                        {PUBLIC_TOOLS.filter(t => t.category === 'adjust').map(renderToolButton)}
                      </div>
                    )}

                    {/* CROP ASPECT RATIO CATEGORY */}
                    {activeCategory === 'crop' && (
                      <div className="tool-group">
                        <h4 className="util-label" style={{ margin: '0 0 4px 0' }}>Cắt ảnh</h4>
                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>Chọn tỷ lệ khung hình chuẩn để cắt ảnh gọn gàng:</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                          {(['original', '1:1', '4:5', '3:4', '9:16'] as const).map(ratio => {
                            const labelMap = {
                              'original': 'Gốc',
                              '1:1': '1:1 Vuông',
                              '4:5': '4:5 Chân dung',
                              '3:4': '3:4 Tiêu chuẩn',
                              '9:16': '9:16 Câu chuyện'
                            };
                            return (
                              <button
                                key={ratio}
                                data-testid={`crop-ratio-${ratio}`}
                                onClick={() => handleApplyCrop(ratio)}
                                style={{
                                  padding: '12px 10px',
                                  borderRadius: '8px',
                                  border: (editState.crop?.aspectRatio || 'original') === ratio ? '2px solid var(--color-accent)' : '1px solid #e2e8f0',
                                  background: (editState.crop?.aspectRatio || 'original') === ratio ? 'rgba(212, 175, 55, 0.1)' : '#fff',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  fontSize: '12px'
                                }}
                              >
                                {labelMap[ratio]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* CURATED COLOR FILTERS (200+) */}
                    {activeCategory === 'filters' && (
                      <div className="tool-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 className="util-label" style={{ margin: 0 }}>Bộ lọc</h4>
                          {editState.filter_id && (
                            <button onClick={() => setEditState(prev => ({ ...prev, filter_id: '' }))} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Bỏ chọn</button>
                          )}
                        </div>
                        
                        {/* Category Chips */}
                        <div className="chip-container">
                          <button className={`filter-chip ${activeFilterCategory === 'all' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('all')}>Tất cả</button>
                          <button className={`filter-chip ${activeFilterCategory === 'film' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('film')}>Phim ảnh</button>
                          <button className={`filter-chip ${activeFilterCategory === 'portrait' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('portrait')}>Chân dung</button>
                          <button className={`filter-chip ${activeFilterCategory === 'cinematic' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('cinematic')}>Điện ảnh</button>
                          <button className={`filter-chip ${activeFilterCategory === 'vintage' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('vintage')}>Cổ điển</button>
                          <button className={`filter-chip ${activeFilterCategory === 'nature' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('nature')}>Thiên nhiên</button>
                          <button className={`filter-chip ${activeFilterCategory === 'artistic' ? 'active' : ''}`} onClick={() => setActiveFilterCategory('artistic')}>Nghệ thuật</button>
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
                          <h4 className="util-label" style={{ margin: 0 }}>Mẫu</h4>
                          {editState.template_id && (
                            <button onClick={() => setEditState(prev => ({ ...prev, template_id: '', template_custom_text: undefined }))} style={{ fontSize: '11px', color: 'rgba(38,38,38,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Tắt khung</button>
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
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#334155' }}>Tùy chỉnh chữ & vị trí bìa</h4>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Tiêu đề chính</label>
                                  <input 
                                    type="text" 
                                    value={customText.title || ''} 
                                    onChange={e => handleFieldChange('title', e.target.value)} 
                                    onBlur={commitHistory}
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                                  />
                                </div>

                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Phụ đề</label>
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
                                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Chân trang (Credits)</label>
                                  <input 
                                    type="text" 
                                    value={customText.footer || ''} 
                                    onChange={e => handleFieldChange('footer', e.target.value)} 
                                    onBlur={commitHistory}
                                    style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }} 
                                  />
                                </div>

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

                    {/* End categories */}
                  </>
                )}
              </div>
              
              <div className="panel-footer">
                <label className="btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
                  Đổi ảnh khác
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </aside>
          );
        })()}
      </main>
    </div>
  );
};

