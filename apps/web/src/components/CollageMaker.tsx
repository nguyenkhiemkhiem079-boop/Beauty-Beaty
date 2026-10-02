import React, { useState, useRef, useEffect } from 'react';
import { COLLAGE_LAYOUTS } from '../presets/templates';
import { Download, Upload, Trash2, ArrowLeft, LayoutGrid } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const CollageMaker: React.FC<Props> = ({ onBack }) => {
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>(COLLAGE_LAYOUTS[0].id);
  const [slotImages, setSlotImages] = useState<{ [slotIndex: number]: HTMLImageElement | null }>({});
  const [gap, setGap] = useState<number>(8); // pixels
  const [borderRadius, setBorderRadius] = useState<number>(4); // pixels
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeLayout = COLLAGE_LAYOUTS.find(l => l.id === selectedLayoutId) || COLLAGE_LAYOUTS[0];

  const handleSlotImageUpload = (slotIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setSlotImages(prev => ({ ...prev, [slotIndex]: img }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearSlot = (slotIndex: number) => {
    setSlotImages(prev => {
      const next = { ...prev };
      delete next[slotIndex];
      return next;
    });
  };

  const renderCollage = (targetCanvas: HTMLCanvasElement, exportScale = 1) => {
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    let baseW = 800;
    let baseH = 800;
    if (activeLayout.aspectRatio === '4:3') baseH = 600;
    if (activeLayout.aspectRatio === '3:4') { baseW = 600; baseH = 800; }
    if (activeLayout.aspectRatio === '9:16') { baseW = 450; baseH = 800; }

    targetCanvas.width = baseW * exportScale;
    targetCanvas.height = baseH * exportScale;

    const w = targetCanvas.width;
    const h = targetCanvas.height;
    const scaledGap = gap * exportScale;
    const scaledRadius = borderRadius * exportScale;

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Draw slots
    activeLayout.slots.forEach((slot, idx) => {
      const slotX = (slot.x / 100) * w + scaledGap / 2;
      const slotY = (slot.y / 100) * h + scaledGap / 2;
      const slotW = (slot.width / 100) * w - scaledGap;
      const slotH = (slot.height / 100) * h - scaledGap;

      ctx.save();
      // Clip path for rounded corners
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(slotX, slotY, slotW, slotH, scaledRadius);
      } else {
        ctx.rect(slotX, slotY, slotW, slotH);
      }
      ctx.clip();

      const img = slotImages[idx];
      if (img) {
        // Draw image cover (contain & center)
        const imgAspect = img.width / img.height;
        const slotAspect = slotW / slotH;
        let dw = slotW, dh = slotH;
        let dx = slotX, dy = slotY;

        if (imgAspect > slotAspect) {
          dw = slotH * imgAspect;
          dx = slotX - (dw - slotW) / 2;
        } else {
          dh = slotW / imgAspect;
          dy = slotY - (dh - slotH) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        // Empty slot placeholder
        ctx.fillStyle = '#f0f2f5';
        ctx.fillRect(slotX, slotY, slotW, slotH);
        ctx.fillStyle = '#9ca3af';
        ctx.font = `${14 * exportScale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`+ Chọn ảnh ô ${idx + 1}`, slotX + slotW / 2, slotY + slotH / 2);
      }
      ctx.restore();
    });
  };

  useEffect(() => {
    if (canvasRef.current) {
      renderCollage(canvasRef.current, 1);
    }
  }, [activeLayout, slotImages, gap, borderRadius, bgColor]);

  const handleExport = () => {
    const exportCanvas = document.createElement('canvas');
    renderCollage(exportCanvas, 2.5); // Export at 2.5x high-res
    const dataUrl = exportCanvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `dbeaty_collage_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#f8fafc' }}>
      {/* Top Navbar */}
      <div style={{ height: '60px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#090d16' }}>
        <button 
          onClick={onBack} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LayoutGrid size={20} color="#d4af37" />
          <span style={{ fontWeight: 600, fontSize: '16px' }}>Ghép Ảnh Nghệ Thuật (Collage Maker)</span>
        </div>
        <button 
          onClick={handleExport} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #d4af37, #b89326)', border: 'none', color: '#000', fontWeight: 600, padding: '8px 18px', borderRadius: '6px', cursor: 'pointer' }}
        >
          <Download size={16} /> Xuất Ghép Ảnh HD
        </button>
      </div>

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Canvas Area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#070a10', overflow: 'auto' }}>
          <canvas 
            ref={canvasRef} 
            style={{ maxWidth: '100%', maxHeight: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', borderRadius: '8px' }} 
          />
        </div>

        {/* Control Sidebar */}
        <div style={{ width: '380px', borderLeft: '1px solid #1e293b', background: '#0d131f', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Layout Presets */}
          <div>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', margin: '0 0 12px 0' }}>Bố Cục Ghép ({COLLAGE_LAYOUTS.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {COLLAGE_LAYOUTS.map(layout => (
                <button
                  key={layout.id}
                  onClick={() => setSelectedLayoutId(layout.id)}
                  style={{
                    padding: '12px 10px',
                    borderRadius: '8px',
                    background: selectedLayoutId === layout.id ? 'rgba(212, 175, 55, 0.15)' : '#1e293b',
                    border: selectedLayoutId === layout.id ? '1px solid #d4af37' : '1px solid #334155',
                    color: selectedLayoutId === layout.id ? '#d4af37' : '#e2e8f0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: selectedLayoutId === layout.id ? 600 : 400
                  }}
                >
                  <div>{layout.nameVi}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Tỷ lệ {layout.aspectRatio}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Adjustments: Gap & Radius & Background */}
          <div>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', margin: '0 0 12px 0' }}>Khoảng Cách & Viền</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span>Khoảng cách ô ({gap}px)</span>
                </div>
                <input 
                  type="range" min="0" max="30" value={gap} 
                  onChange={e => setGap(Number(e.target.value))} 
                  style={{ width: '100%', accentColor: '#d4af37' }} 
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span>Bo góc ({borderRadius}px)</span>
                </div>
                <input 
                  type="range" min="0" max="30" value={borderRadius} 
                  onChange={e => setBorderRadius(Number(e.target.value))} 
                  style={{ width: '100%', accentColor: '#d4af37' }} 
                />
              </div>

              <div>
                <div style={{ fontSize: '12px', marginBottom: '8px' }}>Màu nền</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['#ffffff', '#000000', '#f8f9fa', '#fdf0ed', '#1e293b'].map(c => (
                    <button
                      key={c}
                      onClick={() => setBgColor(c)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: c,
                        border: bgColor === c ? '2px solid #d4af37' : '1px solid #475569',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Slot Image Pickers */}
          <div>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', margin: '0 0 12px 0' }}>Ảnh Từng Ô ({activeLayout.slots.length} ô)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeLayout.slots.map((_, idx) => (
                <div 
                  key={idx} 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', padding: '10px 14px', borderRadius: '8px', border: '1px solid #334155' }}
                >
                  <span style={{ fontSize: '13px' }}>Ô {idx + 1}: {slotImages[idx] ? 'Đã có ảnh' : 'Chưa có ảnh'}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#334155', color: '#e2e8f0', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                      <Upload size={12} /> Tải ảnh
                      <input type="file" accept="image/*" onChange={e => handleSlotImageUpload(idx, e)} style={{ display: 'none' }} />
                    </label>
                    {slotImages[idx] && (
                      <button 
                        onClick={() => handleClearSlot(idx)} 
                        style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
