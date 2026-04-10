import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories } from "../api/catalog";
import { apiRequest } from "../api/client";
import { getOwnerOverview } from "../api/ownerReports";
import { useAuth } from "../auth/AuthContext";
import { isOwnerUser } from "../auth/roleUtils";
import type { Category, OwnerOverview, ProductPageResponse } from "../types";

type DashboardStats = {
  productTotal: number;
  categoryTotal: number;
  categories: Category[];
};

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

export function OwnerStaffDashboardPage() {
  const { user } = useAuth();
  const isOwner = isOwnerUser(user);

  const [stats, setStats] = useState<DashboardStats>({
    productTotal: 0,
    categoryTotal: 0,
    categories: []
  });
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);

  const profitRateText = useMemo(() => {
    if (!overview) {
      return "";
    }
    return `${Math.round(overview.estimatedProfitRate * 100)}%`;
  }, [overview]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [categories, productPage] = await Promise.all([
          getCategories(),
          apiRequest<ProductPageResponse>("/api/products?sort=default&page=0")
        ]);

        setStats({
          productTotal: productPage.totalItems,
          categoryTotal: categories.length,
          categories: categories.slice(0, 6)
        });
      } catch {
        setStats({
          productTotal: 0,
          categoryTotal: 0,
          categories: []
        });
      }
    };

    void loadStats();
  }, []);

  useEffect(() => {
    if (!isOwner) {
      setOverview(null);
      setIsLoadingOverview(false);
      return;
    }

    let active = true;
    setIsLoadingOverview(true);

    const loadOverview = async () => {
      try {
        const data = await getOwnerOverview();
        if (!active) {
          return;
        }
        setOverview(data);
      } catch {
        if (!active) {
          return;
        }
        setOverview(null);
      } finally {
        if (active) {
          setIsLoadingOverview(false);
        }
      }
    };

    void loadOverview();

    return () => {
      active = false;
    };
  }, [isOwner]);

  return (
    <section className="role-page">
      <header className="role-hero role-hero-ops">
        <p className="role-kicker">{isOwner ? "KHU DIEU HANH OWNER" : "KHU VAN HANH"}</p>
        <h1>{isOwner ? "Trang owner" : "Trang owner/staff"}</h1>
        <p>
          {isOwner
            ? "Owner la cap cao nhat, co toan quyen quan ly he thong, doanh thu va tai khoan admin/staff."
            : "Tap trung vao van hanh ban hang, cap nhat catalog va dieu phoi xu ly don."}
        </p>
        <div className="role-action-row">
          <Link to="/products" className="role-primary-link">
            Quan ly san pham
          </Link>
          <Link to={isOwner ? "/admin" : "/customer"} className="role-secondary-link">
            {isOwner ? "Quan ly tai khoan" : "Xem trang khach hang"}
          </Link>
        </div>
      </header>

      <section className="role-stat-grid">
        <article>
          <strong>{stats.productTotal}</strong>
          <span>Mat hang dang ban</span>
        </article>
        <article>
          <strong>{stats.categoryTotal}</strong>
          <span>Nhom linh kien</span>
        </article>
        <article>
          <strong>{isOwner ? (overview?.totalOrders ?? 0) : 3}</strong>
          <span>{isOwner ? "Tong don hang" : "Luong uu tien hom nay"}</span>
        </article>
      </section>

      {isOwner ? (
        <section className="role-card-grid">
          <article className="role-card">
            <h2>Doanh thu va loi nhuan</h2>
            {isLoadingOverview ? (
              <p>Dang tai bao cao...</p>
            ) : (
              <>
                <p>Doanh thu: {moneyFormatter.format(overview?.totalRevenue ?? 0)}</p>
                <p>
                  Loi nhuan uoc tinh: {moneyFormatter.format(overview?.estimatedProfit ?? 0)}
                  {profitRateText ? ` (${profitRateText})` : ""}
                </p>
                <p>Gia tri don trung binh: {moneyFormatter.format(overview?.averageOrderValue ?? 0)}</p>
              </>
            )}
          </article>

          <article className="role-card">
            <h2>Thong ke don hang</h2>
            {isLoadingOverview ? (
              <p>Dang tai du lieu don hang...</p>
            ) : (
              <>
                <p>Tong don: {overview?.totalOrders ?? 0}</p>
                <p>Don pending: {overview?.pendingOrders ?? 0}</p>
                <p>Don hoan tat: {overview?.completedOrders ?? 0}</p>
              </>
            )}
          </article>

          <article className="role-card">
            <h2>Quan ly admin/staff</h2>
            {isLoadingOverview ? (
              <p>Dang tai thong ke tai khoan...</p>
            ) : (
              <>
                <p>Admin: {overview?.adminCount ?? 0}</p>
                <p>Staff: {overview?.staffCount ?? 0}</p>
                <p>
                  Dang hoat dong / Dang khoa: {overview?.activeManagementAccounts ?? 0} /{" "}
                  {overview?.lockedManagementAccounts ?? 0}
                </p>
              </>
            )}
            <div className="role-link-group">
              <Link to="/admin">Them/sua/xoa admin-staff</Link>
              <Link to="/products">Cap nhat gia ban va catalog</Link>
            </div>
          </article>
        </section>
      ) : null}

      {isOwner && overview?.recentOrders?.length ? (
        <section className="role-card">
          <h2>Don hang gan day</h2>
          <div className="role-link-group">
            {overview.recentOrders.slice(0, 5).map((order) => (
              <span key={order.id}>
                #{order.id} - {order.customerUsername} - {order.status} - {moneyFormatter.format(order.totalAmount)}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="role-card-grid">
        <article className="role-card">
          <h2>Cong viec ca truc</h2>
          <p>Cap nhat ton kho, lam moi uu dai va kiem tra anh san pham truoc gio cao diem.</p>
        </article>

        <article className="role-card">
          <h2>Danh muc uu tien</h2>
          <div className="role-pill-row">
            {stats.categories.map((category) => (
              <span key={category.id} className="role-pill">
                {category.name}
              </span>
            ))}
          </div>
        </article>

        <article className="role-card">
          <h2>Truy cap nhanh</h2>
          <div className="role-link-group">
            <Link to="/products">Danh muc san pham</Link>
            <Link to="/cart">Gio hang theo phien</Link>
            <Link to="/admin">Tong quan quan tri</Link>
          </div>
        </article>
      </section>
    </section>
  );
}
