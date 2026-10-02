import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, UserRound, Sliders, Palette, LayoutGrid } from 'lucide-react';

interface Props {
  onStart: () => void;
}

export const Landing: React.FC<Props> = ({ onStart }) => {
  return (
    <div className="landing-page">
      <nav className="glass-nav">
        <div className="nav-container">
          <div className="brand">D'Beaty</div>
          <div className="menu">
            <a href="#features" className="util-label">Tính năng</a>
            <a href="#privacy" className="util-label">Bảo mật</a>
          </div>
          <button className="btn-primary" data-testid="btn-open-editor" onClick={onStart}>Mở Editor</button>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1 className="display">
              Đẹp theo cách <br /> <span className="accent-italic">của bạn.</span>
            </h1>
            <p className="hero-body">
              Chỉnh sửa chân dung ngay trên trình duyệt — nhanh, riêng tư và dễ sử dụng.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px', marginBottom: '24px' }}>
              <button className="btn-primary btn-large" data-testid="btn-hero-start" onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Chọn ảnh <ArrowRight size={18} />
              </button>
            </div>

            {/* Secondary feature highlights */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
              <span className="feature-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#334155', border: '1px solid rgba(226,232,240,0.8)' }}>
                <UserRound size={14} color="#d4af37" /> Làm đẹp khuôn mặt
              </span>
              <span className="feature-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#334155', border: '1px solid rgba(226,232,240,0.8)' }}>
                <Sliders size={14} color="#d4af37" /> Chỉnh màu
              </span>
              <span className="feature-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#334155', border: '1px solid rgba(226,232,240,0.8)' }}>
                <Palette size={14} color="#d4af37" /> Bộ lọc
              </span>
              <span className="feature-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(255,255,255,0.7)', borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#334155', border: '1px solid rgba(226,232,240,0.8)' }}>
                <LayoutGrid size={14} color="#d4af37" /> Ghép ảnh
              </span>
            </div>

            {/* Privacy notice banner */}
            <div id="privacy" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '28px', padding: '10px 14px', background: 'rgba(241,245,249,0.75)', borderRadius: '8px', fontSize: '12px', color: '#475569', maxWidth: '480px' }}>
              <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0 }} />
              <span>Ảnh của bạn được xử lý trực tiếp trên trình duyệt đối với các công cụ chỉnh sửa cục bộ.</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="demo-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            </div>
            <div className="floating-badge">
              <span className="badge-text" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} color="#d4af37" /> Xử lý trực tiếp trên trình duyệt
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
