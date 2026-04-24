import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { buildPlpCategoryHref } from "../../productListing/productQuery";
import { imageOf } from "../../productListing/productPresentation";
import type { Product } from "../../types";
import { categoryVisuals, heroVisuals, serviceBenefits } from "./homeConstants";
import { CategoryIcon } from "./CategoryIcon";

export type HomeCategoryTile = {
  id: number;
  name: string;
};

type HomeMarketingSectionsProps = {
  products: Product[];
  topCategories: HomeCategoryTile[];
};

const commerceLinkStyle: CSSProperties = { textDecoration: "none", display: "inline-block" };

/** Primary yellow CTA used across home promo blocks (links to catalog). */
function HomeCatalogButton({ children }: { children: React.ReactNode }) {
  return (
    <Link to="/products" className="c-home-btn-yellow" style={commerceLinkStyle}>
      {children}
    </Link>
  );
}

function HomeFeaturedTeaserCard({ product }: { product: Product }) {
  const href = product.slug ? `/products/${product.slug}` : "/products";
  return (
    <article className="c-home-product-card js-reveal">
      <Link to={href} className="c-home-product-media" style={{ display: "block" }}>
        <img src={imageOf(product, heroVisuals[product.id % heroVisuals.length])} alt={product.name} />
      </Link>
      <div className="c-home-product-meta">
        <h3>
          <Link to={href}>{product.name}</Link>
        </h3>
      </div>
    </article>
  );
}

type PromoTileProps = {
  product: Product | undefined;
  bgUrl: string;
  title: string;
  subtitle: string;
  cta: string;
};

function HomePromoTile({ product, bgUrl, title, subtitle, cta }: PromoTileProps) {
  return (
    <article
      className="c-home-promo-card js-reveal"
      style={{
        backgroundImage: `linear-gradient(150deg, rgba(0, 0, 0, 0.64), rgba(0, 0, 0, 0.34)), url(${imageOf(product, bgUrl)})`
      }}
    >
      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
        <HomeCatalogButton>{cta}</HomeCatalogButton>
      </div>
    </article>
  );
}

export function HomeMarketingSections({ products, topCategories }: HomeMarketingSectionsProps) {
  const promoProducts = products.slice(1, 5);
  const guideProducts = products.slice(5, 8);

  return (
    <>
      {/* Legacy `c-home-hero` (image background) was replaced by the full-screen
          video <Hero /> rendered above this section in `HomePage.tsx`. */}

      <section className="c-home-two-up c-home-full-bleed">
        <HomePromoTile
          product={promoProducts[0]}
          bgUrl={heroVisuals[1 % heroVisuals.length]}
          title={promoProducts[0]?.name ?? "Cấu hình khung máy"}
          subtitle="Tùy chỉnh theo nhu cầu"
          cta="Tùy chỉnh ngay"
        />
        <HomePromoTile
          product={promoProducts[1]}
          bgUrl={heroVisuals[2 % heroVisuals.length]}
          title={promoProducts[1]?.name ?? "Dàn máy hiệu năng cao"}
          subtitle="Bứt tốc trải nghiệm"
          cta="Mua ngay"
        />
      </section>

      <section className="c-home-section c-home-shop-by-category js-reveal">
        <h2 className="c-home-shop-by-category-title">SHOP BY CATEGORY</h2>

        <div className="c-home-category-grid">
          {topCategories.map((category) => {
            const isRealCategory = category.id > 0;
            const href = isRealCategory ? buildPlpCategoryHref(String(category.id)) : "/products";

            return (
              <Link
                key={`${category.id}-${category.name}`}
                to={href}
                className="c-home-category-card js-reveal"
                aria-label={category.name}
              >
                <div className="c-home-category-icon" aria-hidden="true">
                  <CategoryIcon name={category.name} />
                </div>

                <div className="c-home-category-card-footer">
                  <span className="c-home-category-label">/{category.name}</span>
                  <span className="c-home-category-plus" aria-hidden="true">
                    +
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="c-home-two-up c-home-two-up--second c-home-full-bleed">
        <HomePromoTile
          product={promoProducts[2]}
          bgUrl={heroVisuals[2 % heroVisuals.length]}
          title={promoProducts[2]?.name ?? "Màn hình cao cấp"}
          subtitle="Nhiều phiên bản màu sắc"
          cta="Khám phá"
        />
        <HomePromoTile
          product={promoProducts[3]}
          bgUrl={heroVisuals[3 % heroVisuals.length]}
          title={promoProducts[3]?.name ?? "Bàn phím không dây"}
          subtitle="Đồng bộ góc máy"
          cta="Khám phá"
        />
      </section>

      <section className="c-home-builder js-reveal">
        <h2 className="c-home-title">Tùy chỉnh bộ setup của bạn</h2>
        <p className="c-home-builder-sub">Bắt đầu từ một sản phẩm</p>

        <div className="c-home-builder-tabs" role="tablist" aria-label="Tùy chọn cấu hình">
          <button type="button">SSD tốc độ cao</button>
          <button type="button">RAM DDR5</button>
          <button type="button" className="active">
            Bàn phím MAKR 75
          </button>
          <button type="button">K65 không dây</button>
        </div>

        <div
          className="c-home-builder-stage"
          style={{
            backgroundImage: `linear-gradient(155deg, rgba(0, 0, 0, 0.66), rgba(0, 0, 0, 0.36)), url(${imageOf(products[2], heroVisuals[2])})`
          }}
        >
          <HomeCatalogButton>Tự thiết kế ngay</HomeCatalogButton>
        </div>
      </section>

      <section className="c-home-benefits js-reveal">
        <h2 className="c-home-title">Vì sao nên mua tại ShopPro</h2>
        <HomeCatalogButton>Tìm hiểu thêm</HomeCatalogButton>

        <div className="c-home-benefit-grid">
          {serviceBenefits.map((item) => (
            <article key={item} className="js-reveal">
              <span className="c-home-benefit-icon">◉</span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="c-home-experience js-reveal" id="experience-zone">
        <h2 className="c-home-title">Trải nghiệm ShopPro</h2>

        <div className="c-home-experience-grid">
          {Array.from({ length: 4 }).map((_, index) => {
            const fallbackTitle = ["Hệ sinh thái iCUE", "Tai nghe Revival", "Ưu đãi nổi bật", "Tự build PC"][index];
            const product = products[index] ?? promoProducts[index % Math.max(promoProducts.length, 1)];

            return (
              <article
                key={`exp-${index}`}
                className="c-home-experience-card js-reveal"
                style={{
                  backgroundImage: `linear-gradient(150deg, rgba(0, 0, 0, 0.68), rgba(0, 0, 0, 0.35)), url(${imageOf(
                    product,
                    heroVisuals[(index + 1) % heroVisuals.length]
                  )})`
                }}
              >
                <h3>{product?.name ?? fallbackTitle}</h3>
                <HomeCatalogButton>Khám phá</HomeCatalogButton>
              </article>
            );
          })}
        </div>
      </section>

      <section className="c-home-guides js-reveal" id="guide-zone">
        <h2 className="c-home-title">Hướng dẫn và mẹo hay</h2>
        <Link to="/blog" className="c-home-guide-link">
          Xem thêm bài viết ›
        </Link>

        <div className="c-home-guide-grid">
          {Array.from({ length: 3 }).map((_, index) => {
            const product = guideProducts[index] ?? products[index];
            const fallbackHeadline = [
              "Build setup tản nhiệt tối ưu cho mùa nóng",
              "So sánh các dòng mainboard cho gaming",
              "Mẹo chọn PSU đúng công suất"
            ][index];

            return (
              <article key={`guide-${index}`} className="c-home-guide-card js-reveal">
                <img src={imageOf(product, categoryVisuals[(index + 2) % categoryVisuals.length])} alt={product?.name ?? fallbackHeadline} />
                <div>
                  <small>BÀI VIẾT</small>
                  <h3>{product?.name ?? fallbackHeadline}</h3>
                  <p>{fallbackHeadline}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="c-home-catalog js-reveal" id="home-featured">
        <div className="c-home-catalog-head">
          <div>
            <p className="c-home-eyebrow">Gợi ý hôm nay</p>
            <h2 className="c-home-title">Sản phẩm nổi bật</h2>
          </div>
          <Link to="/products" className="c-home-cta">
            Xem tất cả sản phẩm
          </Link>
        </div>

        <div className="c-home-product-grid">
          {products.slice(0, 4).map((product) => (
            <HomeFeaturedTeaserCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </>
  );
}
