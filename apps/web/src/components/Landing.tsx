import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

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
            <a href="#gallery" className="util-label">Thư viện</a>
            <a href="#pricing" className="util-label">Bảng giá</a>
          </div>
          <button className="btn-primary" onClick={onStart}>Mở Editor</button>
        </div>
      </nav>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1 className="display">
              Vẻ đẹp <br /> <span className="accent-italic">hoàn mỹ</span> <br /> trong tầm tay
            </h1>
            <p className="hero-body">
              Công cụ chỉnh sửa ảnh chân dung chuyên nghiệp, mang đến vẻ đẹp tự nhiên chỉ với vài cú click. Ưu tiên xử lý Local-First an toàn và bảo mật.
            </p>
            <button className="btn-primary btn-large" onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              Bắt đầu trải nghiệm <ArrowRight size={18} />
            </button>
          </div>
          <div className="hero-visual">
            <div className="demo-card" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
            </div>
            <div className="floating-badge">
              <span className="badge-number">01</span>
              <span className="badge-text" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={14}/> Mịn da AI</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
