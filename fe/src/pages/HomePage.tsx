import { useEffect, useMemo, useState } from "react";
import { apiRequest, ApiRequestError } from "../api/client";
import { getCategories } from "../api/catalog";
import { Hero } from "../components/hero/Hero";
import { HomeMarketingSections } from "../components/home/HomeMarketingSections";
import { fallbackCategoryNames } from "../components/home/homeConstants";
import { HOME_FEATURED_PRODUCT_QUERY, toSearchParams } from "../productListing/productQuery";
import type { Category, Product, ProductPageResponse } from "../types";

export function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryItems = await getCategories();
        setCategories(categoryItems);
      } catch {
        setCategories([]);
      }
    };
    void loadCategories();
  }, []);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const params = toSearchParams(HOME_FEATURED_PRODUCT_QUERY);
        if (!params.has("sort")) {
          params.set("sort", "default");
        }
        const data = await apiRequest<ProductPageResponse>(`/api/products?${params.toString()}`);
        setFeaturedProducts(data.items ?? []);
        setLoadError(null);
      } catch (e) {
        setFeaturedProducts([]);
        if (e instanceof ApiRequestError) {
          setLoadError(e.message);
        } else {
          setLoadError("Không thể tải gợi ý sản phẩm.");
        }
      }
    };
    void loadFeatured();
  }, []);

  const topCategories = useMemo(() => {
    if (categories.length) {
      return categories.slice(0, 10).map((c) => ({ id: c.id, name: c.name }));
    }
    return fallbackCategoryNames.map((name, index) => ({
      id: -index - 1,
      name
    }));
  }, [categories]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".c-home");
    if (!root) {
      return;
    }

    const revealItems = Array.from(root.querySelectorAll<HTMLElement>(".js-reveal"));
    if (!revealItems.length) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => {
        item.classList.add("is-visible");
      });
      return;
    }

    revealItems.forEach((item, index) => {
      const staggerDelay = `${(index % 6) * 70}ms`;
      item.style.setProperty("--reveal-delay", staggerDelay);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    revealItems.forEach((item) => {
      observer.observe(item);
    });

    return () => {
      observer.disconnect();
    };
  }, [featuredProducts.length, topCategories.length]);

  const heroTitle = featuredProducts[0]?.name ?? "Linh kiện PC cao cấp";

  return (
    <>
      <Hero title={heroTitle} />
      <section className="panel c-home">
        {loadError ? <p className="form-error" style={{ marginBottom: "1rem" }}>{loadError}</p> : null}
        <HomeMarketingSections products={featuredProducts} topCategories={topCategories} />
      </section>
    </>
  );
}
