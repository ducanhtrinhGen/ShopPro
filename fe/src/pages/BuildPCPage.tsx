import { Link } from "react-router-dom";

export function BuildPCPage() {
  return (
    <section className="buildpc-page">
      <div className="buildpc-hero">
        <p className="buildpc-kicker">PC Builder</p>
        <h1>Xây dựng cấu hình</h1>
        <p className="buildpc-subtitle">
          Chọn linh kiện theo nhu cầu (gaming / đồ hoạ / văn phòng) và ShopPro sẽ gợi ý cấu hình phù hợp.
        </p>

        <div className="buildpc-actions">
          <Link to="/products" className="buildpc-primary">
            Bắt đầu chọn linh kiện
          </Link>
          <Link to="/contact" className="buildpc-secondary">
            Nhờ tư vấn build PC
          </Link>
        </div>
      </div>

      <div className="buildpc-grid" aria-label="Tính năng sắp có">
        <div className="buildpc-card">
          <h2>Preset theo nhu cầu</h2>
          <p>Gaming 1080p/1440p, đồ hoạ, livestream, workstation…</p>
        </div>
        <div className="buildpc-card">
          <h2>Kiểm tra tương thích</h2>
          <p>Mainboard/CPU/RAM, PSU theo công suất, kích thước case…</p>
        </div>
        <div className="buildpc-card">
          <h2>Ước tính chi phí</h2>
          <p>Tổng tiền theo cấu hình + gợi ý nâng cấp trong cùng mức ngân sách.</p>
        </div>
      </div>
    </section>
  );
}

