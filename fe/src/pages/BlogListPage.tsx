import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listBlogPosts } from "../api/blog";
import { ApiRequestError } from "../api/client";
import type { BlogPostSummary } from "../types";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return fallback;
}

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });

export function BlogListPage() {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    const load = async () => {
      try {
        const data = await listBlogPosts();
        if (!active) return;
        setPosts(data);
      } catch (e) {
        if (!active) return;
        setPosts([]);
        setError(toErrorMessage(e, "Không tải được blog."));
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const hasPosts = posts.length > 0;
  const featured = posts[0] ?? null;
  const rest = useMemo(() => posts.slice(1), [posts]);

  return (
    <section className="panel">
      <header className="page-header">
        <h1>Blog ShopPro</h1>
        <p>Hướng dẫn chọn linh kiện, mẹo build PC, và tin khuyến mãi.</p>
        <div className="page-header-actions">
          <Link to="/products">Mở catalog</Link>
          <Link to="/contact">Liên hệ</Link>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? (
        <div className="loading-block">
          <div className="loading-ring" />
          <p>Đang tải bài viết...</p>
        </div>
      ) : null}

      {!isLoading && !error && !hasPosts ? <p className="empty-message">Chưa có bài viết nào.</p> : null}

      {!isLoading && !error && featured ? (
        <article className="c-blog-feature">
          <h2>
            <Link to={`/blog/${featured.slug}`}>{featured.title}</Link>
          </h2>
          <p style={{ opacity: 0.8 }}>{dateFormatter.format(new Date(featured.createdAt))}</p>
          {featured.summary ? <p>{featured.summary}</p> : null}
          <Link to={`/blog/${featured.slug}`}>Đọc tiếp →</Link>
        </article>
      ) : null}

      {!isLoading && !error && rest.length ? (
        <section className="c-blog-grid">
          {rest.map((post) => (
            <article key={post.id} className="c-blog-card">
              <h3>
                <Link to={`/blog/${post.slug}`}>{post.title}</Link>
              </h3>
              <p style={{ opacity: 0.8 }}>{dateFormatter.format(new Date(post.createdAt))}</p>
              {post.summary ? <p>{post.summary}</p> : null}
              <Link to={`/blog/${post.slug}`}>Đọc tiếp →</Link>
            </article>
          ))}
        </section>
      ) : null}
    </section>
  );
}

