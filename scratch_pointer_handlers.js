  const activePointersRef = useRef<Map<number, React.PointerEvent<HTMLCanvasElement>>>(new Map());
  const pinchRef = useRef<{ startDist: number, startZoom: number, startCenter: {x: number, y: number}, startPan: {x: number, y: number} } | null>(null);

  const getPinchData = (map: Map<number, React.PointerEvent<HTMLCanvasElement>>) => {
    const ptrs = Array.from(map.values());
    if (ptrs.length < 2) return null;
    const dx = ptrs[0].clientX - ptrs[1].clientX;
    const dy = ptrs[0].clientY - ptrs[1].clientY;
    const dist = Math.hypot(dx, dy);
    const center = {
      x: (ptrs[0].clientX + ptrs[1].clientX) / 2,
      y: (ptrs[0].clientY + ptrs[1].clientY) / 2
    };
    return { dist, center };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    canvasRef.current.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, e);

    if (activePointersRef.current.size >= 2) {
      if (gestureRef.current.kind === 'brush' || gestureRef.current.kind === 'heal' || gestureRef.current.kind === 'warp') {
        if (gestureStateRef.current) {
           setEditState(history[historyIndex]);
           gestureStateRef.current = null;
        }
      }
      
      gestureRef.current.kind = 'pan';
      gestureRef.current.pointerId = null;
      
      const pData = getPinchData(activePointersRef.current);
      if (pData) {
        pinchRef.current = {
          startDist: Math.max(1, pData.dist),
          startZoom: zoom,
          startCenter: pData.center,
          startPan: { ...pan }
        };
      }
      return;
    }

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
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, e);
    }

    if (activePointersRef.current.size >= 2) {
      const pData = getPinchData(activePointersRef.current);
      if (pData && pinchRef.current) {
        const { startDist, startZoom, startCenter, startPan } = pinchRef.current;
        const newZoom = Math.min(5, Math.max(1, startZoom * (pData.dist / startDist)));
        setZoom(newZoom);
        
        setPan({
          x: startPan.x + (pData.center.x - startCenter.x),
          y: startPan.y + (pData.center.y - startCenter.y)
        });
      }
      return;
    }

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
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    
    if (activePointersRef.current.size === 1 && gestureRef.current.kind === 'pan') {
      const ptr = Array.from(activePointersRef.current.values())[0];
      gestureRef.current.pointerId = ptr.pointerId;
      gestureRef.current.startClientX = ptr.clientX;
      gestureRef.current.startClientY = ptr.clientY;
      gestureRef.current.startPanX = pan.x;
      gestureRef.current.startPanY = pan.y;
    }

    const gesture = gestureRef.current;
    if (gesture.pointerId !== e.pointerId || !gesture.kind) {
      if (activePointersRef.current.size === 0) {
        gestureRef.current.kind = null;
        gestureRef.current.pointerId = null;
        gestureStateRef.current = null;
      }
      return;
    }

    if (gesture.kind === 'warp' && gesture.startSource) {
      const end = getCanvasSourcePoint(e.clientX, e.clientY);
      if (end) {
        let dx = end.x - gesture.startSource.x;
        let dy = end.y - gesture.startSource.y;
        const distance = Math.hypot(dx, dy);

        // Clamp direct drag magnitude (max 0.15 normalized displacement)
        const maxDist = 0.15;
        if (distance > maxDist) {
          dx = (dx / distance) * maxDist;
          dy = (dy / distance) * maxDist;
        }

        if (Math.hypot(dx, dy) > 0.0015 && (activeTool === 'face_slim' || activeTool === 'chin_slim' || activeTool === 'body_slim')) {
          const op: LocalWarpOperation = {
            id: `warp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
