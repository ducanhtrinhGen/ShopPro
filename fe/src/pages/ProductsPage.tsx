import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest, ApiRequestError } from "../api/client";
import { getBrands, getCategories } from "../api/catalog";
import { useAuth } from "../auth/AuthContext";
import { useLoginModal } from "../auth/LoginModalContext";
import { isCustomerUser } from "../auth/roleUtils";
import { ProductListing } from "../components/storefront/ProductListing";
import { fallbackCategoryNames } from "../components/home/homeConstants";
import { getProductListingDescription, getProductListingTitle } from "../productListing/listingMeta";
import { parseQuery, toSearchParams, type ProductQuery } from "../productListing/productQuery";
import type { Brand, Category, ProductPageResponse } from "../types";

export function ProductsPage() {
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseQuery(searchParams), [searchParams]);

  const [keywordInput, setKeywordInput] = useState(query.keyword);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productPage, setProductPage] = useState<ProductPageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quantityByProduct, setQuantityByProduct] = useState<Record<number, number>>({});

  useEffect(() => {
    setKeywordInput(query.keyword);
  }, [query.keyword]);

  const updateQuery = useCallback(
    (patch: Partial<ProductQuery>) => {
      if ("keyword" in patch && !String(patch.keyword ?? "").trim()) {
        setKeywordInput("");
      }

      const next: ProductQuery = {
        ...query,
        ...patch
      };

      next.keyword = next.keyword.trim();
      next.page = Math.max(next.page, 0);

      const nextParams = toSearchParams(next);
      const current = searchParams.toString();
      const incoming = nextParams.toString();

      if (current !== incoming) {
        setSearchParams(nextParams, { replace: true });
      }
    },
    [query, searchParams, setSearchParams]
  );

  /** Tránh URL dạng `keyword=Mainboard` + cùng danh mục Mainboard (0 kết quả). */
  useEffect(() => {
    if (!categories.length || !query.categoryId || !query.keyword.trim()) {
      return;
    }
    const cat = categories.find((c) => String(c.id) === query.categoryId);
    if (!cat) return;
    if (cat.name.trim().toLowerCase() !== query.keyword.trim().toLowerCase()) {
      return;
    }
    updateQuery({ keyword: "", page: 0 });
  }, [categories, query.categoryId, query.keyword, updateQuery]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const normalizedKeyword = keywordInput.trim();
      if (normalizedKeyword !== query.keyword) {
        updateQuery({ keyword: normalizedKeyword, page: 0 });
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [keywordInput, query.keyword, updateQuery]);

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
    const loadBrands = async () => {
      try {
        const items = await getBrands();
        setBrands(items);
      } catch {
        setBrands([]);
      }
    };

    void loadBrands();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = toSearchParams(query);
        if (!params.has("sort")) {
          params.set("sort", "default");
        }

        const data = await apiRequest<ProductPageResponse>(`/api/products?${params.toString()}`);
        setProductPage(data);
      } catch (requestError) {
        if (requestError instanceof ApiRequestError) {
          setError(requestError.message);
        } else {
          setError("Không thể tải danh sách sản phẩm.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadProducts();
  }, [query]);

  const products = productPage?.items ?? [];

  const topCategories = useMemo(() => {
    if (categories.length) {
      return categories.slice(0, 10).map((c) => ({ id: c.id, name: c.name }));
    }

    return fallbackCategoryNames.map((name, index) => ({
      id: -index - 1,
      name
    }));
  }, [categories]);

  const paginationLabel = useMemo(() => {
    if (!productPage) {
      return "";
    }
    if (productPage.totalPages === 0) {
      return "Không có trang";
    }
    return `Trang ${productPage.page + 1} / ${productPage.totalPages}`;
  }, [productPage]);

  const pageTitle = useMemo(() => getProductListingTitle(query, categories, brands), [query, categories, brands]);

  const pageDescription = useMemo(() => getProductListingDescription(query), [query]);

  const hasFilterContext = useMemo(
    () =>
      Boolean(query.keyword.trim()) ||
      Boolean(query.categoryId) ||
      Boolean(query.brandId) ||
      query.promoOnly ||
      query.clearanceOnly ||
      query.inStockOnly,
    [query]
  );

  const performAddToCart = async (productId: number) => {
    const quantity = Math.max(quantityByProduct[productId] ?? 1, 1);
    setNotice(null);

    try {
      await apiRequest("/api/cart/items", {
        method: "POST",
        body: { productId, quantity }
      });
      setNotice("Đã thêm vào giỏ hàng thành công.");
    } catch (requestError) {
      if (requestError instanceof ApiRequestError) {
        setNotice(requestError.message);
      } else {
        setNotice("Không thể thêm sản phẩm vào giỏ hàng.");
      }
    }
  };

  const handleAddToCart = async (productId: number) => {
    if (!user || !isCustomerUser(user)) {
      openLoginModal({ onSuccess: () => void performAddToCart(productId) });
      return;
    }
    await performAddToCart(productId);
  };

  const handleQuantityChange = (productId: number, value: number) => {
    setQuantityByProduct((prev) => ({
      ...prev,
      [productId]: value
    }));
  };

  /** Strip keyword from PLP URL before opening PDP so "tìm theo tên" không còn khi quay lại danh sách. */
  const openProductDetail = useCallback(
    (slug: string) => {
      const trimmed = slug.trim();
      if (!trimmed) return;
      setKeywordInput("");
      const cleared: ProductQuery = { ...query, keyword: "", page: 0 };
      setSearchParams(toSearchParams(cleared), { replace: true });
      queueMicrotask(() => {
        navigate(`/products/${encodeURIComponent(trimmed)}`);
      });
    },
    [navigate, query, setSearchParams]
  );

  return (
    <div className="panel plp-root">
      <nav className="plp-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span className="plp-breadcrumb-sep" aria-hidden>
          /
        </span>
        <span className={hasFilterContext ? undefined : "plp-breadcrumb-current"}>
          {hasFilterContext ? <Link to="/products">Sản phẩm</Link> : "Sản phẩm"}
        </span>
        {hasFilterContext ? (
          <>
            <span className="plp-breadcrumb-sep" aria-hidden>
              /
            </span>
            <span className="plp-breadcrumb-current">{pageTitle}</span>
          </>
        ) : null}
      </nav>

      <header className="plp-page-head">
        <h1 className="plp-page-title">{pageTitle}</h1>
        {productPage && !isLoading ? (
          <p className="plp-result-count">
            {productPage.totalItems} sản phẩm
            {query.page > 0 ? ` · Trang ${query.page + 1}` : ""}
          </p>
        ) : null}
        {pageDescription && hasFilterContext ? <p className="plp-page-desc">{pageDescription}</p> : null}
      </header>

      <ProductListing
        query={query}
        keywordInput={keywordInput}
        onKeywordInput={setKeywordInput}
        updateQuery={updateQuery}
        onOpenProductDetail={openProductDetail}
        categories={categories}
        brands={brands}
        topCategories={topCategories}
        productPage={productPage}
        products={products}
        isLoading={isLoading}
        error={error}
        notice={notice}
        quantityByProduct={quantityByProduct}
        onQuantityChange={handleQuantityChange}
        onAddToCart={handleAddToCart}
        paginationLabel={paginationLabel}
      />
    </div>
  );
}
