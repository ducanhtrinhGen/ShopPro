import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../api/catalog";
import { apiRequest } from "../api/client";
import type { Category, ProductPageResponse } from "../types";

type DashboardStats = {
  productTotal: number;
  categories: Category[];
};

export function CustomerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    productTotal: 0,
    categories: []
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [categories, productPage] = await Promise.all([
          getCategories(),
          apiRequest<ProductPageResponse>("/api/products?sort=default&page=0")
        ]);

        setStats({
          productTotal: productPage.totalItems,
          categories: categories.slice(0, 5)
        });
      } catch {
        setStats({
          productTotal: 0,
          categories: []
        });
      }
    };

    void loadStats();
  }, []);

  return (
    <section className="role-page">
      <header className="role-hero role-hero-customer">
        <p className="role-kicker">KHÔNG GIAN KHÁCH HÀNG</p>
        <h1>Trang khách hàng</h1>
        <p>Bắt đầu từ bảng điều khiển khách hàng, sau đó đi vào khu catalog để tìm linh kiện phù hợp.</p>
        <div className="role-action-row">
          <Link to="/products" className="role-primary-link">
            Mua sản phẩm
          </Link>
          <Link to="/cart" className="role-secondary-link">
            Mở giỏ hàng
          </Link>
          <Link to="/orders" className="role-secondary-link">
            Đơn của tôi
          </Link>
          <Link to="/profile" className="role-secondary-link">
            Thông tin khách hàng
          </Link>
        </div>
      </header>

      <section className="role-stat-grid">
        <article>
          <strong>{stats.productTotal}</strong>
          <span>Lựa chọn sản phẩm</span>
        </article>
        <article>
          <strong>{stats.categories.length}</strong>
          <span>Danh mục gợi ý</span>
        </article>
        <article>
          <strong>2h</strong>
          <span>Giao nhanh nội thành</span>
        </article>
      </section>

      <section className="role-card-grid">
        <article className="role-card">
          <h2>Bắt đầu nhanh</h2>
          <p>Tìm linh kiện theo nhu cầu gaming, code, đồ họa hoặc nâng cấp góc máy làm việc.</p>
        </article>

        <article className="role-card">
          <h2>Danh mục nên xem</h2>
          <div className="role-pill-row">
            {stats.categories.map((category) => (
              <span key={category.id} className="role-pill">
                {category.name}
              </span>
            ))}
          </div>
        </article>

        <article className="role-card">
          <h2>Lựa chọn tiếp theo</h2>
          <div className="role-link-group">
            <Link to="/products">Trang sản phẩm</Link>
            <Link to="/cart">Xem giỏ hàng</Link>
            <Link to="/orders">Đơn hàng của tôi</Link>
            <Link to="/profile">Thông tin khách hàng</Link>
          </div>
        </article>
      </section>
    </section>
  );
}